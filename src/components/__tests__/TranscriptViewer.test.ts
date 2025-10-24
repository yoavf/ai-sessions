import { describe, expect, it } from "vitest";
import {
  getAssistantIconPath,
  getShortAssistantName,
} from "@/lib/source-utils";
import type {
  ContentBlock,
  ParsedTranscript,
  TranscriptLine,
} from "@/types/transcript";

/**
 * Tests for TranscriptViewer message counting logic
 * These tests verify that user, assistant, and tool call counts are correctly calculated
 */

// Helper to create a transcript line
function createTranscriptLine(
  role: "user" | "assistant",
  content: ContentBlock[] | string,
  uuid: string = "test-uuid",
): TranscriptLine {
  return {
    type: role,
    uuid,
    timestamp: "2024-01-01T10:00:00.000Z",
    parentUuid: null,
    message: {
      role,
      content,
    },
  };
}

// Helper to count tool calls (matches logic in TranscriptViewer)
function countToolCalls(transcript: ParsedTranscript): number {
  return transcript.messages.reduce((count, line) => {
    if (line.message?.role !== "assistant") return count;
    const content = line.message.content;
    if (!Array.isArray(content)) return count;

    // Count tool_use blocks in this message
    const toolUseBlocks = content.filter((block) => block.type === "tool_use");
    return count + toolUseBlocks.length;
  }, 0);
}

describe("TranscriptViewer - Message Counting", () => {
  describe("countToolCalls", () => {
    it("should count zero tool calls in empty transcript", () => {
      const transcript: ParsedTranscript = {
        messages: [],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:00:00.000Z",
          messageCount: 0,
        },
      };

      expect(countToolCalls(transcript)).toBe(0);
    });

    it("should count zero tool calls when only user messages exist", () => {
      const transcript: ParsedTranscript = {
        messages: [
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Hello" }],
            "uuid-1",
          ),
          createTranscriptLine(
            "user",
            [{ type: "text", text: "How are you?" }],
            "uuid-2",
          ),
        ],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:01:00.000Z",
          messageCount: 2,
        },
      };

      expect(countToolCalls(transcript)).toBe(0);
    });

    it("should count zero tool calls in assistant messages without tool_use", () => {
      const transcript: ParsedTranscript = {
        messages: [
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Hello" }],
            "uuid-1",
          ),
          createTranscriptLine(
            "assistant",
            [{ type: "text", text: "Hi there!" }],
            "uuid-2",
          ),
        ],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:01:00.000Z",
          messageCount: 2,
        },
      };

      expect(countToolCalls(transcript)).toBe(0);
    });

    it("should count single tool call in assistant message", () => {
      const transcript: ParsedTranscript = {
        messages: [
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Read file.txt" }],
            "uuid-1",
          ),
          createTranscriptLine(
            "assistant",
            [
              { type: "text", text: "Let me read that file" },
              {
                type: "tool_use",
                id: "call-1",
                name: "Read",
                input: { file_path: "file.txt" },
              },
            ],
            "uuid-2",
          ),
        ],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:01:00.000Z",
          messageCount: 2,
        },
      };

      expect(countToolCalls(transcript)).toBe(1);
    });

    it("should count multiple tool calls in single assistant message", () => {
      const transcript: ParsedTranscript = {
        messages: [
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Read two files" }],
            "uuid-1",
          ),
          createTranscriptLine(
            "assistant",
            [
              {
                type: "tool_use",
                id: "call-1",
                name: "Read",
                input: { file_path: "file1.txt" },
              },
              {
                type: "tool_use",
                id: "call-2",
                name: "Read",
                input: { file_path: "file2.txt" },
              },
            ],
            "uuid-2",
          ),
        ],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:01:00.000Z",
          messageCount: 2,
        },
      };

      expect(countToolCalls(transcript)).toBe(2);
    });

    it("should count tool calls across multiple assistant messages", () => {
      const transcript: ParsedTranscript = {
        messages: [
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Do some work" }],
            "uuid-1",
          ),
          createTranscriptLine(
            "assistant",
            [
              { type: "text", text: "First step" },
              {
                type: "tool_use",
                id: "call-1",
                name: "Read",
                input: { file_path: "file.txt" },
              },
            ],
            "uuid-2",
          ),
          createTranscriptLine(
            "assistant",
            [
              { type: "text", text: "Second step" },
              {
                type: "tool_use",
                id: "call-2",
                name: "Write",
                input: { file_path: "output.txt", content: "data" },
              },
            ],
            "uuid-3",
          ),
        ],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:02:00.000Z",
          messageCount: 3,
        },
      };

      expect(countToolCalls(transcript)).toBe(2);
    });

    it("should not count tool_result blocks", () => {
      const transcript: ParsedTranscript = {
        messages: [
          createTranscriptLine(
            "assistant",
            [
              {
                type: "tool_use",
                id: "call-1",
                name: "Read",
                input: { file_path: "file.txt" },
              },
              {
                type: "tool_result",
                tool_use_id: "call-1",
                content: "File contents",
              },
            ],
            "uuid-1",
          ),
        ],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:00:00.000Z",
          messageCount: 1,
        },
      };

      // Should only count tool_use, not tool_result
      expect(countToolCalls(transcript)).toBe(1);
    });

    it("should handle string content in assistant messages", () => {
      const transcript: ParsedTranscript = {
        messages: [
          createTranscriptLine("user", "Hello", "uuid-1"),
          createTranscriptLine("assistant", "Hi there!", "uuid-2"),
        ],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:01:00.000Z",
          messageCount: 2,
        },
      };

      // String content has no tool calls
      expect(countToolCalls(transcript)).toBe(0);
    });

    it("should handle mixed content types in assistant message", () => {
      const transcript: ParsedTranscript = {
        messages: [
          createTranscriptLine(
            "assistant",
            [
              { type: "text", text: "Let me help you" },
              { type: "thinking", thinking: "Planning my approach" },
              {
                type: "tool_use",
                id: "call-1",
                name: "Bash",
                input: { command: "ls -la" },
              },
              {
                type: "tool_result",
                tool_use_id: "call-1",
                content: "file1.txt\nfile2.txt",
              },
            ],
            "uuid-1",
          ),
        ],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:00:00.000Z",
          messageCount: 1,
        },
      };

      // Should only count the tool_use block
      expect(countToolCalls(transcript)).toBe(1);
    });

    it("should count many tool calls in complex transcript", () => {
      const transcript: ParsedTranscript = {
        messages: [
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Start" }],
            "uuid-1",
          ),
          createTranscriptLine(
            "assistant",
            [
              {
                type: "tool_use",
                id: "call-1",
                name: "Glob",
                input: { pattern: "**/*.ts" },
              },
              {
                type: "tool_use",
                id: "call-2",
                name: "Grep",
                input: { pattern: "TODO" },
              },
              {
                type: "tool_use",
                id: "call-3",
                name: "Read",
                input: { file_path: "src/index.ts" },
              },
            ],
            "uuid-2",
          ),
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Continue" }],
            "uuid-3",
          ),
          createTranscriptLine(
            "assistant",
            [
              {
                type: "tool_use",
                id: "call-4",
                name: "Edit",
                input: {
                  file_path: "src/index.ts",
                  old_string: "a",
                  new_string: "b",
                },
              },
              {
                type: "tool_use",
                id: "call-5",
                name: "Bash",
                input: { command: "npm test" },
              },
            ],
            "uuid-4",
          ),
        ],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:05:00.000Z",
          messageCount: 4,
        },
      };

      expect(countToolCalls(transcript)).toBe(5);
    });
  });

  describe("message role counting", () => {
    it("should count user and assistant messages correctly", () => {
      const transcript: ParsedTranscript = {
        messages: [
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Message 1" }],
            "uuid-1",
          ),
          createTranscriptLine(
            "assistant",
            [{ type: "text", text: "Response 1" }],
            "uuid-2",
          ),
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Message 2" }],
            "uuid-3",
          ),
          createTranscriptLine(
            "assistant",
            [{ type: "text", text: "Response 2" }],
            "uuid-4",
          ),
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Message 3" }],
            "uuid-5",
          ),
        ],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:05:00.000Z",
          messageCount: 5,
        },
      };

      const userCount = transcript.messages.filter(
        (line) => line.message?.role === "user",
      ).length;
      const assistantCount = transcript.messages.filter(
        (line) => line.message?.role === "assistant",
      ).length;

      expect(userCount).toBe(3);
      expect(assistantCount).toBe(2);
    });

    it("should handle transcripts with only user messages", () => {
      const transcript: ParsedTranscript = {
        messages: [
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Message 1" }],
            "uuid-1",
          ),
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Message 2" }],
            "uuid-2",
          ),
        ],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:01:00.000Z",
          messageCount: 2,
        },
      };

      const userCount = transcript.messages.filter(
        (line) => line.message?.role === "user",
      ).length;
      const assistantCount = transcript.messages.filter(
        (line) => line.message?.role === "assistant",
      ).length;

      expect(userCount).toBe(2);
      expect(assistantCount).toBe(0);
    });
  });

  describe("comprehensive counting scenario", () => {
    it("should correctly count all message types in complex transcript", () => {
      const transcript: ParsedTranscript = {
        messages: [
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Help me with this task" }],
            "uuid-1",
          ),
          createTranscriptLine(
            "assistant",
            [
              { type: "text", text: "Sure, let me help" },
              { type: "thinking", thinking: "Planning my approach" },
            ],
            "uuid-2",
          ),
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Great, proceed" }],
            "uuid-3",
          ),
          createTranscriptLine(
            "assistant",
            [
              { type: "text", text: "I will use these tools" },
              {
                type: "tool_use",
                id: "call-1",
                name: "Read",
                input: { file_path: "file.txt" },
              },
              {
                type: "tool_use",
                id: "call-2",
                name: "Glob",
                input: { pattern: "**/*.ts" },
              },
            ],
            "uuid-4",
          ),
          createTranscriptLine(
            "user",
            [{ type: "text", text: "Thanks!" }],
            "uuid-5",
          ),
          createTranscriptLine(
            "assistant",
            [
              {
                type: "tool_use",
                id: "call-3",
                name: "Write",
                input: { file_path: "output.txt", content: "done" },
              },
              { type: "text", text: "All done!" },
            ],
            "uuid-6",
          ),
        ],
        sessionId: "test-session",
        metadata: {
          firstTimestamp: "2024-01-01T10:00:00.000Z",
          lastTimestamp: "2024-01-01T10:10:00.000Z",
          messageCount: 6,
        },
      };

      const userCount = transcript.messages.filter(
        (line) => line.message?.role === "user",
      ).length;
      const assistantCount = transcript.messages.filter(
        (line) => line.message?.role === "assistant",
      ).length;
      const toolCallCount = countToolCalls(transcript);

      expect(userCount).toBe(3);
      expect(assistantCount).toBe(3);
      expect(toolCallCount).toBe(3);
      expect(userCount + assistantCount).toBe(6);
    });
  });
});

describe("TranscriptViewer - Helper Functions", () => {
  describe("getAssistantIconPath", () => {
    it("should return claude icon for claude-code", () => {
      expect(getAssistantIconPath("claude-code")).toBe("/claude.png");
    });

    it("should return gemini icon for gemini-cli", () => {
      expect(getAssistantIconPath("gemini-cli")).toBe("/gemini.jpg");
    });

    it("should return codex icon for codex", () => {
      expect(getAssistantIconPath("codex")).toBe("/codex.png");
    });

    it("should return default claude icon for unknown source", () => {
      expect(getAssistantIconPath("unknown")).toBe("/claude.png");
    });

    it("should return default claude icon for empty string", () => {
      expect(getAssistantIconPath("")).toBe("/claude.png");
    });
  });

  describe("getShortAssistantName", () => {
    it("should return 'claude' for claude-code", () => {
      expect(getShortAssistantName("claude-code")).toBe("claude");
    });

    it("should return 'gemini' for gemini-cli", () => {
      expect(getShortAssistantName("gemini-cli")).toBe("gemini");
    });

    it("should return 'codex' for codex", () => {
      expect(getShortAssistantName("codex")).toBe("codex");
    });

    it("should return 'assistant' for unknown source", () => {
      expect(getShortAssistantName("unknown")).toBe("assistant");
    });

    it("should return 'assistant' for empty string", () => {
      expect(getShortAssistantName("")).toBe("assistant");
    });
  });
});
