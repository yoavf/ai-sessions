import { describe, expect, it } from "vitest";
import { makeRelativePath } from "../path-utils";

describe("makeRelativePath", () => {
  describe("Unix paths", () => {
    it("should convert absolute Unix path to relative", () => {
      const result = makeRelativePath(
        "/Users/dev/project/src/index.ts",
        "/Users/dev/project",
      );
      expect(result).toBe("src/index.ts");
    });

    it("should keep absolute Unix path when outside cwd", () => {
      const result = makeRelativePath("/etc/hosts", "/Users/dev/project");
      expect(result).toBe("/etc/hosts");
    });

    it("should handle nested Unix paths", () => {
      const result = makeRelativePath(
        "/Users/dev/project/src/components/Button.tsx",
        "/Users/dev/project",
      );
      expect(result).toBe("src/components/Button.tsx");
    });

    it("should handle cwd with trailing slash", () => {
      const result = makeRelativePath(
        "/Users/dev/project/file.ts",
        "/Users/dev/project/",
      );
      expect(result).toBe("file.ts");
    });
  });

  describe("Windows paths", () => {
    it("should convert absolute Windows path with backslashes to relative", () => {
      const result = makeRelativePath(
        "C:\\Users\\dev\\project\\src\\index.ts",
        "C:\\Users\\dev\\project",
      );
      expect(result).toBe("src/index.ts");
    });

    it("should convert absolute Windows path with forward slashes to relative", () => {
      const result = makeRelativePath(
        "C:/Users/dev/project/src/index.ts",
        "C:/Users/dev/project",
      );
      expect(result).toBe("src/index.ts");
    });

    it("should keep absolute Windows path when on different drive", () => {
      const result = makeRelativePath(
        "D:\\other\\file.ts",
        "C:\\Users\\dev\\project",
      );
      expect(result).toBe("D:\\other\\file.ts");
    });

    it("should handle mixed separators (backslash path, forward slash cwd)", () => {
      const result = makeRelativePath(
        "C:\\Users\\dev\\project\\src\\index.ts",
        "C:/Users/dev/project",
      );
      expect(result).toBe("src/index.ts");
    });

    it("should handle mixed separators (forward slash path, backslash cwd)", () => {
      const result = makeRelativePath(
        "C:/Users/dev/project/src/index.ts",
        "C:\\Users\\dev\\project",
      );
      expect(result).toBe("src/index.ts");
    });

    it("should handle Windows cwd with trailing backslash", () => {
      const result = makeRelativePath("C:\\project\\file.ts", "C:\\project\\");
      expect(result).toBe("file.ts");
    });

    it("should handle Windows cwd with trailing forward slash", () => {
      const result = makeRelativePath("C:/project/file.ts", "C:/project/");
      expect(result).toBe("file.ts");
    });
  });

  describe("Relative paths", () => {
    it("should keep Unix-style relative paths unchanged", () => {
      const result = makeRelativePath("src/index.ts", "/Users/dev/project");
      expect(result).toBe("src/index.ts");
    });

    it("should keep Windows-style relative paths unchanged (dot notation)", () => {
      const result = makeRelativePath(".\\src\\index.ts", "C:\\project");
      expect(result).toBe(".\\src\\index.ts");
    });

    it("should keep Windows-style relative paths unchanged (no dot)", () => {
      const result = makeRelativePath("src\\index.ts", "C:\\project");
      expect(result).toBe("src\\index.ts");
    });
  });

  describe("Edge cases", () => {
    it("should return path unchanged when cwd is undefined", () => {
      const result = makeRelativePath("/Users/dev/project/src/index.ts");
      expect(result).toBe("/Users/dev/project/src/index.ts");
    });

    it("should return path unchanged when cwd is empty string", () => {
      const result = makeRelativePath("/Users/dev/project/src/index.ts", "");
      expect(result).toBe("/Users/dev/project/src/index.ts");
    });

    it("should handle exact match (path equals cwd)", () => {
      const result = makeRelativePath(
        "/Users/dev/project",
        "/Users/dev/project",
      );
      expect(result).toBe("/Users/dev/project");
    });

    it("should not match partial directory names", () => {
      // /Users/dev/project-backup should not match /Users/dev/project
      const result = makeRelativePath(
        "/Users/dev/project-backup/file.ts",
        "/Users/dev/project",
      );
      expect(result).toBe("/Users/dev/project-backup/file.ts");
    });
  });
});
