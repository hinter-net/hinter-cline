const fs = require("fs").promises;
const path = require("path");
const readline = require("readline");
const {
  rl,
  isValidSlug,
  isValidPublicKey,
  sanitizeFilenameWithoutExtension,
  displayList,
  selectFromList,
  question,
  extractFrontmatterAndContent,
  walk,
  removeEmptyDirectories,
} = require("../src/utils");

const rlInterface = readline.createInterface();

jest.mock("fs", () => ({
  promises: {
    opendir: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    rmdir: jest.fn(),
  },
}));

jest.mock("readline", () => ({
  createInterface: jest.fn().mockReturnValue({
    question: jest.fn(),
    close: jest.fn(),
  }),
}));

describe("utils", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    rl.close();
  });
  describe("question", () => {
    it("should return the answer from readline", async () => {
      rlInterface.question.mockImplementationOnce((query, callback) =>
        callback("my answer"),
      );
      const answer = await question("Your question?");
      expect(answer).toBe("my answer");
    });
  });

  describe("isValidSlug", () => {
    it("should return true for valid slugs", () => {
      expect(isValidSlug("a-valid-slug")).toBe(true);
      expect(isValidSlug("another-one")).toBe(true);
      expect(isValidSlug("slug1")).toBe(true);
    });

    it("should return false for invalid slugs", () => {
      expect(isValidSlug("Invalid Slug")).toBe(false);
      expect(isValidSlug("invalid_slug")).toBe(false);
      expect(isValidSlug("-invalid-slug")).toBe(false);
      expect(isValidSlug("invalid-slug-")).toBe(false);
      expect(isValidSlug("invalid--slug")).toBe(false);
    });
  });

  describe("isValidPublicKey", () => {
    it("should return true for valid public keys", () => {
      expect(isValidPublicKey("a".repeat(64))).toBe(true);
      expect(isValidPublicKey("f".repeat(64))).toBe(true);
      expect(isValidPublicKey("0".repeat(64))).toBe(true);
      expect(isValidPublicKey("9".repeat(64))).toBe(true);
    });

    it("should return false for invalid public keys", () => {
      expect(isValidPublicKey("g".repeat(64))).toBe(false);
      expect(isValidPublicKey("a".repeat(63))).toBe(false);
      expect(isValidPublicKey("a".repeat(65))).toBe(false);
      expect(isValidPublicKey("A".repeat(64))).toBe(false);
    });
  });

  describe("sanitizeFilenameWithoutExtension", () => {
    it("should replace invalid characters with a dash", () => {
      expect(sanitizeFilenameWithoutExtension('a<b>c:d"e/f\\g|h?i*j')).toBe(
        "a-b-c-d-e-f-g-h-i-j",
      );
    });

    it("should replace a leading space with a dash", () => {
      expect(sanitizeFilenameWithoutExtension(" leading-space")).toBe(
        "-leading-space",
      );
    });

    it("should not affect valid filenames", () => {
      expect(sanitizeFilenameWithoutExtension("a-valid-filename")).toBe(
        "a-valid-filename",
      );
      expect(sanitizeFilenameWithoutExtension("another one")).toBe(
        "another one",
      );
    });
  });

  describe("displayList", () => {
    it("should display a list of items and handle newlines", () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const items = ["1", "2", "3", "4", "5"];
      displayList(items);
      const expectedOutput =
        "[1]  1                   [2]  2                   [3]  3                   [4]  4                   \n" +
        "[5]  5                   ";
      expect(logSpy).toHaveBeenCalledWith(expectedOutput);
      logSpy.mockRestore();
    });

    it("should display a list of items with a length that is a multiple of 4", () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const items = ["1", "2", "3", "4"];
      displayList(items);
      const expectedOutput =
        "[1]  1                   [2]  2                   [3]  3                   [4]  4                   \n";
      expect(logSpy).toHaveBeenCalledWith(expectedOutput);
      logSpy.mockRestore();
    });
  });

  describe("selectFromList", () => {
    it("should return an empty array if no items are provided", async () => {
      const result = await selectFromList([], "Select items");
      expect(result).toEqual([]);
    });

    it("should return an empty array if no choices are made with allowMultiple", async () => {
      rlInterface.question.mockImplementationOnce((_, callback) =>
        callback(""),
      );
      const items = ["one", "two", "three"];
      const result = await selectFromList(items, "Select items", {
        allowMultiple: true,
      });
      expect(result).toEqual([]);
    });

    it("should return an empty array if no choices are made without allowMultiple", async () => {
      rlInterface.question.mockImplementationOnce((_, callback) =>
        callback(""),
      );
      const items = ["one", "two", "three"];
      const result = await selectFromList(items, "Select items", {
        allowMultiple: false,
      });
      expect(result).toEqual([]);
    });

    it("should handle empty strings in choices", async () => {
      rlInterface.question.mockImplementationOnce((_, callback) =>
        callback("1, 2,,"),
      );
      const items = ["one", "two", "three"];
      const result = await selectFromList(items, "Select items");
      expect(result).toEqual(["one", "two"]);
    });

    it("should throw an error for non-numeric selection", async () => {
      rlInterface.question.mockImplementationOnce((_, callback) =>
        callback("a"),
      );
      const items = ["one", "two", "three"];
      await expect(selectFromList(items, "Select an item")).rejects.toThrow(
        "Invalid selection: 'a'. Please enter numbers from the list.",
      );
    });

    it("should throw an error for multiple selections when not allowed", async () => {
      rlInterface.question.mockImplementationOnce((_, callback) =>
        callback("1,2"),
      );
      const items = ["one", "two", "three"];
      await expect(
        selectFromList(items, "Select an item", { allowMultiple: false }),
      ).rejects.toThrow("Multiple selections are not allowed for this prompt.");
    });

    it("should return selected items for multiple choices", async () => {
      rlInterface.question.mockImplementationOnce((_, callback) =>
        callback("1,3"),
      );
      const items = ["one", "two", "three"];
      const result = await selectFromList(items, "Select items");
      expect(result).toEqual(["one", "three"]);
    });

    it("should return selected item for a single choice", async () => {
      rlInterface.question.mockImplementationOnce((query, callback) =>
        callback("2"),
      );
      const items = ["one", "two", "three"];
      const result = await selectFromList(items, "Select an item", {
        allowMultiple: false,
      });
      expect(result).toEqual(["two"]);
    });

    it("should throw an error for invalid selection", async () => {
      rlInterface.question.mockImplementationOnce((query, callback) =>
        callback("4"),
      );
      const items = ["one", "two", "three"];
      await expect(selectFromList(items, "Select an item")).rejects.toThrow(
        "Invalid selection: '4'. Please enter numbers from the list.",
      );
    });
  });

  describe("extractFrontmatterAndContent", () => {
    it("should extract frontmatter and content from text", () => {
      const text = '---\nto: ["peer1"]\nexcept: []\n---\n\n# Title';
      const { frontmatter, body } = extractFrontmatterAndContent(text);
      expect(frontmatter).toEqual({ to: ["peer1"], except: [] });
      expect(body).toBe("# Title");
    });

    it("should return null frontmatter if not present", () => {
      const text = "# Title";
      const { frontmatter, body } = extractFrontmatterAndContent(text);
      expect(frontmatter).toBeNull();
      expect(body).toBe("# Title");
    });

    it("should return an error for invalid YAML", () => {
      const text = "---\ninvalid-yaml\n---\n\n# Title";
      const result = extractFrontmatterAndContent(text);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe("walk", () => {
    it("should recursively walk a directory", async () => {
      const structure = [
        { name: "file1.txt", isDirectory: () => false, isFile: () => true },
        { name: "dir1", isDirectory: () => true, isFile: () => false },
      ];
      const structure2 = [
        { name: "file2.txt", isDirectory: () => false, isFile: () => true },
      ];
      fs.opendir.mockImplementation(async function* (p) {
        if (p === "test_dir") {
          for (const f of structure) yield f;
        } else if (p === "test_dir/dir1") {
          for (const f of structure2) yield f;
        }
      });

      const files = [];
      for await (const file of walk("test_dir")) {
        files.push(file);
      }
      expect(files).toEqual(["test_dir/file1.txt", "test_dir/dir1/file2.txt"]);
    });
  });

  describe("removeEmptyDirectories", () => {
    it("should remove empty directories recursively", async () => {
      const dirStructure = {
        test_dir: ["dir1", "dir2", "file2.txt"],
        "test_dir/dir1": ["file1.txt"],
        "test_dir/dir2": ["dir3"],
        "test_dir/dir2/dir3": [],
      };

      fs.readdir.mockImplementation(async (p) => dirStructure[p] || []);
      fs.stat.mockImplementation(async (p) => ({
        isDirectory: () => !p.includes("file"),
      }));
      fs.rmdir.mockImplementation(async (p) => {
        const parent = path.dirname(p);
        const child = path.basename(p);
        dirStructure[parent] = dirStructure[parent].filter((f) => f !== child);
      });

      await removeEmptyDirectories("test_dir");

      expect(fs.rmdir).toHaveBeenCalledTimes(2);
      expect(fs.rmdir).toHaveBeenCalledWith("test_dir/dir2/dir3");
      expect(fs.rmdir).toHaveBeenCalledWith("test_dir/dir2");
      expect(fs.rmdir).not.toHaveBeenCalledWith("test_dir/dir1");
    });
  });
});
