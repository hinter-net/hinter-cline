const fs = require("fs").promises;
const path = require("path");
const {
  getPeerPath,
  getPeerAliases,
  addPeer,
  managePeer,
  getPeerConfig,
  updatePeerConfig,
} = require("../src/peer");
const {
  question,
  isValidSlug,
  isValidPublicKey,
  selectFromList,
} = require("../src/utils");

jest.mock("fs", () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    rename: jest.fn(),
    rm: jest.fn(),
  },
}));

jest.mock("../src/utils", () => ({
  question: jest.fn(),
  isValidSlug: jest.fn(),
  isValidPublicKey: jest.fn(),
  selectFromList: jest.fn(),
}));

describe("peer", () => {
  const DATA_PATH = "/fake/path";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPeerPath", () => {
    it("should return the correct path for a peer", () => {
      const expectedPath = "/fake/path/peers/test-peer";
      expect(getPeerPath(DATA_PATH, "test-peer")).toBe(expectedPath);
    });
  });

  describe("getPeerConfig", () => {
    it("should read and parse the peer config file", async () => {
      const config = { publicKey: "key" };
      const peerAlias = "test-peer";
      const expectedPath = path.join(
        getPeerPath(DATA_PATH, peerAlias),
        "hinter.config.json",
      );
      fs.readFile.mockResolvedValue(JSON.stringify(config));
      const result = await getPeerConfig(DATA_PATH, peerAlias);
      expect(fs.readFile).toHaveBeenCalledWith(expectedPath, "utf8");
      expect(result).toEqual(config);
    });
  });

  describe("updatePeerConfig", () => {
    it("should write the peer config file", async () => {
      const config = { publicKey: "new-key" };
      const peerAlias = "test-peer";
      const expectedPath = path.join(
        getPeerPath(DATA_PATH, peerAlias),
        "hinter.config.json",
      );
      await updatePeerConfig(DATA_PATH, peerAlias, config);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expectedPath,
        JSON.stringify(config, null, 2),
      );
    });
  });

  describe("getPeerAliases", () => {
    it("should return a list of peer aliases", async () => {
      const expectedPath = path.join(DATA_PATH, "peers");
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
        { name: "peer2", isDirectory: () => true },
        { name: "file", isDirectory: () => false },
      ]);
      const aliases = await getPeerAliases(DATA_PATH);
      expect(fs.readdir).toHaveBeenCalledWith(expectedPath, {
        withFileTypes: true,
      });
      expect(aliases).toEqual(["peer1", "peer2"]);
    });
  });

  describe("addPeer", () => {
    it("should add a new peer", async () => {
      const newPeerAlias = "new-peer";
      const publicKey = "a".repeat(64);
      question
        .mockResolvedValueOnce(newPeerAlias)
        .mockResolvedValueOnce(publicKey);
      isValidSlug.mockReturnValue(true);
      isValidPublicKey.mockReturnValue(true);
      fs.readdir.mockResolvedValue([]);
      await addPeer(DATA_PATH);
      const expectedPath = getPeerPath(DATA_PATH, newPeerAlias);
      expect(fs.mkdir).toHaveBeenCalledWith(expectedPath);
      const expectedConfig = { publicKey };
      const expectedConfigPath = path.join(expectedPath, "hinter.config.json");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expectedConfigPath,
        JSON.stringify(expectedConfig, null, 2),
      );
    });

    it("should not add a peer with an invalid alias", async () => {
      question.mockResolvedValueOnce("invalid alias");
      isValidSlug.mockReturnValue(false);
      await addPeer(DATA_PATH);
      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    it("should not add a peer if alias already exists", async () => {
      question.mockResolvedValueOnce("existing-peer");
      isValidSlug.mockReturnValue(true);
      fs.readdir.mockResolvedValue([
        { name: "existing-peer", isDirectory: () => true },
      ]);
      await addPeer(DATA_PATH);
      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    it("should not add a peer with an invalid public key", async () => {
      question
        .mockResolvedValueOnce("new-peer")
        .mockResolvedValueOnce("invalid-key");
      isValidSlug.mockReturnValue(true);
      isValidPublicKey.mockReturnValue(false);
      fs.readdir.mockResolvedValue([]);
      await addPeer(DATA_PATH);
      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    it("should not add a peer if public key already exists", async () => {
      question
        .mockResolvedValueOnce("new-peer")
        .mockResolvedValueOnce("a".repeat(64));
      isValidSlug.mockReturnValue(true);
      isValidPublicKey.mockReturnValue(true);
      fs.readdir.mockResolvedValue([
        { name: "existing-peer", isDirectory: () => true },
      ]);
      fs.readFile.mockResolvedValue(
        JSON.stringify({ publicKey: "a".repeat(64) }),
      );
      await addPeer(DATA_PATH);
      expect(fs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe("managePeer", () => {
    it("should do nothing if no peers exist", async () => {
      fs.readdir.mockResolvedValue([]);
      const logSpy = jest.spyOn(console, "log");
      await managePeer(DATA_PATH);
      expect(logSpy).toHaveBeenCalledWith("No peers to manage.");
      logSpy.mockRestore();
    });

    it("should do nothing if no peer is selected", async () => {
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
      ]);
      selectFromList.mockResolvedValue([]);
      const logSpy = jest.spyOn(console, "log");
      await managePeer(DATA_PATH);
      expect(logSpy).toHaveBeenCalledWith("No peer selected.");
      logSpy.mockRestore();
    });

    it("should handle errors from selectFromList", async () => {
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
      ]);
      const errorMessage = "An error occurred";
      selectFromList.mockRejectedValue(new Error(errorMessage));
      const logSpy = jest.spyOn(console, "log");
      await managePeer(DATA_PATH);
      expect(logSpy).toHaveBeenCalledWith(errorMessage);
      logSpy.mockRestore();
    });

    it("should not rename a peer with an invalid alias", async () => {
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
      ]);
      selectFromList.mockResolvedValue(["peer1"]);
      question
        .mockResolvedValueOnce("1")
        .mockResolvedValueOnce("invalid alias");
      isValidSlug.mockReturnValue(false);
      await managePeer(DATA_PATH);
      expect(fs.rename).not.toHaveBeenCalled();
    });

    it("should not rename a peer if alias already exists", async () => {
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
        { name: "existing-peer", isDirectory: () => true },
      ]);
      selectFromList.mockResolvedValue(["peer1"]);
      question
        .mockResolvedValueOnce("1")
        .mockResolvedValueOnce("existing-peer");
      isValidSlug.mockReturnValue(true);
      await managePeer(DATA_PATH);
      expect(fs.rename).not.toHaveBeenCalled();
    });

    it("should rename a peer", async () => {
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
      ]);
      selectFromList.mockResolvedValue(["peer1"]);
      question.mockResolvedValueOnce("1").mockResolvedValueOnce("new-alias");
      isValidSlug.mockReturnValue(true);
      await managePeer(DATA_PATH);
      expect(fs.rename).toHaveBeenCalledWith(
        getPeerPath(DATA_PATH, "peer1"),
        getPeerPath(DATA_PATH, "new-alias"),
      );
    });

    it("should not update a peer with an invalid public key", async () => {
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
      ]);
      selectFromList.mockResolvedValue(["peer1"]);
      question.mockResolvedValueOnce("2").mockResolvedValueOnce("invalid-key");
      isValidPublicKey.mockReturnValue(false);
      await managePeer(DATA_PATH);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it("should not update a peer if public key already exists", async () => {
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
        { name: "peer2", isDirectory: () => true },
      ]);
      selectFromList.mockResolvedValue(["peer1"]);
      question.mockResolvedValueOnce("2").mockResolvedValueOnce("b".repeat(64));
      isValidPublicKey.mockReturnValue(true);
      fs.readFile.mockResolvedValueOnce(
        JSON.stringify({ publicKey: "b".repeat(64) }),
      ); // peer2 config
      fs.readFile.mockResolvedValueOnce(
        JSON.stringify({ publicKey: "a".repeat(64) }),
      ); // peer1 config
      await managePeer(DATA_PATH);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it("should update a peer public key", async () => {
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
      ]);
      selectFromList.mockResolvedValue(["peer1"]);
      const newPublicKey = "b".repeat(64);
      question.mockResolvedValueOnce("2").mockResolvedValueOnce(newPublicKey);
      isValidPublicKey.mockReturnValue(true);
      fs.readFile.mockResolvedValue(
        JSON.stringify({ publicKey: "a".repeat(64) }),
      );
      await managePeer(DATA_PATH);
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(getPeerPath(DATA_PATH, "peer1"), "hinter.config.json"),
        JSON.stringify({ publicKey: newPublicKey }, null, 2),
      );
    });

    it("should cancel deletion of a peer", async () => {
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
      ]);
      selectFromList.mockResolvedValue(["peer1"]);
      question.mockResolvedValueOnce("3").mockResolvedValueOnce("n");
      await managePeer(DATA_PATH);
      expect(fs.rm).not.toHaveBeenCalled();
    });

    it("should delete a peer", async () => {
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
      ]);
      selectFromList.mockResolvedValue(["peer1"]);
      question.mockResolvedValueOnce("3").mockResolvedValueOnce("y");
      await managePeer(DATA_PATH);
      expect(fs.rm).toHaveBeenCalledWith(getPeerPath(DATA_PATH, "peer1"), {
        recursive: true,
        force: true,
      });
    });

    it("should handle invalid choice in managePeer", async () => {
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
      ]);
      selectFromList.mockResolvedValue(["peer1"]);
      question.mockResolvedValueOnce("5");
      const logSpy = jest.spyOn(console, "log");
      await managePeer(DATA_PATH);
      expect(logSpy).toHaveBeenCalledWith("Invalid choice.");
      logSpy.mockRestore();
    });

    it("should go back when choice is 4", async () => {
      fs.readdir.mockResolvedValue([
        { name: "peer1", isDirectory: () => true },
      ]);
      selectFromList.mockResolvedValue(["peer1"]);
      question.mockResolvedValueOnce("4");
      await managePeer(DATA_PATH);
      expect(question).toHaveBeenCalledTimes(1);
    });
  });
});
