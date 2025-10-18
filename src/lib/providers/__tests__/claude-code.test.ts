import { describe, expect, it } from "vitest";
import { ClaudeCodeProvider } from "../claude-code";
import {
  claudeCodeSample,
  claudeCodeWithCommands,
} from "./fixtures/claude-code-sample";

describe("ClaudeCodeProvider", () => {
  const provider = new ClaudeCodeProvider();

  describe("metadata", () => {
    it("should have correct name and displayName", () => {
      expect(provider.name).toBe("claude-code");
      expect(provider.displayName).toBe("Claude Code");
    });
  });

  describe("detect", () => {
    it("should detect Claude Code format with file-history-snapshot", () => {
      expect(provider.detect(claudeCodeSample)).toBe(true);
    });

    it("should detect Claude Code format with thinking blocks", () => {
      const withThinking = `{"type":"assistant","message":{"role":"assistant","content":[{"type":"thinking","thinking":"test"}]}}`;
      expect(provider.detect(withThinking)).toBe(true);
    });

    it("should detect Claude Code format with parentUuid", () => {
      const withParentUuid = `{"type":"user","message":{"role":"user"},"parentUuid":"123"}`;
      expect(provider.detect(withParentUuid)).toBe(true);
    });

    it("should not detect non-Claude Code format", () => {
      const codexFormat = `{"record_type":"state"}`;
      expect(provider.detect(codexFormat)).toBe(false);
    });

    it("should handle invalid JSONL gracefully", () => {
      expect(provider.detect("not json at all")).toBe(false);
      expect(provider.detect("")).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse basic Claude Code transcript", () => {
      const result = provider.parse(claudeCodeSample);

      expect(result.sessionId).toBe("test-session-123");
      expect(result.metadata.messageCount).toBe(4); // Excludes file-history-snapshot
      expect(result.metadata.cwd).toBe("/test/path");
      expect(result.messages).toHaveLength(4);
    });

    it("should extract timestamps correctly", () => {
      const result = provider.parse(claudeCodeSample);

      expect(result.metadata.firstTimestamp).toBe("2024-01-01T10:00:00.000Z");
      expect(result.metadata.lastTimestamp).toBe("2024-01-01T10:00:03.000Z");
    });

    it("should preserve message content", () => {
      const result = provider.parse(claudeCodeSample);

      const firstMessage = result.messages[0];
      expect(firstMessage.message?.role).toBe("user");
      expect(firstMessage.message?.content).toEqual([
        { type: "text", text: "Hello, can you help me?" },
      ]);
    });

    it("should preserve tool use blocks", () => {
      const result = provider.parse(claudeCodeSample);

      const toolMessage = result.messages[3];
      const content = toolMessage.message?.content as any[];

      expect(content.some((block) => block.type === "thinking")).toBe(true);
      expect(content.some((block) => block.type === "tool_use")).toBe(true);

      const toolUse = content.find((block) => block.type === "tool_use");
      expect(toolUse?.name).toBe("Read");
      expect(toolUse?.input).toEqual({ file_path: "/test/file.txt" });
    });

    it("should preserve model information", () => {
      const result = provider.parse(claudeCodeSample);

      const assistantMessage = result.messages[1];
      expect(assistantMessage.message?.model).toBe(
        "claude-sonnet-4-5-20250929",
      );
    });

    it("should skip file-history-snapshot entries", () => {
      const result = provider.parse(claudeCodeSample);

      // Should not include the file-history-snapshot line
      expect(
        result.messages.every((m) => m.type !== "file-history-snapshot"),
      ).toBe(true);
    });

    it("should parse slash commands", () => {
      const result = provider.parse(claudeCodeWithCommands);

      const commandMessage = result.messages[0];
      const content = commandMessage.message?.content as any[];

      expect(content).toEqual([
        { type: "command-name", text: "/commit" },
        { type: "command-message", text: "Committing changes" },
        { type: "command-args", text: "" },
      ]);
    });

    it("should parse bash blocks", () => {
      const result = provider.parse(claudeCodeWithCommands);

      const bashMessage = result.messages[1];
      const content = bashMessage.message?.content as any[];

      expect(content).toContainEqual({ type: "bash-input", text: "ls -la" });
      expect(content).toContainEqual({ type: "bash-stdout", text: "total 0" });
    });

    it("should handle empty input gracefully", () => {
      // Suppress expected console errors
      const consoleError = console.error;
      console.error = () => {};

      const result = provider.parse("");

      expect(result.messages).toEqual([]);
      expect(result.sessionId).toBe("");
      expect(result.metadata.messageCount).toBe(0);

      console.error = consoleError;
    });
  });

  describe("formatModelName", () => {
    it("should format claude-opus-4 correctly", () => {
      expect(provider.formatModelName?.("claude-opus-4-20250514")).toBe(
        "Claude Opus 4",
      );
    });

    it("should format claude-sonnet-4-5 correctly", () => {
      expect(provider.formatModelName?.("claude-sonnet-4-5-20250929")).toBe(
        "Claude Sonnet 4.5",
      );
    });

    it("should format claude-3-5-sonnet correctly", () => {
      expect(provider.formatModelName?.("claude-3-5-sonnet-20241022")).toBe(
        "Claude Sonnet 3.5",
      );
    });

    it("should return null for synthetic models", () => {
      expect(provider.formatModelName?.("<synthetic>")).toBe(null);
      expect(provider.formatModelName?.("synthetic-model")).toBe(null);
    });

    it("should return original for unknown formats", () => {
      expect(provider.formatModelName?.("unknown-model-123")).toBe(
        "unknown-model-123",
      );
    });
  });
});
