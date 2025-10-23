import { describe, expect, it } from "vitest";
import { calculateTokenCounts } from "../index";

describe("calculateTokenCounts", () => {
  describe("Claude Code", () => {
    it("should extract token counts from assistant messages", () => {
      const content = `{"type":"user","message":{"role":"user","content":"Hello"}}
{"type":"assistant","message":{"role":"assistant","content":"Hi","usage":{"input_tokens":100,"output_tokens":50,"cache_read_input_tokens":0,"cache_creation_input_tokens":0}}}
{"type":"assistant","message":{"role":"assistant","content":"Bye","usage":{"input_tokens":150,"output_tokens":75,"cache_read_input_tokens":20,"cache_creation_input_tokens":10}}}`;

      const result = calculateTokenCounts(content, "claude-code");

      // Total = input (250) + max cache read (20) + output (125) = 395
      expect(result).toEqual({
        inputTokens: 250,
        outputTokens: 125,
        totalTokens: 395,
        cacheReadTokens: 20,
        cacheWriteTokens: 10,
      });
    });

    it("should use max for cumulative cache tokens (not sum)", () => {
      // Claude's API reports cumulative cache tokens, not per-message
      const content = `{"type":"assistant","message":{"role":"assistant","content":"1","usage":{"input_tokens":100,"output_tokens":50,"cache_read_input_tokens":1000,"cache_creation_input_tokens":500}}}
{"type":"assistant","message":{"role":"assistant","content":"2","usage":{"input_tokens":200,"output_tokens":75,"cache_read_input_tokens":1500,"cache_creation_input_tokens":800}}}
{"type":"assistant","message":{"role":"assistant","content":"3","usage":{"input_tokens":300,"output_tokens":100,"cache_read_input_tokens":2000,"cache_creation_input_tokens":1200}}}`;

      const result = calculateTokenCounts(content, "claude-code");

      // Input/output are summed (600, 225)
      // Cache read uses max (2000) not sum (4500)
      // Total = input (600) + max cache read (2000) + output (225) = 2825
      expect(result).toEqual({
        inputTokens: 600,
        outputTokens: 225,
        totalTokens: 2825,
        cacheReadTokens: 2000, // max, not 4500 (sum)
        cacheWriteTokens: 1200, // max, not 2500 (sum)
      });
    });

    it("should handle messages without cache tokens", () => {
      const content = `{"type":"assistant","message":{"role":"assistant","content":"Hi","usage":{"input_tokens":100,"output_tokens":50,"cache_read_input_tokens":0,"cache_creation_input_tokens":0}}}`;

      const result = calculateTokenCounts(content, "claude-code");

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        // No cache tokens because they're 0
      });
    });

    it("should skip non-assistant messages", () => {
      const content = `{"type":"user","message":{"role":"user","content":"Hello"}}
{"type":"assistant","message":{"role":"assistant","content":"Hi","usage":{"input_tokens":100,"output_tokens":50}}}`;

      const result = calculateTokenCounts(content, "claude-code");

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      });
    });

    it("should handle malformed lines gracefully", () => {
      const content = `{"type":"assistant","message":{"role":"assistant","content":"Hi","usage":{"input_tokens":100,"output_tokens":50}}}
this is not json
{"type":"assistant","message":{"role":"assistant","content":"Bye","usage":{"input_tokens":200,"output_tokens":75}}}`;

      const result = calculateTokenCounts(content, "claude-code");

      expect(result).toEqual({
        inputTokens: 300,
        outputTokens: 125,
        totalTokens: 425,
      });
    });

    it("should return null when no token data found", () => {
      const content = `{"type":"user","message":{"role":"user","content":"Hello"}}`;

      const result = calculateTokenCounts(content, "claude-code");

      expect(result).toBeNull();
    });
  });

  describe("Gemini CLI", () => {
    it("should extract token counts from messages array", () => {
      const content = JSON.stringify({
        sessionId: "test-session",
        messages: [
          {
            id: "msg-1",
            type: "user",
            content: "Hello",
          },
          {
            id: "msg-2",
            type: "gemini",
            content: "Hi",
            tokens: {
              input: 100,
              output: 50,
              cached: 20,
              thoughts: 10,
              tool: 5,
              total: 150,
            },
          },
          {
            id: "msg-3",
            type: "gemini",
            content: "Bye",
            tokens: {
              input: 200,
              output: 75,
              cached: 30,
              thoughts: 15,
              tool: 8,
              total: 275,
            },
          },
        ],
      });

      const result = calculateTokenCounts(content, "gemini-cli");

      expect(result).toEqual({
        inputTokens: 300,
        outputTokens: 125,
        totalTokens: 425,
        cacheReadTokens: 50,
        thinkingTokens: 25,
        toolTokens: 13,
      });
    });

    it("should handle messages without optional token fields", () => {
      const content = JSON.stringify({
        messages: [
          {
            id: "msg-1",
            type: "gemini",
            tokens: {
              input: 100,
              output: 50,
              cached: 0,
              thoughts: 0,
              tool: 0,
              total: 150,
            },
          },
        ],
      });

      const result = calculateTokenCounts(content, "gemini-cli");

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        // No optional fields because they're 0
      });
    });

    it("should handle messages without tokens field", () => {
      const content = JSON.stringify({
        messages: [
          {
            id: "msg-1",
            type: "user",
            content: "Hello",
          },
          {
            id: "msg-2",
            type: "gemini",
            content: "Hi",
            tokens: {
              input: 100,
              output: 50,
              total: 150,
            },
          },
        ],
      });

      const result = calculateTokenCounts(content, "gemini-cli");

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      });
    });

    it("should return null for invalid JSON", () => {
      const content = "this is not json";

      const result = calculateTokenCounts(content, "gemini-cli");

      expect(result).toBeNull();
    });

    it("should return null when messages array is missing", () => {
      const content = JSON.stringify({
        sessionId: "test-session",
      });

      const result = calculateTokenCounts(content, "gemini-cli");

      expect(result).toBeNull();
    });

    it("should return null when no token data found", () => {
      const content = JSON.stringify({
        messages: [
          {
            id: "msg-1",
            type: "user",
            content: "Hello",
          },
        ],
      });

      const result = calculateTokenCounts(content, "gemini-cli");

      expect(result).toBeNull();
    });
  });

  describe("Codex", () => {
    it("should extract token counts from last token_count event", () => {
      const content = `{"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":100,"cached_input_tokens":0,"output_tokens":50,"reasoning_output_tokens":10,"total_tokens":150}}}}
{"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":300,"cached_input_tokens":50,"output_tokens":125,"reasoning_output_tokens":25,"total_tokens":425}}}}`;

      const result = calculateTokenCounts(content, "codex");

      expect(result).toEqual({
        inputTokens: 300,
        outputTokens: 125,
        totalTokens: 425,
        cacheReadTokens: 50,
        thinkingTokens: 25,
      });
    });

    it("should handle token_count event without cache/thinking tokens", () => {
      const content = `{"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":100,"cached_input_tokens":0,"output_tokens":50,"reasoning_output_tokens":0,"total_tokens":150}}}}`;

      const result = calculateTokenCounts(content, "codex");

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        // No cache/thinking tokens because they're 0
      });
    });

    it("should skip non-token_count events", () => {
      const content = `{"type":"event_msg","payload":{"type":"other_event"}}
{"type":"response_item","payload":{"content":"Hello"}}
{"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":100,"output_tokens":50,"total_tokens":150}}}}`;

      const result = calculateTokenCounts(content, "codex");

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      });
    });

    it("should handle malformed lines gracefully", () => {
      const content = `this is not json
{"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":100,"output_tokens":50,"total_tokens":150}}}}
another bad line`;

      const result = calculateTokenCounts(content, "codex");

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      });
    });

    it("should return null when no token_count events found", () => {
      const content = `{"type":"event_msg","payload":{"type":"other_event"}}
{"type":"response_item","payload":{"content":"Hello"}}`;

      const result = calculateTokenCounts(content, "codex");

      expect(result).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should return null for unknown provider", () => {
      const content = `{"some":"data"}`;

      const result = calculateTokenCounts(content, "unknown-provider");

      expect(result).toBeNull();
    });

    it("should handle empty content", () => {
      const resultClaudeCode = calculateTokenCounts("", "claude-code");
      const resultGemini = calculateTokenCounts("", "gemini-cli");
      const resultCodex = calculateTokenCounts("", "codex");

      expect(resultClaudeCode).toBeNull();
      expect(resultGemini).toBeNull();
      expect(resultCodex).toBeNull();
    });

    it("should handle whitespace-only content", () => {
      const resultClaudeCode = calculateTokenCounts(
        "   \n\n   ",
        "claude-code",
      );
      const resultGemini = calculateTokenCounts("   \n\n   ", "gemini-cli");
      const resultCodex = calculateTokenCounts("   \n\n   ", "codex");

      expect(resultClaudeCode).toBeNull();
      expect(resultGemini).toBeNull();
      expect(resultCodex).toBeNull();
    });
  });
});
