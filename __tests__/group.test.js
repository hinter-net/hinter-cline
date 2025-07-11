const group = require('../src/group');
const { getPeerAliases, getPeerConfig, updatePeerConfig } = require('../src/peer');
const { question, isValidSlug, selectFromList } = require('../src/utils');

jest.mock('../src/peer', () => ({
    getPeerAliases: jest.fn(),
    getPeerConfig: jest.fn(),
    updatePeerConfig: jest.fn(),
}));

jest.mock('../src/utils', () => ({
    question: jest.fn(),
    isValidSlug: jest.fn(),
    selectFromList: jest.fn(),
}));

describe('group', () => {
    const DATA_PATH = '/fake/path';

    beforeEach(() => {
        // Reset mocks before each test to ensure isolation
        jest.clearAllMocks();
    });

    describe('getGroups', () => {
        it('should return a map of groups and their members', async () => {
            getPeerAliases.mockResolvedValue(['peer1', 'peer2', 'peer3']);
            getPeerConfig.mockImplementation((dataPath, alias) => {
                const configs = {
                    peer1: { 'hinter-cline': { groups: ['group1'] } },
                    peer2: { 'hinter-cline': { groups: ['group1', 'group2'] } },
                    peer3: { 'hinter-cline': { groups: ['group2'] } },
                };
                return Promise.resolve(configs[alias] || {});
            });
            const groups = await group.getGroups(DATA_PATH);
            expect(groups.get('group1')).toEqual(['peer1', 'peer2']);
            expect(groups.get('group2')).toEqual(['peer2', 'peer3']);
        });

        it('should return an empty map if no peers exist', async () => {
            getPeerAliases.mockResolvedValue([]);
            const groups = await group.getGroups(DATA_PATH);
            expect(groups.size).toBe(0);
        });
    });

    describe('addGroup', () => {
        it('should add a new group', async () => {
            question.mockResolvedValue('new-group');
            isValidSlug.mockReturnValue(true);
            getPeerAliases.mockResolvedValue(['peer1']);
            getPeerConfig.mockResolvedValue({});
            selectFromList.mockResolvedValue(['peer1']);

            await group.addGroup(DATA_PATH);

            expect(updatePeerConfig).toHaveBeenCalledWith(DATA_PATH, 'peer1', {
                'hinter-cline': { groups: ['new-group'] },
            });
        });

        it('should not add a group with an invalid alias', async () => {
            question.mockResolvedValue('invalid group');
            isValidSlug.mockReturnValue(false);
            await group.addGroup(DATA_PATH);
            expect(updatePeerConfig).not.toHaveBeenCalled();
        });

        it('should not add a group if alias already exists', async () => {
            question.mockResolvedValue('existing-group');
            isValidSlug.mockReturnValue(true);
            getPeerAliases.mockResolvedValue(['peer1']);
            getPeerConfig.mockResolvedValue({ 'hinter-cline': { groups: ['existing-group'] } });

            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            await group.addGroup(DATA_PATH);

            expect(logSpy).toHaveBeenCalledWith('A group with this alias already exists.');
            expect(updatePeerConfig).not.toHaveBeenCalled();
            logSpy.mockRestore();
        });

        it('should not add a group if no peers exist', async () => {
            question.mockResolvedValue('new-group');
            isValidSlug.mockReturnValue(true);
            getPeerAliases.mockResolvedValue([]);

            await group.addGroup(DATA_PATH);
            expect(updatePeerConfig).not.toHaveBeenCalled();
        });

        it('should not add a group if no peers are selected', async () => {
            question.mockResolvedValue('new-group');
            isValidSlug.mockReturnValue(true);
            getPeerAliases.mockResolvedValue(['peer1']);
            getPeerConfig.mockResolvedValue({});
            selectFromList.mockResolvedValue([]);

            await group.addGroup(DATA_PATH);
            expect(updatePeerConfig).not.toHaveBeenCalled();
        });

        it('should handle errors when selecting peers', async () => {
            question.mockResolvedValue('new-group');
            isValidSlug.mockReturnValue(true);
            getPeerAliases.mockResolvedValue(['peer1']);
            const errorMessage = 'An error occurred';
            selectFromList.mockRejectedValue(new Error(errorMessage));

            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            await group.addGroup(DATA_PATH);

            expect(logSpy).toHaveBeenCalledWith(errorMessage);
            expect(updatePeerConfig).not.toHaveBeenCalled();
            logSpy.mockRestore();
        });
    });

    describe('manageGroup', () => {
        it('should do nothing if no groups exist', async () => {
            getPeerAliases.mockResolvedValue([]);
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            await group.manageGroup(DATA_PATH);
            expect(logSpy).toHaveBeenCalledWith('No groups to manage.');
            logSpy.mockRestore();
        });

        it('should do nothing if no group is selected', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            getPeerConfig.mockResolvedValue({ 'hinter-cline': { groups: ['group1'] } });
            selectFromList.mockResolvedValue([]);

            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            await group.manageGroup(DATA_PATH);
            expect(logSpy).toHaveBeenCalledWith('No group selected.');
            logSpy.mockRestore();
        });

        it('should remove a peer from a group', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            getPeerConfig.mockResolvedValue({ 'hinter-cline': { groups: ['group1'] } });
            selectFromList
                .mockResolvedValueOnce(['group1'])
                .mockResolvedValueOnce(['peer1']);

            await group.manageGroup(DATA_PATH);

            expect(updatePeerConfig).toHaveBeenCalledWith(DATA_PATH, 'peer1', {
                'hinter-cline': { groups: [] },
            });
        });

        it('should add a peer to a group', async () => {
            getPeerAliases.mockResolvedValue(['peer1', 'peer2']);
            getPeerConfig.mockImplementation(async (dataPath, alias) => {
                if (alias === 'peer1') return { 'hinter-cline': { groups: ['group1'] } };
                if (alias === 'peer2') return { 'hinter-cline': { groups: [] } };
                return {};
            });
            selectFromList
                .mockResolvedValueOnce(['group1'])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce(['peer2']);

            await group.manageGroup(DATA_PATH);

            expect(updatePeerConfig).toHaveBeenCalledWith(DATA_PATH, 'peer2', {
                'hinter-cline': { groups: ['group1'] },
            });
        });

        it('should handle errors when selecting a group to manage', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            getPeerConfig.mockResolvedValue({ 'hinter-cline': { groups: ['group1'] } });
            const errorMessage = 'An error occurred';
            selectFromList.mockRejectedValue(new Error(errorMessage));

            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            await group.manageGroup(DATA_PATH);

            expect(logSpy).toHaveBeenCalledWith(errorMessage);
            expect(updatePeerConfig).not.toHaveBeenCalled();
            logSpy.mockRestore();
        });

        it('should handle errors when selecting peers to remove', async () => {
            getPeerAliases.mockResolvedValue(['peer1']);
            getPeerConfig.mockResolvedValue({ 'hinter-cline': { groups: ['group1'] } });
            const errorMessage = 'An error occurred';
            selectFromList
                .mockResolvedValueOnce(['group1'])
                .mockRejectedValue(new Error(errorMessage));

            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            await group.manageGroup(DATA_PATH);

            expect(logSpy).toHaveBeenCalledWith(errorMessage);
            expect(updatePeerConfig).not.toHaveBeenCalled();
            logSpy.mockRestore();
        });

        it('should handle errors when selecting peers to add', async () => {
            getPeerAliases.mockResolvedValue(['peer1', 'peer2']);
            getPeerConfig.mockImplementation(async (dataPath, alias) => {
                if (alias === 'peer1') return { 'hinter-cline': { groups: ['group1'] } };
                return {};
            });
            const errorMessage = 'An error occurred';
            selectFromList
                .mockResolvedValueOnce(['group1'])
                .mockResolvedValueOnce([])
                .mockRejectedValue(new Error(errorMessage));

            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            await group.manageGroup(DATA_PATH);

            expect(logSpy).toHaveBeenCalledWith(errorMessage);
            expect(updatePeerConfig).not.toHaveBeenCalled();
            logSpy.mockRestore();
        });
    });
});
