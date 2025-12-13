/**
 * Copilot CLI provider tests
 */

import { describe, expect, test } from "vitest";
import { CopilotCliProvider } from "../copilot-cli";
import {
  COPILOT_CLI_MODEL_CHANGE_SAMPLE,
  COPILOT_CLI_REPORT_INTENT_SAMPLE,
  COPILOT_CLI_SAMPLE,
} from "./fixtures/copilot-cli-sample";

describe("CopilotCliProvider", () => {
  const provider = new CopilotCliProvider();

  describe("detection", () => {
    test("should detect Copilot CLI format by producer", () => {
      expect(provider.detect(COPILOT_CLI_SAMPLE)).toBe(true);
    });

    test("should detect by copilotVersion field", () => {
      const content = JSON.stringify({
        type: "session.start",
        data: { copilotVersion: "0.0.369" },
        id: "1",
        timestamp: "2025-01-01T00:00:00Z",
        parentId: null,
      });
      expect(provider.detect(content)).toBe(true);
    });

    test("should detect by session.model_change event", () => {
      const content = JSON.stringify({
        type: "session.model_change",
        data: { newModel: "gpt-5" },
        id: "1",
        timestamp: "2025-01-01T00:00:00Z",
        parentId: null,
      });
      expect(provider.detect(content)).toBe(true);
    });

    test("should not detect non-Copilot content", () => {
      expect(provider.detect("invalid json")).toBe(false);
      expect(provider.detect("[]")).toBe(false);
      expect(provider.detect('{"messages": []}')).toBe(false);
    });

    test("should not detect Claude Code format", () => {
      const claudeContent = JSON.stringify({
        type: "user",
        message: { role: "user", content: "Hello" },
        uuid: "abc",
      });
      expect(provider.detect(claudeContent)).toBe(false);
    });
  });

  describe("parsing", () => {
    test("should parse Copilot CLI session correctly", () => {
      const result = provider.parse(COPILOT_CLI_SAMPLE);

      expect(result.sessionId).toBe("test-session-abc123");
      expect(result.cwd).toBe("/Users/test/dev/project");
      expect(result.messages.length).toBeGreaterThan(0);
    });

    test("should extract session ID from session.start", () => {
      const result = provider.parse(COPILOT_CLI_SAMPLE);
      expect(result.sessionId).toBe("test-session-abc123");
    });

    test("should extract cwd from folder_trust message", () => {
      const result = provider.parse(COPILOT_CLI_SAMPLE);
      expect(result.cwd).toBe("/Users/test/dev/project");
    });

    test("should parse user messages", () => {
      const result = provider.parse(COPILOT_CLI_SAMPLE);

      const userMessages = result.messages.filter((m) => m.type === "user");
      expect(userMessages.length).toBe(1);
      expect(userMessages[0].message?.content).toBe(
        "Help me improve this code",
      );
    });

    test("should parse assistant messages with text content", () => {
      const result = provider.parse(COPILOT_CLI_SAMPLE);

      const assistantMessages = result.messages.filter(
        (m) => m.type === "assistant",
      );
      expect(assistantMessages.length).toBeGreaterThan(0);

      const firstAssistant = assistantMessages[0];
      expect(firstAssistant.message?.role).toBe("assistant");

      const content = firstAssistant.message?.content;
      expect(Array.isArray(content)).toBe(true);
      if (Array.isArray(content)) {
        const textBlock = content.find((b) => b.type === "text");
        expect(textBlock).toBeDefined();
      }
    });

    test("should parse tool calls (view, edit)", () => {
      const result = provider.parse(COPILOT_CLI_SAMPLE);

      const assistantMessages = result.messages.filter(
        (m) => m.type === "assistant",
      );

      // Find message with view tool
      const viewMessage = assistantMessages.find((m) => {
        const content = m.message?.content;
        if (!Array.isArray(content)) return false;
        return content.some((b) => b.type === "tool_use" && b.name === "view");
      });
      expect(viewMessage).toBeDefined();

      // Find message with edit tool
      const editMessage = assistantMessages.find((m) => {
        const content = m.message?.content;
        if (!Array.isArray(content)) return false;
        return content.some((b) => b.type === "tool_use" && b.name === "edit");
      });
      expect(editMessage).toBeDefined();

      if (editMessage) {
        const content = editMessage.message?.content;
        if (Array.isArray(content)) {
          const editBlock = content.find(
            (b) => b.type === "tool_use" && b.name === "edit",
          ) as { type: string; input: Record<string, string> };
          expect(editBlock.input.old_str).toBe("const x = 1");
          expect(editBlock.input.new_str).toBe("const count = 1");
        }
      }
    });

    test("should set timestamps correctly", () => {
      const result = provider.parse(COPILOT_CLI_SAMPLE);

      expect(result.metadata.firstTimestamp).toBe("2025-12-13T16:26:51.136Z");
      expect(result.metadata.lastTimestamp).toBe("2025-12-13T16:27:10.000Z");
    });
  });

  describe("report_intent filtering", () => {
    test("should filter out report_intent tool calls", () => {
      const result = provider.parse(COPILOT_CLI_REPORT_INTENT_SAMPLE);

      // Should have user message and assistant message with text, but not the report_intent
      const assistantMessages = result.messages.filter(
        (m) => m.type === "assistant",
      );

      // The message with only report_intent should be filtered out (empty content)
      for (const msg of assistantMessages) {
        const content = msg.message?.content;
        if (Array.isArray(content)) {
          const reportIntent = content.find(
            (b) => b.type === "tool_use" && b.name === "report_intent",
          );
          expect(reportIntent).toBeUndefined();
        }
      }
    });

    test("should not create empty messages after filtering report_intent", () => {
      const result = provider.parse(COPILOT_CLI_REPORT_INTENT_SAMPLE);

      // Check that all assistant messages have content
      const assistantMessages = result.messages.filter(
        (m) => m.type === "assistant",
      );

      for (const msg of assistantMessages) {
        const content = msg.message?.content;
        expect(Array.isArray(content)).toBe(true);
        if (Array.isArray(content)) {
          expect(content.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("model change handling", () => {
    test("should create system_event for model changes", () => {
      const result = provider.parse(COPILOT_CLI_MODEL_CHANGE_SAMPLE);

      // Find the model change event
      const modelChangeEvent = result.messages.find(
        (m) => m.type === "system_event",
      );

      expect(modelChangeEvent).toBeDefined();
      expect(modelChangeEvent?.systemEvent?.eventType).toBe("model_change");
      expect(modelChangeEvent?.systemEvent?.data.newModel).toBe("gpt-5.2");
      expect(modelChangeEvent?.systemEvent?.data.previousModel).toBe(
        "claude-sonnet-4.5",
      );
    });
  });

  describe("error handling", () => {
    test("should handle malformed JSON lines gracefully", () => {
      const contentWithBadLine = [
        JSON.stringify({
          type: "session.start",
          data: {
            sessionId: "test",
            producer: "copilot-agent",
            startTime: "2025-01-01T00:00:00Z",
          },
          id: "1",
          timestamp: "2025-01-01T00:00:00Z",
          parentId: null,
        }),
        "this is not valid json",
        JSON.stringify({
          type: "user.message",
          data: { content: "Hello" },
          id: "2",
          timestamp: "2025-01-01T00:00:01Z",
          parentId: "1",
        }),
      ].join("\n");

      // Should not throw
      const result = provider.parse(contentWithBadLine);

      // Should still parse valid lines
      expect(result.sessionId).toBe("test");
      expect(result.messages.length).toBe(1);
    });

    test("should handle missing fields gracefully", () => {
      const minimalContent = [
        JSON.stringify({
          type: "session.start",
          data: { sessionId: "minimal-test" },
          id: "1",
          timestamp: "2025-01-01T00:00:00Z",
          parentId: null,
        }),
        JSON.stringify({
          type: "user.message",
          data: { content: "Hello" },
          id: "2",
          timestamp: "2025-01-01T00:00:01Z",
          parentId: "1",
        }),
      ].join("\n");

      const result = provider.parse(minimalContent);
      expect(result.sessionId).toBe("minimal-test");
      expect(result.messages.length).toBe(1);
    });
  });

  describe("provider metadata", () => {
    test("should have correct name", () => {
      expect(provider.name).toBe("copilot-cli");
    });

    test("should have correct displayName", () => {
      expect(provider.displayName).toBe("Copilot CLI");
    });
  });
});
