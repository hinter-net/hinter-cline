const { question } = require('../src/utils');
const { addPeer, managePeer } = require('../src/peer');
const { addGroup, manageGroup } = require('../src/group');
const { createDraft, syncReports } = require('../src/report');
const cli = require('../src/index');

jest.mock('../src/utils', () => ({
    question: jest.fn(),
    rl: {
        close: jest.fn(),
    },
}));

jest.mock('../src/peer', () => ({
    addPeer: jest.fn(),
    managePeer: jest.fn(),
}));

jest.mock('../src/group', () => ({
    addGroup: jest.fn(),
    manageGroup: jest.fn(),
}));

jest.mock('../src/report', () => ({
    createDraft: jest.fn(),
    syncReports: jest.fn(),
}));

describe('cli', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call createDraft when choice is 1', async () => {
        question.mockResolvedValueOnce('1').mockResolvedValueOnce('').mockResolvedValueOnce('7');
        await cli();
        expect(createDraft).toHaveBeenCalled();
    });

    it('should call syncReports when choice is 2', async () => {
        question.mockResolvedValueOnce('2').mockResolvedValueOnce('').mockResolvedValueOnce('7');
        await cli();
        expect(syncReports).toHaveBeenCalled();
    });

    it('should call addPeer when choice is 3', async () => {
        question.mockResolvedValueOnce('3').mockResolvedValueOnce('').mockResolvedValueOnce('7');
        await cli();
        expect(addPeer).toHaveBeenCalled();
    });

    it('should call managePeer when choice is 4', async () => {
        question.mockResolvedValueOnce('4').mockResolvedValueOnce('').mockResolvedValueOnce('7');
        await cli();
        expect(managePeer).toHaveBeenCalled();
    });

    it('should call addGroup when choice is 5', async () => {
        question.mockResolvedValueOnce('5').mockResolvedValueOnce('').mockResolvedValueOnce('7');
        await cli();
        expect(addGroup).toHaveBeenCalled();
    });

    it('should call manageGroup when choice is 6', async () => {
        question.mockResolvedValueOnce('6').mockResolvedValueOnce('').mockResolvedValueOnce('7');
        await cli();
        expect(manageGroup).toHaveBeenCalled();
    });

    it('should exit when choice is 7', async () => {
        const { rl } = require('../src/utils');
        question.mockResolvedValueOnce('7');
        await cli();
        expect(question).toHaveBeenCalledWith('Choose an option: ');
        expect(question).toHaveBeenCalledTimes(1);
        expect(rl.close).toHaveBeenCalled();
    });

    it('should handle invalid option', async () => {
        const logSpy = jest.spyOn(console, 'log');
        question.mockResolvedValueOnce('invalid').mockResolvedValueOnce('').mockResolvedValueOnce('7');
        await cli();
        expect(logSpy).toHaveBeenCalledWith('Invalid option.');
        logSpy.mockRestore();
    });
});
