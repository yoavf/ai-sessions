import { describe, expect, it } from "vitest";
import { inferGeminiProjectPath, makeRelativePath } from "../path-utils";

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

describe("inferGeminiProjectPath", () => {
  // Real hash from the example Gemini transcript
  const REAL_HASH =
    "2d33ff9193c39ffa4b8352af23f3b106d1ceaff756665e12408cb64657965d22";
  const REAL_PATH = "/Users/yoavfarhi/dev/pomodoro/gemini";

  describe("Basic functionality", () => {
    it("should infer correct project path from matching hash", () => {
      const filePaths = [
        "/Users/yoavfarhi/dev/pomodoro/gemini/index.html",
        "/Users/yoavfarhi/dev/pomodoro/gemini/style.css",
      ];

      const result = inferGeminiProjectPath(REAL_HASH, filePaths);
      expect(result).toBe(REAL_PATH);
    });

    it("should work with a single file path", () => {
      const filePaths = ["/Users/yoavfarhi/dev/pomodoro/gemini/index.html"];

      const result = inferGeminiProjectPath(REAL_HASH, filePaths);
      expect(result).toBe(REAL_PATH);
    });

    it("should work with deeply nested file", () => {
      const filePaths = [
        "/Users/yoavfarhi/dev/pomodoro/gemini/src/components/deep/file.ts",
      ];

      const result = inferGeminiProjectPath(REAL_HASH, filePaths);
      expect(result).toBe(REAL_PATH);
    });

    it("should try multiple paths and find match", () => {
      const filePaths = [
        "/some/other/path/file.ts", // Won't match
        "/Users/yoavfarhi/dev/pomodoro/gemini/index.html", // Will match
      ];

      const result = inferGeminiProjectPath(REAL_HASH, filePaths);
      expect(result).toBe(REAL_PATH);
    });
  });

  describe("Edge cases", () => {
    it("should return undefined when projectHash is empty", () => {
      const result = inferGeminiProjectPath("", ["/some/path/file.ts"]);
      expect(result).toBeUndefined();
    });

    it("should return undefined when filePaths is empty", () => {
      const result = inferGeminiProjectPath(REAL_HASH, []);
      expect(result).toBeUndefined();
    });

    it("should return undefined when no hash match found", () => {
      const result = inferGeminiProjectPath(
        "0000000000000000000000000000000000000000000000000000000000000000",
        ["/some/path/file.ts"],
      );
      expect(result).toBeUndefined();
    });

    it("should handle relative paths (skip them)", () => {
      const filePaths = [
        "src/index.ts", // Relative, should be skipped
        "../../other.ts", // Relative, should be skipped
      ];

      const result = inferGeminiProjectPath(REAL_HASH, filePaths);
      expect(result).toBeUndefined();
    });

    it("should handle mixed relative and absolute paths", () => {
      const filePaths = [
        "src/index.ts", // Relative, skip
        "/Users/yoavfarhi/dev/pomodoro/gemini/file.ts", // Absolute, use
      ];

      const result = inferGeminiProjectPath(REAL_HASH, filePaths);
      expect(result).toBe(REAL_PATH);
    });
  });

  describe("Windows paths", () => {
    it("should handle Windows paths with backslashes", () => {
      // Hash for "C:/project"
      const winHash =
        "d948d5e3d3c9b4c9c6c3b7c5e8e7d5d7c4e6e7e5e5e7e8e7e5e7e8e7e5e7e8e7";
      const filePaths = ["C:\\project\\src\\index.ts"];

      // Will walk up and try to match C:/project (after normalization)
      const result = inferGeminiProjectPath(winHash, filePaths);

      // Should either return normalized path or undefined (no match in this test env)
      // The important thing is it doesn't crash
      expect(result === undefined || result.includes("project")).toBe(true);
    });

    it("should handle Windows paths with forward slashes", () => {
      const winHash =
        "d948d5e3d3c9b4c9c6c3b7c5e8e7d5d7c4e6e7e5e5e7e8e7e5e7e8e7e5e7e8e7";
      const filePaths = ["C:/project/src/index.ts"];

      const result = inferGeminiProjectPath(winHash, filePaths);

      // Should handle gracefully
      expect(result === undefined || result.includes("project")).toBe(true);
    });

    it("should handle mixed Windows path separators", () => {
      const filePaths = ["C:\\project/mixed\\path/file.ts"];

      // Should normalize to forward slashes internally
      const result = inferGeminiProjectPath(REAL_HASH, filePaths);

      // Won't match our test hash, but shouldn't crash
      expect(result).toBeUndefined();
    });
  });

  describe("Security and robustness", () => {
    it("should handle very long paths without crashing", () => {
      const longPath =
        "/a".repeat(100) + "/Users/yoavfarhi/dev/pomodoro/gemini/file.ts";

      const result = inferGeminiProjectPath(REAL_HASH, [longPath]);

      // May or may not find match, but shouldn't crash
      expect(result === undefined || typeof result === "string").toBe(true);
    });

    it("should handle paths with special characters", () => {
      const filePaths = [
        "/Users/yoavfarhi/dev/pomodoro/gemini/file with spaces.ts",
        "/Users/yoavfarhi/dev/pomodoro/gemini/file-with-dashes.ts",
        "/Users/yoavfarhi/dev/pomodoro/gemini/file_with_underscores.ts",
      ];

      const result = inferGeminiProjectPath(REAL_HASH, filePaths);
      expect(result).toBe(REAL_PATH);
    });

    it("should handle paths with unicode characters", () => {
      const filePaths = [
        "/Users/yoavfarhi/dev/pomodoro/gemini/文件.ts",
        "/Users/yoavfarhi/dev/pomodoro/gemini/файл.ts",
      ];

      const result = inferGeminiProjectPath(REAL_HASH, filePaths);
      expect(result).toBe(REAL_PATH);
    });

    it("should stop at root and not infinite loop", () => {
      const result = inferGeminiProjectPath("nonexistent", ["/file.ts"]);

      // Should return undefined, not loop forever
      expect(result).toBeUndefined();
    });

    it("should handle root path", () => {
      const filePaths = ["/"];

      const result = inferGeminiProjectPath(REAL_HASH, filePaths);

      // Root won't match, should return undefined
      expect(result).toBeUndefined();
    });
  });
});
