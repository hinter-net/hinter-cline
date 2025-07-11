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
            const title = 'Test Title';
            const slug = 'test-title';
            const to = ['peer1'];
            const except = [];
            question.mockResolvedValue(title);
            slugify.mockReturnValue(slug);
            getPeerAliases.mockResolvedValue(['peer1']);
            getGroups.mockResolvedValue(new Map());
            selectFromList.mockResolvedValueOnce(to).mockResolvedValueOnce(except);
            await createDraft(DATA_PATH);
            const expectedTemplate = `---
to: ${JSON.stringify(to)}
except: ${JSON.stringify(except)}
sourcePath: ""
destinationPath: ""
---

# ${title}

`;
            const expectedPath = path.join(DATA_PATH, 'entries', `${slug}.md`);
            expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, expectedTemplate);
        });

        it('should not create a draft with an empty title', async () => {
            question.mockResolvedValue('');
            await createDraft(DATA_PATH);
            expect(fs.writeFile).not.toHaveBeenCalled();
        });

        it('should handle errors when selecting recipients', async () => {
            question.mockResolvedValue('Test Title');
            const errorMessage = 'An error occurred';
            selectFromList.mockRejectedValue(new Error(errorMessage));

            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            await createDraft(DATA_PATH);

            expect(logSpy).toHaveBeenCalledWith(errorMessage);
            expect(fs.writeFile).not.toHaveBeenCalled();
            logSpy.mockRestore();
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
            const { walk, extractFrontmatterAndContent } = require('../src/utils');
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
            expect(fs.writeFile).toHaveBeenCalledWith('/fake/path/peers/peer1/outgoing/report.md', '# Title');
        });

        it('should sync a report with a source file', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            getGroups.mockResolvedValue(new Map());
            const reportContent = '---\nto: ["peer1"]\nexcept: []\nsourcePath: "source.txt"\n---';
            const entries = ['/fake/path/entries/report.md'];
            const { walk, extractFrontmatterAndContent } = require('../src/utils');
            walk.mockImplementation(async function* () {
                for (const entry of entries) {
                    yield entry;
                }
            });
            fs.readFile.mockResolvedValue(reportContent);
            extractFrontmatterAndContent.mockReturnValue({
                frontmatter: { to: ['peer1'], except: [], sourcePath: 'source.txt' },
                body: '',
                error: null,
            });
            fs.stat.mockResolvedValue({ isDirectory: () => false });
            getPeerPath.mockReturnValue('/fake/path/peers/peer1');
            fs.readdir.mockResolvedValue([]);
            await syncReports(DATA_PATH);
            const expectedSourcePath = path.resolve('/fake/path/entries', 'source.txt');
            const expectedDestPath = '/fake/path/peers/peer1/outgoing/source.txt';
            expect(fs.cp).toHaveBeenCalledWith(expectedSourcePath, expectedDestPath);
        });

        it('should sync a report with a source directory', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            getGroups.mockResolvedValue(new Map());
            const reportContent = '---\nto: ["peer1"]\nexcept: []\nsourcePath: "source_dir"\n---';
            const entries = ['/fake/path/entries/report.md'];
            const { walk, extractFrontmatterAndContent } = require('../src/utils');
            walk.mockImplementation(async function* (p) {
                if (p === '/fake/path/entries') {
                    for (const entry of entries) yield entry;
                } else if (p === path.resolve('/fake/path/entries', 'source_dir')) {
                    yield path.resolve('/fake/path/entries', 'source_dir', 'file.txt');
                }
            });
            fs.readFile.mockResolvedValue(reportContent);
            extractFrontmatterAndContent.mockReturnValue({
                frontmatter: { to: ['peer1'], except: [], sourcePath: 'source_dir' },
                body: '',
                error: null,
            });
            fs.stat.mockResolvedValue({ isDirectory: () => true });
            getPeerPath.mockReturnValue('/fake/path/peers/peer1');
            fs.readdir.mockResolvedValue([]);
            await syncReports(DATA_PATH);
            const expectedSourcePath = path.resolve('/fake/path/entries', 'source_dir', 'file.txt');
            const expectedDestPath = '/fake/path/peers/peer1/outgoing/source_dir/file.txt';
            expect(fs.cp).toHaveBeenCalledWith(expectedSourcePath, expectedDestPath);
        });

        it('should remove obsolete files', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            getGroups.mockResolvedValue(new Map());
            const { walk } = require('../src/utils');
            walk.mockImplementation(async function* (p) {
                if (p.endsWith('entries')) {
                    // No entries, so all existing files in outgoing are obsolete
                } else if (p.includes('outgoing')) {
                    yield '/fake/path/peers/peer1/outgoing/obsolete.md';
                }
            });
            getPeerPath.mockReturnValue('/fake/path/peers/peer1');

            await syncReports(DATA_PATH);

            expect(fs.unlink).toHaveBeenCalledWith('/fake/path/peers/peer1/outgoing/obsolete.md');
            const { removeEmptyDirectories } = require('../src/utils');
            expect(removeEmptyDirectories).toHaveBeenCalledWith('/fake/path/peers/peer1/outgoing');
        });

        it('should throw an error for malformed frontmatter', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            const { walk, extractFrontmatterAndContent } = require('../src/utils');
            walk.mockImplementation(async function* () {
                yield '/fake/path/entries/report.md';
            });
            extractFrontmatterAndContent.mockReturnValue({ error: new Error('YAML error') });

            await expect(syncReports(DATA_PATH)).rejects.toThrow('Error parsing YAML for report draft /fake/path/entries/report.md: YAML error');
        });

        it('should throw an error for missing required fields', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            const { walk, extractFrontmatterAndContent } = require('../src/utils');
            walk.mockImplementation(async function* () {
                yield '/fake/path/entries/report.md';
            });
            extractFrontmatterAndContent.mockReturnValue({ frontmatter: {} });

            await expect(syncReports(DATA_PATH)).rejects.toThrow('Report draft /fake/path/entries/report.md is missing required fields (to, except).');
        });

        it('should throw an error for invalid group name', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            getGroups.mockResolvedValue(new Map());
            const { walk, extractFrontmatterAndContent } = require('../src/utils');
            walk.mockImplementation(async function* () {
                yield '/fake/path/entries/report.md';
            });
            extractFrontmatterAndContent.mockReturnValue({ frontmatter: { to: ['group:invalid-group'], except: [] } });

            await expect(syncReports(DATA_PATH)).rejects.toThrow("Invalid group name 'invalid-group' found in report draft.");
        });

        it('should throw an error for invalid peer alias', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            getGroups.mockResolvedValue(new Map());
            const { walk, extractFrontmatterAndContent } = require('../src/utils');
            walk.mockImplementation(async function* () {
                yield '/fake/path/entries/report.md';
            });
            extractFrontmatterAndContent.mockReturnValue({ frontmatter: { to: ['invalid-peer'], except: [] } });

            await expect(syncReports(DATA_PATH)).rejects.toThrow("Invalid peer alias 'invalid-peer' found in report draft.");
        });

        it('should throw an error for inaccessible source path', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            getGroups.mockResolvedValue(new Map());
            const { walk, extractFrontmatterAndContent } = require('../src/utils');
            walk.mockImplementation(async function* () {
                yield '/fake/path/entries/report.md';
            });
            extractFrontmatterAndContent.mockReturnValue({
                frontmatter: { to: ['peer1'], except: [], sourcePath: 'nonexistent.txt' },
            });
            fs.stat.mockRejectedValue(new Error('ENOENT'));

            await expect(syncReports(DATA_PATH)).rejects.toThrow('Error accessing source path /fake/path/entries/nonexistent.txt for report draft /fake/path/entries/report.md');
        });
    });
});
