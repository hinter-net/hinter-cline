const { rl, isValidSlug, isValidPublicKey, slugify, displayList, selectFromList, question, extractFrontmatterAndContent } = require('../src/utils');
const yaml = require('js-yaml');

jest.mock('readline', () => ({
    createInterface: jest.fn().mockReturnValue({
        question: jest.fn(),
        close: jest.fn(),
    }),
}));

const readline = require('readline');
const rlInterface = readline.createInterface();

jest.mock('js-yaml', () => ({
    load: jest.fn(),
}));

describe('utils', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        rl.close();
    });
    describe('question', () => {
        it('should return the answer from readline', async () => {
            rlInterface.question.mockImplementationOnce((query, callback) => callback('my answer'));
            const answer = await question('Your question?');
            expect(answer).toBe('my answer');
        });
    });

    describe('isValidSlug', () => {
        it('should return true for valid slugs', () => {
            expect(isValidSlug('a-valid-slug')).toBe(true);
            expect(isValidSlug('another-one')).toBe(true);
            expect(isValidSlug('slug1')).toBe(true);
        });

        it('should return false for invalid slugs', () => {
            expect(isValidSlug('Invalid Slug')).toBe(false);
            expect(isValidSlug('invalid_slug')).toBe(false);
            expect(isValidSlug('-invalid-slug')).toBe(false);
            expect(isValidSlug('invalid-slug-')).toBe(false);
            expect(isValidSlug('invalid--slug')).toBe(false);
        });
    });

    describe('isValidPublicKey', () => {
        it('should return true for valid public keys', () => {
            expect(isValidPublicKey('a'.repeat(64))).toBe(true);
            expect(isValidPublicKey('f'.repeat(64))).toBe(true);
            expect(isValidPublicKey('0'.repeat(64))).toBe(true);
            expect(isValidPublicKey('9'.repeat(64))).toBe(true);
        });

        it('should return false for invalid public keys', () => {
            expect(isValidPublicKey('g'.repeat(64))).toBe(false);
            expect(isValidPublicKey('a'.repeat(63))).toBe(false);
            expect(isValidPublicKey('a'.repeat(65))).toBe(false);
            expect(isValidPublicKey('A'.repeat(64))).toBe(false);
        });
    });

    describe('slugify', () => {
        it('should correctly slugify a string', () => {
            expect(slugify('A Test String')).toBe('a-test-string');
            expect(slugify('  Another--Test  ')).toBe('another-test');
            expect(slugify('A_Third_Test')).toBe('a-third-test');
            expect(slugify('A fourth test!')).toBe('a-fourth-test');
        });
    });

    describe('displayList', () => {
        it('should display a list of items and handle newlines', () => {
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            const items = ['1', '2', '3', '4', '5'];
            displayList(items);
            const expectedOutput =
                '[1]  1                   [2]  2                   [3]  3                   [4]  4                   \n' +
                '[5]  5                   ';
            expect(logSpy).toHaveBeenCalledWith(expectedOutput);
            logSpy.mockRestore();
        });
    });

    describe('selectFromList', () => {
        it('should return an empty array if no items are provided', async () => {
            const result = await selectFromList([], 'Select items');
            expect(result).toEqual([]);
        });

        it('should return an empty array if no choices are made with allowMultiple', async () => {
            rlInterface.question.mockImplementationOnce((query, callback) => callback(''));
            const items = ['one', 'two', 'three'];
            const result = await selectFromList(items, 'Select items', { allowMultiple: true });
            expect(result).toEqual([]);
        });

        it('should return an empty array if no choices are made without allowMultiple', async () => {
            rlInterface.question.mockImplementationOnce((query, callback) => callback(''));
            const items = ['one', 'two', 'three'];
            const result = await selectFromList(items, 'Select items', { allowMultiple: false });
            expect(result).toEqual([]);
        });

        it('should handle empty strings in choices', async () => {
            rlInterface.question.mockImplementationOnce((query, callback) => callback('1, 2'));
            const items = ['one', 'two', 'three'];
            const result = await selectFromList(items, 'Select items');
            expect(result).toEqual(['one', 'two']);
        });

        it('should throw an error for non-numeric selection', async () => {
            rlInterface.question.mockImplementationOnce((query, callback) => callback('a'));
            const items = ['one', 'two', 'three'];
            await expect(selectFromList(items, 'Select an item')).rejects.toThrow("Invalid selection: 'a'. Please enter numbers from the list.");
        });

        it('should throw an error for multiple selections when not allowed', async () => {
            rlInterface.question.mockImplementationOnce((query, callback) => callback('1,2'));
            const items = ['one', 'two', 'three'];
            await expect(selectFromList(items, 'Select an item', { allowMultiple: false })).rejects.toThrow('Multiple selections are not allowed for this prompt.');
        });

        it('should return selected items for multiple choices', async () => {
            rlInterface.question.mockImplementationOnce((query, callback) => callback('1,3'));
            const items = ['one', 'two', 'three'];
            const result = await selectFromList(items, 'Select items');
            expect(result).toEqual(['one', 'three']);
        });

        it('should return selected item for a single choice', async () => {
            rlInterface.question.mockImplementationOnce((query, callback) => callback('2'));
            const items = ['one', 'two', 'three'];
            const result = await selectFromList(items, 'Select an item', { allowMultiple: false });
            expect(result).toEqual(['two']);
        });

        it('should throw an error for invalid selection', async () => {
            rlInterface.question.mockImplementationOnce((query, callback) => callback('4'));
            const items = ['one', 'two', 'three'];
            await expect(selectFromList(items, 'Select an item')).rejects.toThrow("Invalid selection: '4'. Please enter numbers from the list.");
        });
    });

    describe('extractFrontmatterAndContent', () => {
        it('should extract frontmatter and content from text', () => {
            const text = '---\nto: ["peer1"]\nexcept: []\n---\n\n# Title';
            yaml.load.mockReturnValue({ to: ['peer1'], except: [] });
            const { frontmatter, body } = extractFrontmatterAndContent(text);
            expect(frontmatter).toEqual({ to: ['peer1'], except: [] });
            expect(body).toBe('# Title');
        });

        it('should return null frontmatter if not present', () => {
            const text = '# Title';
            const { frontmatter, body } = extractFrontmatterAndContent(text);
            expect(frontmatter).toBeNull();
            expect(body).toBe('# Title');
        });

        it('should return an error for invalid YAML', () => {
            const text = '---\ninvalid-yaml\n---\n\n# Title';
            const error = new Error('YAML parsing error');
            yaml.load.mockImplementation(() => {
                throw error;
            });
            const result = extractFrontmatterAndContent(text);
            expect(result.error).toBe(error);
        });
    });
});
