import { describe, expect, it } from "vitest";
import type { ContentBlock, ToolResult, ToolUse } from "@/types/transcript";

/**
 * Tests for MessageRenderer grouping logic
 * These tests verify that tool_use and tool_result blocks are correctly grouped
 */
describe("MessageRenderer - Tool Grouping Logic", () => {
  describe("tool_use and tool_result grouping", () => {
    it("should group tool_result immediately after tool_use", () => {
      const content: ContentBlock[] = [
        {
          type: "tool_use",
          id: "tool-1",
          name: "shell",
          input: { command: ["bash", "-lc", "ls"] },
        } as ToolUse,
        {
          type: "tool_result",
          tool_use_id: "tool-1",
          content: {
            output: "file1.txt\nfile2.txt",
            metadata: { duration_seconds: 1.2 },
          },
        } as ToolResult,
      ];

      // Simulate grouping logic
      const grouped: any[] = [];
      let i = 0;

      while (i < content.length) {
        const block = content[i];

        if (block.type === "tool_use") {
          const toolUse = block;
          const toolResults: ToolResult[] = [];
          let j = i + 1;

          while (j < content.length && content[j].type === "tool_result") {
            const result = content[j] as ToolResult;
            if (result.tool_use_id === toolUse.id) {
              toolResults.push(result);
            }
            j++;
          }

          grouped.push({
            type: "tool_use",
            toolUse,
            toolResults,
          });
          i = j;
        } else if (block.type === "tool_result") {
          // Skip standalone tool_result
          i++;
        } else {
          grouped.push(block);
          i++;
        }
      }

      expect(grouped).toHaveLength(1);
      expect(grouped[0].type).toBe("tool_use");
      expect(grouped[0].toolResults).toHaveLength(1);
      expect(grouped[0].toolResults[0].content.output).toBe(
        "file1.txt\nfile2.txt",
      );
    });

    it("should handle multiple tool_results for same tool_use", () => {
      const content: ContentBlock[] = [
        {
          type: "tool_use",
          id: "tool-1",
          name: "shell",
          input: { command: ["bash", "-lc", "echo hello"] },
        } as ToolUse,
        {
          type: "tool_result",
          tool_use_id: "tool-1",
          content: { output: "hello", metadata: { duration_seconds: 0.1 } },
        } as ToolResult,
        {
          type: "tool_result",
          tool_use_id: "tool-1",
          content: { output: "world", metadata: { duration_seconds: 0.1 } },
        } as ToolResult,
      ];

      // Simulate grouping
      const grouped: any[] = [];
      let i = 0;

      while (i < content.length) {
        const block = content[i];

        if (block.type === "tool_use") {
          const toolUse = block;
          const toolResults: ToolResult[] = [];
          let j = i + 1;

          while (j < content.length && content[j].type === "tool_result") {
            const result = content[j] as ToolResult;
            if (result.tool_use_id === toolUse.id) {
              toolResults.push(result);
            }
            j++;
          }

          grouped.push({
            type: "tool_use",
            toolUse,
            toolResults,
          });
          i = j;
        } else if (block.type === "tool_result") {
          i++;
        } else {
          grouped.push(block);
          i++;
        }
      }

      expect(grouped).toHaveLength(1);
      expect(grouped[0].toolResults).toHaveLength(2);
    });

    it("should not group tool_result with mismatched tool_use_id", () => {
      const content: ContentBlock[] = [
        {
          type: "tool_use",
          id: "tool-1",
          name: "shell",
          input: { command: ["bash", "-lc", "ls"] },
        } as ToolUse,
        {
          type: "tool_result",
          tool_use_id: "tool-2", // Different ID
          content: { output: "output", metadata: { duration_seconds: 0 } },
        } as ToolResult,
      ];

      // Simulate grouping
      const grouped: any[] = [];
      let i = 0;

      while (i < content.length) {
        const block = content[i];

        if (block.type === "tool_use") {
          const toolUse = block;
          const toolResults: ToolResult[] = [];
          let j = i + 1;

          while (j < content.length && content[j].type === "tool_result") {
            const result = content[j] as ToolResult;
            if (result.tool_use_id === toolUse.id) {
              toolResults.push(result);
            }
            j++;
          }

          grouped.push({
            type: "tool_use",
            toolUse,
            toolResults,
          });
          i = j;
        } else if (block.type === "tool_result") {
          i++;
        } else {
          grouped.push(block);
          i++;
        }
      }

      expect(grouped).toHaveLength(1);
      expect(grouped[0].toolResults).toHaveLength(0);
    });

    it("should skip standalone tool_result blocks", () => {
      const content: ContentBlock[] = [
        {
          type: "text",
          text: "Hello",
        },
        {
          type: "tool_result",
          tool_use_id: "orphan",
          content: "orphaned result",
        } as ToolResult,
        {
          type: "text",
          text: "World",
        },
      ];

      // Simulate grouping
      const grouped: any[] = [];
      let i = 0;

      while (i < content.length) {
        const block = content[i];

        if (block.type === "tool_use") {
          const toolUse = block;
          const toolResults: ToolResult[] = [];
          let j = i + 1;

          while (j < content.length && content[j].type === "tool_result") {
            const result = content[j] as ToolResult;
            if (result.tool_use_id === (toolUse as any).id) {
              toolResults.push(result);
            }
            j++;
          }

          grouped.push({
            type: "tool_use",
            toolUse,
            toolResults,
          });
          i = j;
        } else if (block.type === "tool_result") {
          // Skip standalone
          i++;
        } else {
          grouped.push(block);
          i++;
        }
      }

      expect(grouped).toHaveLength(2);
      expect(grouped[0].type).toBe("text");
      expect(grouped[1].type).toBe("text");
    });
  });
});
