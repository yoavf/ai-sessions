/**
 * Mistral Vibe provider tests
 */

import { describe, expect, test } from "vitest";
import { calculateTokenCounts } from "../index";
import { MistralVibeProvider } from "../mistral-vibe";
import { MISTRAL_VIBE_SAMPLE } from "./fixtures/mistral-vibe-sample";

describe("MistralVibeProvider", () => {
  const provider = new MistralVibeProvider();

  test("should detect Mistral Vibe format", () => {
    expect(provider.detect(MISTRAL_VIBE_SAMPLE)).toBe(true);
  });

  test("should not detect non-Mistral Vibe content", () => {
    expect(provider.detect("invalid json")).toBe(false);
    expect(provider.detect("[]")).toBe(false);
    expect(provider.detect('{"messages": []}')).toBe(false);
  });

  test("should parse Mistral Vibe session correctly", () => {
    const result = provider.parse(MISTRAL_VIBE_SAMPLE);

    expect(result.messages.length).toBe(4); // 2 user + 2 assistant messages
    expect(result.sessionId).toBe("test-session-123");
    expect(result.cwd).toBe("/test/project");
    expect(result.metadata.messageCount).toBe(4);

    // Check first user message
    const firstMessage = result.messages[0];
    expect(firstMessage.type).toBe("user");
    expect(firstMessage.message?.role).toBe("user");
    expect(firstMessage.message?.content).toEqual([
      { type: "text", text: "Hello, can you help me with this project?" },
    ]);

    // Check assistant message with tool call
    const assistantMessage = result.messages[1];
    expect(assistantMessage.type).toBe("assistant");
    expect(assistantMessage.message?.role).toBe("assistant");
    expect(assistantMessage.message?.model).toBe("devstral-2");

    const assistantContent = assistantMessage.message?.content;
    expect(Array.isArray(assistantContent)).toBe(true);
    expect(assistantContent).toHaveLength(2); // text + tool_use

    const textBlock = assistantContent?.find((b) => b.type === "text") as any;
    expect(textBlock.text).toContain("Sure, I can help with that");

    const toolUseBlock = assistantContent?.find(
      (b) => b.type === "tool_use",
    ) as any;
    expect(toolUseBlock).toBeDefined();
    expect(toolUseBlock.name).toBe("read_file");
    expect(toolUseBlock.input.path).toBe("package.json");

    // Check user message with tool result
    const toolResultMessage = result.messages[2];
    expect(toolResultMessage.type).toBe("user");
    expect(toolResultMessage.message?.role).toBe("user");

    const toolResultContent = toolResultMessage.message?.content;
    expect(Array.isArray(toolResultContent)).toBe(true);
    expect(toolResultContent).toHaveLength(2); // text + tool_result

    const toolResultBlock = toolResultContent?.find(
      (b) => b.type === "tool_result",
    ) as any;
    expect(toolResultBlock).toBeDefined();
    expect(toolResultBlock.tool_use_id).toBe("tool-1");
    expect(toolResultBlock.content).toContain('"name": "test-project"');
  });

  test("should format model names correctly", () => {
    expect(provider.formatModelName("devstral-2")).toBe("Devstral 2");
    expect(provider.formatModelName("mistral-vibe-cli-latest")).toBe(
      "Mistral Vibe CLI",
    );
    expect(provider.formatModelName("devstral-small-latest")).toBe(
      "Devstral Small",
    );
    expect(provider.formatModelName("unknown-model")).toBe("unknown-model");
    expect(provider.formatModelName("")).toBeNull();
  });

  test("should handle empty or invalid content", () => {
    expect(() => provider.parse("invalid json")).toThrow();
    expect(() => provider.parse("[]")).toThrow();
  });
});

describe("Mistral Vibe token counting", () => {
  test("should extract token counts from Mistral Vibe session", () => {
    const result = calculateTokenCounts(MISTRAL_VIBE_SAMPLE, "mistral-vibe");

    expect(result).not.toBeNull();
    expect(result?.inputTokens).toBe(1000);
    expect(result?.outputTokens).toBe(500);
    expect(result?.totalTokens).toBe(1500);
  });

  test("should return null for invalid Mistral Vibe content", () => {
    const result = calculateTokenCounts("{}", "mistral-vibe");
    expect(result).toBeNull();
  });

  test("should return null for content without stats", () => {
    const contentWithoutStats = `{
      "metadata": {
        "session_id": "test",
        "start_time": "2025-01-01T00:00:00"
      },
      "messages": []
    }`;
    const result = calculateTokenCounts(contentWithoutStats, "mistral-vibe");
    expect(result).toBeNull();
  });
});
