import { describe, expect, it } from "vitest";
import { GeminiProvider } from "../gemini";
import {
  geminiSample,
  geminiWithThoughtsOnly,
  minimalGeminiSample,
} from "./fixtures/gemini-sample";

describe("GeminiProvider", () => {
  const provider = new GeminiProvider();

  describe("metadata", () => {
    it("should have correct name and displayName", () => {
      expect(provider.name).toBe("gemini-cli");
      expect(provider.displayName).toBe("Gemini CLI");
    });
  });

  describe("detect", () => {
    it("should detect Gemini format with type: gemini", () => {
      expect(provider.detect(geminiSample)).toBe(true);
    });

    it("should detect Gemini format with thoughts array", () => {
      expect(provider.detect(geminiWithThoughtsOnly)).toBe(true);
    });

    it("should detect minimal Gemini format", () => {
      expect(provider.detect(minimalGeminiSample)).toBe(true);
    });

    it("should not detect JSONL format (Claude Code/Codex)", () => {
      const jsonlFormat = `{"type":"user","message":{"role":"user"}}
{"type":"assistant","message":{"role":"assistant"}}`;
      expect(provider.detect(jsonlFormat)).toBe(false);
    });

    it("should not detect Claude Code format", () => {
      const claudeCode = `{"type":"file-history-snapshot"}`;
      expect(provider.detect(claudeCode)).toBe(false);
    });

    it("should handle invalid JSON gracefully", () => {
      expect(provider.detect("not json at all")).toBe(false);
      expect(provider.detect("")).toBe(false);
      expect(provider.detect("{}")).toBe(false);
    });

    it("should require Gemini-specific fields", () => {
      const missingProjectHash = `{"sessionId":"123","messages":[]}`;
      expect(provider.detect(missingProjectHash)).toBe(false);

      const missingMessages = `{"sessionId":"123","projectHash":"abc"}`;
      expect(provider.detect(missingMessages)).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse basic Gemini transcript", () => {
      const result = provider.parse(geminiSample);

      expect(result.sessionId).toBe("f86f5318-f47b-4433-85f8-ec9d9a417f8e");
      expect(result.metadata.messageCount).toBe(6);
      expect(result.messages).toHaveLength(6);
    });

    it("should extract timestamps correctly", () => {
      const result = provider.parse(geminiSample);

      expect(result.metadata.firstTimestamp).toBe("2025-10-18T14:57:28.974Z");
      // lastTimestamp uses session.lastUpdated since it's later than message timestamps
      expect(result.metadata.lastTimestamp).toBe("2025-10-18T14:58:07.161Z");
    });

    it("should map user messages correctly", () => {
      const result = provider.parse(geminiSample);

      const userMessage = result.messages[0];
      expect(userMessage.type).toBe("user");
      expect(userMessage.message?.role).toBe("user");
      expect(userMessage.message?.content).toEqual([
        { type: "text", text: "List the files in the current directory" },
      ]);
    });

    it("should map gemini messages to assistant role", () => {
      const result = provider.parse(geminiSample);

      const geminiMessage = result.messages[1];
      expect(geminiMessage.type).toBe("assistant");
      expect(geminiMessage.message?.role).toBe("assistant");
    });

    it("should parse thoughts into thinking blocks", () => {
      const result = provider.parse(geminiSample);

      const messageWithThoughts = result.messages[1];
      const content = messageWithThoughts.message?.content as Array<{
        type: string;
        thinking?: string;
      }>;

      const thinkingBlock = content.find((block) => block.type === "thinking");
      expect(thinkingBlock).toBeDefined();
      expect(thinkingBlock?.thinking).toContain(
        "Analyzing Directory Structure",
      );
      expect(thinkingBlock?.thinking).toContain(
        "I've started by examining the directory structure",
      );
    });

    it("should parse tool calls correctly", () => {
      const result = provider.parse(geminiSample);

      const messageWithToolCall = result.messages[1];
      const content = messageWithToolCall.message?.content as Array<{
        type: string;
        name?: string;
        input?: Record<string, unknown>;
      }>;

      const toolUse = content.find((block) => block.type === "tool_use");
      expect(toolUse).toBeDefined();
      expect(toolUse?.name).toBe("list_directory");
      expect(toolUse?.input).toEqual({ path: "/Users/test/project" });
    });

    it("should parse tool results correctly", () => {
      const result = provider.parse(geminiSample);

      const messageWithToolCall = result.messages[1];
      const content = messageWithToolCall.message?.content as Array<{
        type: string;
        tool_use_id?: string;
        content?: string;
      }>;

      const toolResult = content.find((block) => block.type === "tool_result");
      expect(toolResult).toBeDefined();
      expect(toolResult?.tool_use_id).toBe(
        "list_directory-1760799451650-5979488a89c64",
      );
      expect(toolResult?.content).toContain("Directory listing");
    });

    it("should preserve model information", () => {
      const result = provider.parse(geminiSample);

      const assistantMessage = result.messages[1];
      expect(assistantMessage.message?.model).toBe("gemini-2.5-pro");

      const anotherAssistantMessage = result.messages[4];
      expect(anotherAssistantMessage.message?.model).toBe("gemini-2.0-flash");
    });

    it("should handle messages with only text content", () => {
      const result = provider.parse(geminiSample);

      const textOnlyMessage = result.messages[2];
      const content = textOnlyMessage.message?.content as Array<{
        type: string;
        text?: string;
      }>;

      expect(content).toEqual([
        {
          type: "text",
          text: "I can see that this is a Node.js project with source code in the src directory.",
        },
      ]);
    });

    it("should handle messages with thoughts, tool calls, and text", () => {
      const result = provider.parse(geminiSample);

      const complexMessage = result.messages[4];
      const content = complexMessage.message?.content as Array<{
        type: string;
      }>;

      const types = content.map((block) => block.type);
      expect(types).toContain("thinking");
      expect(types).toContain("tool_use");
      expect(types).toContain("tool_result");
    });

    it("should use message IDs as UUIDs", () => {
      const result = provider.parse(geminiSample);

      expect(result.messages[0].uuid).toBe(
        "91ff4a35-0f7b-492d-8a04-ee206be11ec6",
      );
      expect(result.messages[1].uuid).toBe(
        "9cea53d4-c143-4bd1-bde2-7294e27deb9d",
      );
    });

    it("should set parentUuid to null", () => {
      const result = provider.parse(geminiSample);

      expect(result.messages.every((m) => m.parentUuid === null)).toBe(true);
    });

    it("should handle empty or missing cwd", () => {
      const result = provider.parse(geminiSample);

      expect(result.cwd).toBeUndefined();
    });

    it("should throw error for invalid JSON", () => {
      expect(() => provider.parse("not json")).toThrow(
        /Failed to parse Gemini session JSON/,
      );
    });

    it("should parse thoughts-only messages", () => {
      const result = provider.parse(geminiWithThoughtsOnly);

      const messageWithThoughts = result.messages[1];
      const content = messageWithThoughts.message?.content as Array<{
        type: string;
        thinking?: string;
        text?: string;
      }>;

      expect(content.some((block) => block.type === "thinking")).toBe(true);
      expect(content.some((block) => block.type === "text")).toBe(true);

      const thinkingBlock = content.find((block) => block.type === "thinking");
      expect(thinkingBlock?.thinking).toContain(
        "Considering Explanation Strategy",
      );
    });

    it("should unescape newlines in thinking blocks", () => {
      // Test session with escaped newlines in thinking blocks
      const sessionWithEscapedNewlines = `{
        "sessionId": "test-escaped",
        "projectHash": "abc123",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:05:00.000Z",
        "messages": [
          {
            "id": "msg-1",
            "timestamp": "2025-10-18T10:00:00.000Z",
            "type": "user",
            "content": "Hello"
          },
          {
            "id": "msg-2",
            "timestamp": "2025-10-18T10:00:05.000Z",
            "type": "gemini",
            "content": "Response text",
            "thoughts": [
              {
                "subject": "Beginning the Build",
                "description": "\\\\n\\\\nI'm starting the project.\\\\nFirst step: scaffold files.\\\\n\\\\nThen: set up structure.",
                "timestamp": "2025-10-18T10:00:04.000Z"
              }
            ],
            "model": "gemini-2.5-pro"
          }
        ]
      }`;

      const result = provider.parse(sessionWithEscapedNewlines);
      const messageWithThoughts = result.messages[1];
      const content = messageWithThoughts.message?.content as Array<{
        type: string;
        thinking?: string;
      }>;

      const thinkingBlock = content.find((block) => block.type === "thinking");
      expect(thinkingBlock).toBeDefined();

      // Should NOT contain escaped newlines
      expect(thinkingBlock?.thinking).not.toContain("\\n");

      // Should contain actual newlines
      expect(thinkingBlock?.thinking).toContain("\n\n");
      expect(thinkingBlock?.thinking?.split("\n").length).toBeGreaterThan(1);

      // Verify the content is properly formatted
      const lines = thinkingBlock?.thinking?.split("\n") || [];
      expect(lines[0]).toBe("Beginning the Build");
      expect(lines[1]).toBe("");
      expect(lines[2]).toBe("");
      // The description starts with \n\n, so after replacement we get 2 empty lines
      expect(lines[3]).toBe("");
      expect(lines[4]).toBe("I'm starting the project.");
      expect(lines[5]).toBe("First step: scaffold files.");
    });

    it("should parse tool results with text items correctly", () => {
      const result = provider.parse(geminiSample);

      // Last message should have the read_many_files tool call
      const messageWithMultiResults = result.messages[5];
      const content = messageWithMultiResults.message?.content as Array<{
        type: string;
        tool_use_id?: string;
        content?: string;
      }>;

      const toolResult = content.find((block) => block.type === "tool_result");
      expect(toolResult).toBeDefined();
      expect(toolResult?.tool_use_id).toBe("read_many_files-12345");

      // Should contain all parts: functionResponse output + text items
      expect(toolResult?.content).toContain("Tool execution succeeded.");
      expect(toolResult?.content).toContain("--- file1.txt ---");
      expect(toolResult?.content).toContain("Content of file 1");
      expect(toolResult?.content).toContain("--- file2.txt ---");
      expect(toolResult?.content).toContain("Content of file 2");
    });
  });

  describe("formatModelName", () => {
    it("should format gemini-2.5-pro correctly", () => {
      expect(provider.formatModelName?.("gemini-2.5-pro")).toBe(
        "Gemini 2.5 Pro",
      );
    });

    it("should format gemini-2.0-flash correctly", () => {
      expect(provider.formatModelName?.("gemini-2.0-flash")).toBe(
        "Gemini 2.0 Flash",
      );
    });

    it("should format gemini-1.5-pro correctly", () => {
      expect(provider.formatModelName?.("gemini-1.5-pro")).toBe(
        "Gemini 1.5 Pro",
      );
    });

    it("should return original for non-gemini models", () => {
      expect(provider.formatModelName?.("claude-opus-4")).toBe("claude-opus-4");
      expect(provider.formatModelName?.("gpt-4")).toBe("gpt-4");
    });

    it("should handle empty string", () => {
      expect(provider.formatModelName?.("")).toBe(null);
    });
  });

  describe("edge cases from real sessions", () => {
    it("should skip user messages starting with [Function Response:", () => {
      const sessionWithFunctionResponse = `{
        "sessionId": "test-session",
        "projectHash": "abc123",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:05:00.000Z",
        "messages": [
          {
            "id": "msg-1",
            "timestamp": "2025-10-18T10:00:00.000Z",
            "type": "user",
            "content": "Read a file"
          },
          {
            "id": "msg-2",
            "timestamp": "2025-10-18T10:00:01.000Z",
            "type": "user",
            "content": "[Function Response: read_file]File contents here"
          },
          {
            "id": "msg-3",
            "timestamp": "2025-10-18T10:00:02.000Z",
            "type": "gemini",
            "content": "I've read the file"
          }
        ]
      }`;

      const result = provider.parse(sessionWithFunctionResponse);

      // Should have 2 messages (original user message and gemini response)
      // The [Function Response: message should be filtered out
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].uuid).toBe("msg-1");
      expect(result.messages[1].uuid).toBe("msg-3");
    });

    it("should handle multiple thoughts in a single message", () => {
      const sessionWithMultipleThoughts = `{
        "sessionId": "test-session",
        "projectHash": "abc123",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:05:00.000Z",
        "messages": [
          {
            "id": "msg-1",
            "timestamp": "2025-10-18T10:00:00.000Z",
            "type": "user",
            "content": "Hello"
          },
          {
            "id": "msg-2",
            "timestamp": "2025-10-18T10:00:01.000Z",
            "type": "gemini",
            "content": "Response",
            "thoughts": [
              {
                "subject": "First Thought",
                "description": "Thinking about A",
                "timestamp": "2025-10-18T10:00:00.500Z"
              },
              {
                "subject": "Second Thought",
                "description": "Thinking about B",
                "timestamp": "2025-10-18T10:00:00.600Z"
              },
              {
                "subject": "Third Thought",
                "description": "Thinking about C",
                "timestamp": "2025-10-18T10:00:00.700Z"
              }
            ]
          }
        ]
      }`;

      const result = provider.parse(sessionWithMultipleThoughts);

      const geminiMessage = result.messages[1];
      const content = geminiMessage.message?.content as Array<{
        type: string;
        thinking?: string;
      }>;

      // Should have 3 thinking blocks + 1 text block
      const thinkingBlocks = content.filter(
        (block) => block.type === "thinking",
      );
      expect(thinkingBlocks).toHaveLength(3);
      expect(thinkingBlocks[0].thinking).toContain("First Thought");
      expect(thinkingBlocks[1].thinking).toContain("Second Thought");
      expect(thinkingBlocks[2].thinking).toContain("Third Thought");
    });

    it("should skip messages with whitespace-only content", () => {
      const sessionWithWhitespaceMessage = `{
        "sessionId": "test-session",
        "projectHash": "abc123",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:05:00.000Z",
        "messages": [
          {
            "id": "msg-1",
            "timestamp": "2025-10-18T10:00:00.000Z",
            "type": "user",
            "content": "  \\n  \\t  "
          },
          {
            "id": "msg-2",
            "timestamp": "2025-10-18T10:00:01.000Z",
            "type": "gemini",
            "content": "Actual response"
          }
        ]
      }`;

      const result = provider.parse(sessionWithWhitespaceMessage);

      // Should only have 1 message (the whitespace-only message should be skipped)
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].uuid).toBe("msg-2");
    });

    it("should skip messages with no content blocks", () => {
      const sessionWithEmptyMessage = `{
        "sessionId": "test-session",
        "projectHash": "abc123",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:05:00.000Z",
        "messages": [
          {
            "id": "msg-1",
            "timestamp": "2025-10-18T10:00:00.000Z",
            "type": "user",
            "content": "Valid message"
          },
          {
            "id": "msg-2",
            "timestamp": "2025-10-18T10:00:01.000Z",
            "type": "gemini",
            "content": ""
          },
          {
            "id": "msg-3",
            "timestamp": "2025-10-18T10:00:02.000Z",
            "type": "gemini",
            "content": "Another valid message"
          }
        ]
      }`;

      const result = provider.parse(sessionWithEmptyMessage);

      // Should have 2 messages (msg-2 has no content and should be skipped)
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].uuid).toBe("msg-1");
      expect(result.messages[1].uuid).toBe("msg-3");
    });

    it("should handle tool results with all empty outputs", () => {
      const sessionWithEmptyToolResult = `{
        "sessionId": "test-session",
        "projectHash": "abc123",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:05:00.000Z",
        "messages": [
          {
            "id": "msg-1",
            "timestamp": "2025-10-18T10:00:00.000Z",
            "type": "gemini",
            "content": "Using a tool",
            "toolCalls": [
              {
                "id": "tool-123",
                "name": "some_tool",
                "args": { "param": "value" },
                "result": [
                  {
                    "functionResponse": {
                      "id": "tool-123",
                      "name": "some_tool",
                      "response": {
                        "output": ""
                      }
                    }
                  }
                ],
                "status": "success",
                "timestamp": "2025-10-18T10:00:00.000Z"
              }
            ]
          }
        ]
      }`;

      const result = provider.parse(sessionWithEmptyToolResult);

      const message = result.messages[0];
      const content = message.message?.content as Array<{
        type: string;
      }>;

      // Should have text + tool_use, but NO tool_result (empty output)
      expect(content.some((block) => block.type === "text")).toBe(true);
      expect(content.some((block) => block.type === "tool_use")).toBe(true);
      expect(content.some((block) => block.type === "tool_result")).toBe(false);
    });

    it("should handle thoughts with escaped newlines", () => {
      const sessionWithEscapedNewlines = `{
        "sessionId": "test-session",
        "projectHash": "abc123",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:05:00.000Z",
        "messages": [
          {
            "id": "msg-1",
            "timestamp": "2025-10-18T10:00:00.000Z",
            "type": "gemini",
            "content": "Response",
            "thoughts": [
              {
                "subject": "Analyzing",
                "description": "\\\\n\\\\n\\n\\nI'm thinking about this problem carefully",
                "timestamp": "2025-10-18T10:00:00.000Z"
              }
            ]
          }
        ]
      }`;

      const result = provider.parse(sessionWithEscapedNewlines);

      const message = result.messages[0];
      const content = message.message?.content as Array<{
        type: string;
        thinking?: string;
      }>;

      const thinkingBlock = content.find((block) => block.type === "thinking");
      expect(thinkingBlock).toBeDefined();
      // The thinking should contain the escaped newlines as-is from JSON parsing
      expect(thinkingBlock?.thinking).toContain("Analyzing");
      expect(thinkingBlock?.thinking).toContain(
        "I'm thinking about this problem carefully",
      );
    });

    it("should handle multiple tool calls in a single message", () => {
      const sessionWithMultipleToolCalls = `{
        "sessionId": "test-session",
        "projectHash": "abc123",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:05:00.000Z",
        "messages": [
          {
            "id": "msg-1",
            "timestamp": "2025-10-18T10:00:00.000Z",
            "type": "gemini",
            "content": "Using multiple tools",
            "toolCalls": [
              {
                "id": "tool-1",
                "name": "first_tool",
                "args": { "arg": "value1" },
                "result": [
                  {
                    "functionResponse": {
                      "id": "tool-1",
                      "name": "first_tool",
                      "response": {
                        "output": "Result 1"
                      }
                    }
                  }
                ],
                "status": "success",
                "timestamp": "2025-10-18T10:00:00.000Z"
              },
              {
                "id": "tool-2",
                "name": "second_tool",
                "args": { "arg": "value2" },
                "result": [
                  {
                    "functionResponse": {
                      "id": "tool-2",
                      "name": "second_tool",
                      "response": {
                        "output": "Result 2"
                      }
                    }
                  }
                ],
                "status": "success",
                "timestamp": "2025-10-18T10:00:00.100Z"
              }
            ]
          }
        ]
      }`;

      const result = provider.parse(sessionWithMultipleToolCalls);

      const message = result.messages[0];
      const content = message.message?.content as Array<{
        type: string;
        name?: string;
        tool_use_id?: string;
      }>;

      // Should have: text + 2 tool_use blocks + 2 tool_result blocks
      const toolUseBlocks = content.filter(
        (block) => block.type === "tool_use",
      );
      const toolResultBlocks = content.filter(
        (block) => block.type === "tool_result",
      );

      expect(toolUseBlocks).toHaveLength(2);
      expect(toolResultBlocks).toHaveLength(2);
      expect(toolUseBlocks[0].name).toBe("first_tool");
      expect(toolUseBlocks[1].name).toBe("second_tool");
    });
  });

  describe("error handling and resilience", () => {
    it("should handle failed tool calls with error status", () => {
      const sessionWithFailedTool = `{
        "sessionId": "test-session",
        "projectHash": "abc123",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:05:00.000Z",
        "messages": [
          {
            "id": "msg-1",
            "timestamp": "2025-10-18T10:00:00.000Z",
            "type": "gemini",
            "content": "Attempting to read file",
            "toolCalls": [
              {
                "id": "tool-1",
                "name": "read_file",
                "args": { "path": "/nonexistent.txt" },
                "result": [
                  {
                    "functionResponse": {
                      "id": "tool-1",
                      "name": "read_file",
                      "response": {
                        "output": "Error: File not found - ENOENT: no such file or directory"
                      }
                    }
                  }
                ],
                "status": "error",
                "timestamp": "2025-10-18T10:00:00.000Z"
              }
            ]
          }
        ]
      }`;

      const result = provider.parse(sessionWithFailedTool);
      const content = result.messages[0].message?.content as Array<{
        type: string;
        content?: string;
      }>;

      const toolResult = content.find((block) => block.type === "tool_result");
      expect(toolResult).toBeDefined();
      expect(toolResult?.content).toContain("Error: File not found");
      expect(toolResult?.content).toContain("ENOENT");
    });

    it("should handle missing timestamps gracefully", () => {
      const sessionWithMissingTimestamps = `{
        "sessionId": "test-session",
        "projectHash": "abc123",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:05:00.000Z",
        "messages": [
          {
            "id": "msg-1",
            "type": "user",
            "content": "Hello"
          }
        ]
      }`;

      // Should not throw even when message timestamp is missing
      const result = provider.parse(sessionWithMissingTimestamps);
      // Should fall back to session timestamps
      expect(result.metadata.firstTimestamp).toBe("2025-10-18T10:00:00.000Z");
      expect(result.metadata.lastTimestamp).toBe("2025-10-18T10:05:00.000Z");
    });

    it("should handle invalid timestamp formats", () => {
      const sessionWithInvalidTimestamp = `{
        "sessionId": "test-session",
        "projectHash": "abc123",
        "startTime": "not-a-date",
        "lastUpdated": "2025-10-18T10:05:00.000Z",
        "messages": []
      }`;

      // Should not throw
      expect(() => provider.parse(sessionWithInvalidTimestamp)).not.toThrow();
    });

    it("should handle messages as non-array gracefully", () => {
      const invalidStructure = `{
        "sessionId": "test",
        "projectHash": "abc",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:00:00.000Z",
        "messages": "not-an-array"
      }`;

      // TypeScript doesn't validate at runtime, so this doesn't throw
      // Instead it produces an empty message list
      const result = provider.parse(invalidStructure);
      expect(result.messages).toHaveLength(0);
    });

    it("should handle tool calls with missing result field", () => {
      const missingResult = `{
        "sessionId": "test",
        "projectHash": "abc",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:00:00.000Z",
        "messages": [{
          "id": "msg-1",
          "timestamp": "2025-10-18T10:00:00.000Z",
          "type": "gemini",
          "content": "Using tool",
          "toolCalls": [{
            "id": "tool-1",
            "name": "some_tool",
            "args": {}
          }]
        }]
      }`;

      // Should not throw - just won't have tool_result block
      expect(() => provider.parse(missingResult)).not.toThrow();

      const result = provider.parse(missingResult);
      const content = result.messages[0].message?.content as Array<{
        type: string;
      }>;

      // Should have tool_use but no tool_result
      expect(content.some((block) => block.type === "tool_use")).toBe(true);
      expect(content.some((block) => block.type === "tool_result")).toBe(false);
    });

    it("should handle tool result with missing response field", () => {
      const missingResponseField = `{
        "sessionId": "test",
        "projectHash": "abc",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:00:00.000Z",
        "messages": [{
          "id": "msg-1",
          "timestamp": "2025-10-18T10:00:00.000Z",
          "type": "gemini",
          "content": "Using tool",
          "toolCalls": [{
            "id": "tool-1",
            "name": "some_tool",
            "args": {},
            "result": [{
              "functionResponse": {
                "id": "tool-1",
                "name": "some_tool"
              }
            }],
            "status": "success",
            "timestamp": "2025-10-18T10:00:00.000Z"
          }]
        }]
      }`;

      // Should not throw due to our null checks
      expect(() => provider.parse(missingResponseField)).not.toThrow();

      const result = provider.parse(missingResponseField);
      const content = result.messages[0].message?.content as Array<{
        type: string;
      }>;

      // Should have tool_use but no tool_result (empty output)
      expect(content.some((block) => block.type === "tool_use")).toBe(true);
      expect(content.some((block) => block.type === "tool_result")).toBe(false);
    });

    it("should handle thoughts with missing subject or description", () => {
      const incompleteThought = `{
        "sessionId": "test",
        "projectHash": "abc",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:05:00.000Z",
        "messages": [{
          "id": "msg-1",
          "timestamp": "2025-10-18T10:00:00.000Z",
          "type": "gemini",
          "content": "Response",
          "thoughts": [{
            "subject": "Complete Thought",
            "description": "This one is complete",
            "timestamp": "2025-10-18T10:00:00.000Z"
          }]
        }]
      }`;

      // Should not throw
      const result = provider.parse(incompleteThought);
      const content = result.messages[0].message?.content as Array<{
        type: string;
        thinking?: string;
      }>;

      const thinkingBlock = content.find((block) => block.type === "thinking");
      expect(thinkingBlock).toBeDefined();
      expect(thinkingBlock?.thinking).toContain("Complete Thought");
      expect(thinkingBlock?.thinking).toContain("This one is complete");
    });

    it("should handle unicode characters in thoughts and content", () => {
      const sessionWithUnicode = `{
        "sessionId": "test",
        "projectHash": "abc",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:00:00.000Z",
        "messages": [{
          "id": "msg-1",
          "timestamp": "2025-10-18T10:00:00.000Z",
          "type": "gemini",
          "content": "Testing unicode: 🚀 中文 العربية",
          "thoughts": [{
            "subject": "Unicode Test 🎯",
            "description": "Testing emoji support: 👍🏽",
            "timestamp": "2025-10-18T10:00:00.000Z"
          }]
        }]
      }`;

      const result = provider.parse(sessionWithUnicode);
      const content = result.messages[0].message?.content as Array<{
        type: string;
        thinking?: string;
        text?: string;
      }>;

      expect(content.some((b) => b.thinking?.includes("🎯"))).toBe(true);
      expect(content.some((b) => b.text?.includes("🚀"))).toBe(true);
      expect(content.some((b) => b.text?.includes("中文"))).toBe(true);
      expect(content.some((b) => b.text?.includes("العربية"))).toBe(true);
    });

    it("should use correct timestamp precedence (session vs message)", () => {
      const sessionWithEarlierMessageTimestamp = `{
        "sessionId": "test",
        "projectHash": "abc",
        "startTime": "2025-10-18T10:00:00.000Z",
        "lastUpdated": "2025-10-18T10:15:00.000Z",
        "messages": [{
          "id": "msg-1",
          "timestamp": "2025-10-18T09:55:00.000Z",
          "type": "user",
          "content": "Hello"
        }, {
          "id": "msg-2",
          "timestamp": "2025-10-18T10:20:00.000Z",
          "type": "gemini",
          "content": "Response"
        }]
      }`;

      const result = provider.parse(sessionWithEarlierMessageTimestamp);

      // firstTimestamp should use earliest message timestamp (earlier than session.startTime)
      expect(result.metadata.firstTimestamp).toBe("2025-10-18T09:55:00.000Z");
      // lastTimestamp should use latest message timestamp (later than session.lastUpdated)
      expect(result.metadata.lastTimestamp).toBe("2025-10-18T10:20:00.000Z");
    });
  });
});
