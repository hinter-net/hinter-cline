const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { createDraft, syncReports } = require('../src/report');
const { question, slugify, selectFromList } = require('../src/utils');
const { getPeerAliases, getPeerPath } = require('../src/peer');
const { getGroups } = require('../src/group');

jest.mock('fs', () => ({
    promises: {
        opendir: jest.fn(),
        readdir: jest.fn(),
        readFile: jest.fn(),
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        stat: jest.fn(),
        rmdir: jest.fn(),
        unlink: jest.fn(),
        cp: jest.fn(),
    },
}));

jest.mock('js-yaml', () => ({
    load: jest.fn(),
}));

jest.mock('../src/utils', () => ({
    question: jest.fn(),
    slugify: jest.fn(),
    selectFromList: jest.fn(),
    extractFrontmatterAndContent: jest.fn(),
    walk: jest.fn(),
    removeEmptyDirectories: jest.fn(),
}));

jest.mock('../src/peer', () => ({
    getPeerAliases: jest.fn(),
    getPeerPath: jest.fn(),
}));

jest.mock('../src/group', () => ({
    getGroups: jest.fn(),
}));

describe('report', () => {
    const DATA_PATH = '/fake/path';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createDraft', () => {
        it('should create a new draft', async () => {
            question.mockResolvedValue('Test Title');
            slugify.mockReturnValue('test-title');
            getPeerAliases.mockResolvedValue(['peer1']);
            getGroups.mockResolvedValue(new Map());
            selectFromList.mockResolvedValueOnce(['peer1']).mockResolvedValueOnce([]);
            await createDraft(DATA_PATH);
            expect(fs.writeFile).toHaveBeenCalled();
        });

        it('should not create a draft with an empty title', async () => {
            question.mockResolvedValue('');
            await createDraft(DATA_PATH);
            expect(fs.writeFile).not.toHaveBeenCalled();
        });
    });

    describe('syncReports', () => {
        it('should do nothing if no peers are configured', async () => {
            getPeerAliases.mockResolvedValue([]);
            const logSpy = jest.spyOn(console, 'log');
            await syncReports(DATA_PATH);
            expect(logSpy).toHaveBeenCalledWith('No peers configured.');
            logSpy.mockRestore();
        });

        it('should sync a report with content', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            getGroups.mockResolvedValue(new Map());
            const reportContent = '---\nto: ["peer1"]\nexcept: []\n---\n\n# Title';
            const entries = ['/fake/path/entries/report.md'];
            const { walk, extractFrontmatterAndContent, removeEmptyDirectories } = require('../src/utils');
            walk.mockImplementation(async function* () {
                for (const entry of entries) {
                    yield entry;
                }
            });
            fs.readFile.mockResolvedValue(reportContent);
            extractFrontmatterAndContent.mockReturnValue({
                frontmatter: { to: ['peer1'], except: [] },
                body: '# Title',
                error: null,
            });
            getPeerPath.mockReturnValue('/fake/path/peers/peer1');
            fs.readdir.mockResolvedValue([]);
            await syncReports(DATA_PATH);
            expect(fs.writeFile).toHaveBeenCalled();
        });
    });
});
