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
import { geminiSample } from "./fixtures/gemini-sample";

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

  describe("Gemini Provider Integration", () => {
    describe("getProviderByName", () => {
      it("should return Gemini provider", () => {
        const provider = getProviderByName("gemini-cli");
        expect(provider).toBeDefined();
        expect(provider?.name).toBe("gemini-cli");
        expect(provider?.displayName).toBe("Gemini CLI");
      });
    });

    describe("detectProvider", () => {
      it("should detect Gemini format via detectProvider", () => {
        const result = detectProvider(geminiSample);
        expect(result.provider).toBe("gemini-cli");
        expect(result.confidence).toBe("high");
      });

      it("should not misdetect Gemini as Claude Code", () => {
        const claudeProvider = getProviderByName("claude-code");
        const geminiProvider = getProviderByName("gemini-cli");

        expect(claudeProvider?.detect(geminiSample)).toBe(false);
        expect(geminiProvider?.detect(geminiSample)).toBe(true);
      });

      it("should not misdetect Gemini as Codex", () => {
        const codexProvider = getProviderByName("codex");
        const geminiProvider = getProviderByName("gemini-cli");

        expect(codexProvider?.detect(geminiSample)).toBe(false);
        expect(geminiProvider?.detect(geminiSample)).toBe(true);
      });

      it("should not misdetect Claude Code as Gemini", () => {
        const geminiProvider = getProviderByName("gemini-cli");

        expect(geminiProvider?.detect(claudeCodeSample)).toBe(false);
      });

      it("should not misdetect Codex as Gemini", () => {
        const geminiProvider = getProviderByName("gemini-cli");

        expect(geminiProvider?.detect(codexOlderFormat)).toBe(false);
      });
    });

    describe("parseTranscript", () => {
      it("should parse Gemini transcript via parseTranscript", () => {
        const result = parseTranscript(geminiSample);

        expect(result.sessionId).toBe("f86f5318-f47b-4433-85f8-ec9d9a417f8e");
        expect(result.messages.length).toBeGreaterThan(0);
      });

      it("should parse Gemini transcript with provider hint", () => {
        const result = parseTranscript(geminiSample, "gemini-cli");

        expect(result.sessionId).toBe("f86f5318-f47b-4433-85f8-ec9d9a417f8e");
        expect(result.messages.length).toBeGreaterThan(0);
      });

      it("should extract correct metadata from Gemini transcript", () => {
        const result = parseTranscript(geminiSample);

        expect(result.metadata.messageCount).toBeGreaterThan(0);
        expect(result.metadata.firstTimestamp).toBeDefined();
        expect(result.metadata.lastTimestamp).toBeDefined();
      });
    });

    describe("calculateModelStats", () => {
      it("should calculate model statistics for Gemini transcripts", () => {
        const transcript = parseTranscript(geminiSample);
        const stats = calculateModelStats(transcript, "gemini-cli");

        expect(stats.length).toBeGreaterThan(0);
        expect(stats.some((s) => s.model.includes("Gemini"))).toBe(true);
      });

      it("should format Gemini model names correctly", () => {
        const transcript = parseTranscript(geminiSample);
        const stats = calculateModelStats(transcript, "gemini-cli");

        // Should have formatted Gemini model names like "Gemini 2.5 Pro"
        const hasFormattedNames = stats.some((s) =>
          /Gemini \d+\.\d+ \w+/.test(s.model),
        );

        expect(hasFormattedNames).toBe(true);
      });

      it("should calculate percentages correctly for Gemini models", () => {
        const transcript = parseTranscript(geminiSample);
        const stats = calculateModelStats(transcript, "gemini-cli");

        // Sum of percentages should be approximately 100
        const totalPercentage = stats.reduce(
          (sum, stat) => sum + stat.percentage,
          0,
        );
        expect(totalPercentage).toBeGreaterThanOrEqual(99);
        expect(totalPercentage).toBeLessThanOrEqual(100);
      });
    });
  });
});
