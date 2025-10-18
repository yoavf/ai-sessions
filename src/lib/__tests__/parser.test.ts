import { describe, expect, it } from "vitest";
import { generateDefaultTitle, isUuidOrSessionId } from "../parser";

describe("Parser Utilities", () => {
  describe("generateDefaultTitle", () => {
    it("should generate title for Claude Code", () => {
      const date = new Date("2025-10-18T12:00:00Z");
      const title = generateDefaultTitle("claude-code", date);
      expect(title).toBe("Claude Code - October 18, 2025");
    });

    it("should generate title for Codex", () => {
      const date = new Date("2025-10-18T12:00:00Z");
      const title = generateDefaultTitle("codex", date);
      expect(title).toBe("Codex - October 18, 2025");
    });

    it("should generate title for Gemini CLI", () => {
      const date = new Date("2025-10-18T12:00:00Z");
      const title = generateDefaultTitle("gemini-cli", date);
      expect(title).toBe("Gemini CLI - October 18, 2025");
    });

    it("should handle unknown source gracefully", () => {
      const date = new Date("2025-10-18T12:00:00Z");
      const title = generateDefaultTitle("unknown-source", date);
      expect(title).toBe("unknown-source - October 18, 2025");
    });

    it("should format dates correctly", () => {
      const date = new Date("2025-01-01T00:00:00Z");
      const title = generateDefaultTitle("claude-code", date);
      expect(title).toContain("January 1, 2025");
    });
  });

  describe("isUuidOrSessionId", () => {
    describe("should return true for empty/null/undefined", () => {
      it("null", () => {
        expect(isUuidOrSessionId(null)).toBe(true);
      });

      it("undefined", () => {
        expect(isUuidOrSessionId(undefined)).toBe(true);
      });

      it("empty string", () => {
        expect(isUuidOrSessionId("")).toBe(true);
      });
    });

    describe("should return true for pure UUIDs", () => {
      it("standard UUID format", () => {
        expect(isUuidOrSessionId("8c7df8a4-37a0-4731-939e-3e64abe0dc09")).toBe(
          true,
        );
      });

      it("UUID with uppercase", () => {
        expect(isUuidOrSessionId("8C7DF8A4-37A0-4731-939E-3E64ABE0DC09")).toBe(
          true,
        );
      });

      it("another valid UUID", () => {
        expect(isUuidOrSessionId("550e8400-e29b-41d4-a716-446655440000")).toBe(
          true,
        );
      });
    });

    describe("should return true for filenames containing UUIDs", () => {
      it("timestamp and UUID filename", () => {
        expect(
          isUuidOrSessionId(
            "rollout-2025-10-11T10-35-38-0199d232-56ac-7051-a042-8b140c0d4aed",
          ),
        ).toBe(true);
      });

      it("prefix with UUID", () => {
        expect(
          isUuidOrSessionId("session-8c7df8a4-37a0-4731-939e-3e64abe0dc09"),
        ).toBe(true);
      });

      it("UUID with suffix", () => {
        expect(
          isUuidOrSessionId("8c7df8a4-37a0-4731-939e-3e64abe0dc09-backup"),
        ).toBe(true);
      });
    });

    describe("should return true for timestamp-heavy filenames", () => {
      it("ISO timestamp with T separator", () => {
        expect(isUuidOrSessionId("2025-10-11T10-35-38")).toBe(true);
      });

      it("timestamp with hyphens", () => {
        expect(isUuidOrSessionId("2025-10-11-10-35-38")).toBe(true);
      });

      it("timestamp with underscores", () => {
        expect(isUuidOrSessionId("2025-10-11_10:35:38")).toBe(true);
      });

      it("filename with timestamp prefix", () => {
        expect(isUuidOrSessionId("backup-2025-10-11T14-30-45")).toBe(true);
      });

      it("complex filename with timestamp and text", () => {
        expect(
          isUuidOrSessionId("rollout-2025-10-11T10-35-38-production"),
        ).toBe(true);
      });
    });

    describe("should return false for meaningful titles", () => {
      it("descriptive title", () => {
        expect(isUuidOrSessionId("Fix authentication bug")).toBe(false);
      });

      it("feature description", () => {
        expect(isUuidOrSessionId("Add dark mode support")).toBe(false);
      });

      it("short title", () => {
        expect(isUuidOrSessionId("README")).toBe(false);
      });

      it("title with spaces", () => {
        expect(isUuidOrSessionId("My Project Session")).toBe(false);
      });

      it("title with numbers (not UUID or timestamp)", () => {
        expect(isUuidOrSessionId("Update version 2.0")).toBe(false);
      });

      it("simple date without time", () => {
        expect(isUuidOrSessionId("2025-10-18")).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should handle UUID-like but invalid format", () => {
        // Not a valid UUID (wrong segment lengths)
        expect(isUuidOrSessionId("8c7df8a4-37a0-4731-939e-3e64abe0dc09a")).toBe(
          true,
        ); // Still contains UUID pattern
      });

      it("should not match short hyphenated strings", () => {
        expect(isUuidOrSessionId("some-file-name")).toBe(false);
      });

      it("should not match version numbers", () => {
        expect(isUuidOrSessionId("v1.2.3")).toBe(false);
      });
    });
  });
});
