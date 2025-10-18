import { describe, expect, it } from "vitest";
import {
  calculateModelStats,
  detectProvider,
  getAvailableProviders,
  getProviderByName,
  parseTranscript,
} from "../index";
import { claudeCodeSample } from "./fixtures/claude-code-sample";
import { codexOlderFormat } from "./fixtures/codex-sample";

describe("Provider Registry", () => {
  describe("getProviderByName", () => {
    it("should return Claude Code provider", () => {
      const provider = getProviderByName("claude-code");
      expect(provider).toBeDefined();
      expect(provider?.name).toBe("claude-code");
    });

    it("should return Codex provider", () => {
      const provider = getProviderByName("codex");
      expect(provider).toBeDefined();
      expect(provider?.name).toBe("codex");
    });

    it("should return null for unknown provider", () => {
      const provider = getProviderByName("unknown");
      expect(provider).toBeNull();
    });
  });

  describe("getAvailableProviders", () => {
    it("should return list of available providers", () => {
      const providers = getAvailableProviders();
      expect(providers).toContain("claude-code");
      expect(providers).toContain("codex");
      expect(providers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("detectProvider", () => {
    it("should detect Claude Code format", () => {
      const result = detectProvider(claudeCodeSample);
      expect(result.provider).toBe("claude-code");
      expect(result.confidence).toBe("high");
    });

    it("should detect Codex format", () => {
      const result = detectProvider(codexOlderFormat);
      expect(result.provider).toBe("codex");
      expect(result.confidence).toBe("high");
    });

    it("should fallback to claude-code with low confidence for unknown", () => {
      const result = detectProvider('{"unknown":"format"}');
      expect(result.provider).toBe("claude-code");
      expect(result.confidence).toBe("low");
    });
  });

  describe("parseTranscript", () => {
    it("should parse Claude Code transcript", () => {
      const result = parseTranscript(claudeCodeSample);

      expect(result.sessionId).toBe("test-session-123");
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it("should parse Codex transcript", () => {
      const result = parseTranscript(codexOlderFormat);

      expect(result.sessionId).toBe("test-session-789");
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it("should use provider hint when provided", () => {
      const result = parseTranscript(claudeCodeSample, "claude-code");

      expect(result.sessionId).toBe("test-session-123");
    });

    it("should handle invalid content gracefully", () => {
      // Suppress expected console errors
      const consoleError = console.error;
      console.error = () => {};

      const result = parseTranscript("not valid json at all");

      // Should return empty result rather than throwing
      expect(result.messages).toEqual([]);

      console.error = consoleError;
    });
  });

  describe("calculateModelStats", () => {
    it("should calculate model statistics", () => {
      const transcript = parseTranscript(claudeCodeSample);
      const stats = calculateModelStats(transcript);

      expect(Array.isArray(stats)).toBe(true);
    });

    it("should format model names using provider", () => {
      const transcript = parseTranscript(claudeCodeSample);
      const stats = calculateModelStats(transcript, "claude-code");

      // Should have formatted Claude model names
      const hasFormattedNames = stats.some(
        (s) => s.model.includes("Claude") && s.model.includes("Sonnet"),
      );

      if (stats.length > 0) {
        expect(hasFormattedNames).toBe(true);
      }
    });

    it("should return empty array for transcript with no models", () => {
      const emptyTranscript = {
        messages: [],
        sessionId: "",
        metadata: {
          firstTimestamp: "",
          lastTimestamp: "",
          messageCount: 0,
          cwd: "",
        },
      };

      const stats = calculateModelStats(emptyTranscript);
      expect(stats).toEqual([]);
    });
  });
});
