const { rl, isValidSlug, isValidPublicKey, slugify, displayList, selectFromList, question } = require('../src/utils');

jest.mock('readline', () => ({
    createInterface: jest.fn().mockReturnValue({
        question: jest.fn(),
        close: jest.fn(),
    }),
}));

const readline = require('readline');
const rlInterface = readline.createInterface();

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
        it('should display a list of items', () => {
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            displayList(['item1', 'item2', 'item3', 'item4', 'item5']);
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('item1'));
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('item2'));
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('item3'));
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('item4'));
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('item5'));
            logSpy.mockRestore();
        });
    });

    describe('selectFromList', () => {
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
});
