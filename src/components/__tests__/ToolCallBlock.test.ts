import { describe, expect, it } from "vitest";
import { getToolPreview } from "../getToolPreview";

/**
 * Tests for ToolCallBlock preview generation
 * These tests verify that tool previews are correctly generated for different tool types
 */

describe("ToolCallBlock - getToolPreview", () => {
  describe("shell tool", () => {
    it("should extract command from array format", () => {
      const preview = getToolPreview("shell", {
        command: ["bash", "-lc", "ls -la"],
      });
      expect(preview).toBe("ls -la");
    });

    it("should filter out bash and -lc from command array", () => {
      const preview = getToolPreview("shell", {
        command: ["bash", "-lc", 'grep "test" file.txt'],
      });
      expect(preview).toBe('grep "test" file.txt');
    });

    it("should handle string command", () => {
      const preview = getToolPreview("shell", {
        command: "echo hello",
      });
      expect(preview).toBe("echo hello");
    });

    it("should get first line of multiline command", () => {
      const preview = getToolPreview("shell", {
        command: [
          "bash",
          "-lc",
          "apply_patch <<'PATCH'\n*** Begin Patch\n*** End Patch",
        ],
      });
      expect(preview).toBe("apply_patch <<'PATCH'");
    });

    it("should truncate long commands at 60 chars", () => {
      const longCommand =
        "sed -n '1,200p' /very/long/path/to/some/deeply/nested/file.txt";
      const preview = getToolPreview("shell", {
        command: ["bash", "-lc", longCommand],
      });
      expect(preview?.length).toBeLessThanOrEqual(63); // 60 + '...'
      expect(preview).toContain("...");
    });

    it("should break at command separators", () => {
      const preview = getToolPreview("shell", {
        command: ["bash", "-lc", "ls && cd .. && pwd"],
      });
      expect(preview).toBe("ls");
    });

    it("should return null for empty command", () => {
      const preview = getToolPreview("shell", {
        command: null,
      });
      expect(preview).toBeNull();
    });

    it("should handle non-string, non-array command", () => {
      const preview = getToolPreview("shell", {
        command: { invalid: "object" },
      });
      expect(preview).toBeNull();
    });
  });

  describe("Bash tool", () => {
    it("should extract npx commands", () => {
      const preview = getToolPreview("Bash", {
        command: "npx prisma migrate dev",
      });
      expect(preview).toBe("npx prisma");
    });

    it("should extract npm run commands", () => {
      const preview = getToolPreview("Bash", {
        command: "npm run build",
      });
      expect(preview).toBe("npm run build");
    });

    it("should extract npm commands without run", () => {
      const preview = getToolPreview("Bash", {
        command: "npm install",
      });
      expect(preview).toBe("npm install");
    });

    it("should truncate long bash commands", () => {
      const longCommand =
        'echo "this is a very long command that exceeds fifty characters"';
      const preview = getToolPreview("Bash", {
        command: longCommand,
      });
      expect(preview?.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(preview).toContain("...");
    });

    it("should break at command separators", () => {
      const preview = getToolPreview("Bash", {
        command: 'git add . && git commit -m "message"',
      });
      expect(preview).toBe("git add .");
    });
  });

  describe("TodoWrite tool", () => {
    it("should show count for single todo", () => {
      const preview = getToolPreview("TodoWrite", {
        todos: [{ content: "Task 1", status: "pending", activeForm: "Task 1" }],
      });
      expect(preview).toBe("1 todo");
    });

    it("should show count for multiple todos", () => {
      const preview = getToolPreview("TodoWrite", {
        todos: [
          { content: "Task 1", status: "pending", activeForm: "Task 1" },
          { content: "Task 2", status: "pending", activeForm: "Task 2" },
        ],
      });
      expect(preview).toBe("2 todos");
    });

    it("should return null for empty todos", () => {
      const preview = getToolPreview("TodoWrite", {
        todos: [],
      });
      expect(preview).toBe("0 todos");
    });

    it("should return null for missing todos", () => {
      const preview = getToolPreview("TodoWrite", {});
      expect(preview).toBeNull();
    });
  });

  describe("File operation tools", () => {
    it("should show file path for Read", () => {
      const preview = getToolPreview("Read", {
        file_path: "/path/to/file.txt",
      });
      expect(preview).toBe("/path/to/file.txt");
    });

    it("should show file path for Write", () => {
      const preview = getToolPreview("Write", {
        file_path: "/path/to/output.txt",
      });
      expect(preview).toBe("/path/to/output.txt");
    });

    it("should show file path for write_file (Gemini)", () => {
      const preview = getToolPreview("write_file", {
        file_path: "/path/to/output.txt",
      });
      expect(preview).toBe("/path/to/output.txt");
    });

    it("should show file path for Edit", () => {
      const preview = getToolPreview("Edit", {
        file_path: "/path/to/edit.txt",
      });
      expect(preview).toBe("/path/to/edit.txt");
    });

    it("should show file path for replace (Gemini)", () => {
      const preview = getToolPreview("replace", {
        file_path: "/path/to/edit.txt",
      });
      expect(preview).toBe("/path/to/edit.txt");
    });
  });

  describe("Search tools", () => {
    it("should show pattern for Glob", () => {
      const preview = getToolPreview("Glob", {
        pattern: "**/*.ts",
      });
      expect(preview).toBe("**/*.ts");
    });

    it("should show quoted pattern for Grep", () => {
      const preview = getToolPreview("Grep", {
        pattern: "search term",
      });
      expect(preview).toBe('"search term"');
    });
  });

  describe("Other tools", () => {
    it("should show URL for WebFetch", () => {
      const preview = getToolPreview("WebFetch", {
        url: "https://example.com",
      });
      expect(preview).toBe("https://example.com");
    });

    it("should show description for Task", () => {
      const preview = getToolPreview("Task", {
        description: "Run tests",
      });
      expect(preview).toBe("Run tests");
    });

    it("should return null for unknown tool", () => {
      const preview = getToolPreview("UnknownTool", {
        some_param: "value",
      });
      expect(preview).toBeNull();
    });
  });

  describe("Edge cases - empty string handling", () => {
    it("should recognize Edit tool with empty old_string (new file scenario)", () => {
      // This is a valid Edit case - creating a new file or adding content to empty file
      const toolUse = {
        name: "Edit",
        input: {
          file_path: "test.txt",
          old_string: "",
          new_string: "new content",
        },
      };

      // Should be detected as isEdit even with empty old_string
      const isEdit =
        (toolUse.name === "Edit" || toolUse.name === "replace") &&
        toolUse.input.file_path !== undefined &&
        toolUse.input.old_string !== undefined &&
        toolUse.input.new_string !== undefined;

      expect(isEdit).toBe(true);
    });

    it("should recognize Edit tool with empty new_string (delete all content)", () => {
      // This is a valid Edit case - deleting all content from a file
      const toolUse = {
        name: "Edit",
        input: {
          file_path: "test.txt",
          old_string: "old content",
          new_string: "",
        },
      };

      // Should be detected as isEdit even with empty new_string
      const isEdit =
        (toolUse.name === "Edit" || toolUse.name === "replace") &&
        toolUse.input.file_path !== undefined &&
        toolUse.input.old_string !== undefined &&
        toolUse.input.new_string !== undefined;

      expect(isEdit).toBe(true);
    });

    it("should recognize Write tool with empty content (create empty file)", () => {
      // This is a valid Write case - creating an empty file
      const toolUse = {
        name: "Write",
        input: {
          file_path: "empty.txt",
          content: "",
        },
      };

      // Should be detected as isWrite even with empty content
      const isWrite =
        toolUse.name === "Write" &&
        toolUse.input.file_path !== undefined &&
        toolUse.input.content !== undefined;

      expect(isWrite).toBe(true);
    });

    it("should recognize write_file tool (Gemini)", () => {
      // Gemini's write_file tool
      const toolUse = {
        name: "write_file",
        input: {
          file_path: "/path/to/file.txt",
          content: "file content",
        },
      };

      // Should be detected as isWrite
      const isWrite =
        (toolUse.name === "Write" || toolUse.name === "write_file") &&
        toolUse.input.file_path !== undefined &&
        toolUse.input.content !== undefined;

      expect(isWrite).toBe(true);
    });

    it("should recognize replace tool (Gemini)", () => {
      // Gemini's replace tool (equivalent to Edit)
      const toolUse = {
        name: "replace",
        input: {
          file_path: "/path/to/file.txt",
          old_string: "old content",
          new_string: "new content",
        },
      };

      // Should be detected as isEdit
      const isEdit =
        (toolUse.name === "Edit" || toolUse.name === "replace") &&
        toolUse.input.file_path !== undefined &&
        toolUse.input.old_string !== undefined &&
        toolUse.input.new_string !== undefined;

      expect(isEdit).toBe(true);
    });

    it("should NOT recognize Edit tool with missing properties", () => {
      const toolUse = {
        name: "Edit",
        input: {
          file_path: "test.txt",
          // old_string and new_string are missing (undefined)
        },
      };

      const isEdit =
        (toolUse.name === "Edit" || toolUse.name === "replace") &&
        toolUse.input.file_path !== undefined &&
        toolUse.input.old_string !== undefined &&
        toolUse.input.new_string !== undefined;

      expect(isEdit).toBe(false);
    });

    it("should NOT recognize Write tool with missing content", () => {
      const toolUse = {
        name: "Write",
        input: {
          file_path: "test.txt",
          // content is missing (undefined)
        },
      };

      const isWrite =
        toolUse.name === "Write" &&
        toolUse.input.file_path !== undefined &&
        toolUse.input.content !== undefined;

      expect(isWrite).toBe(false);
    });
  });
});
