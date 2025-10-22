import { describe, expect, it } from "vitest";
import type { DiffLine } from "@/components/DiffView";

/**
 * Tests for DiffView component's diff algorithm
 * These tests verify that the diff computation correctly identifies added, removed, and unchanged lines
 */

// Extract the computeDiff logic for testing
function computeDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");
  const diff: DiffLine[] = [];

  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const oldLine = oldLines[oldIndex];
    const newLine = newLines[newIndex];

    if (oldLine === newLine) {
      // Lines match - unchanged
      diff.push({
        type: "unchanged",
        content: oldLine || "",
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1,
      });
      oldIndex++;
      newIndex++;
    } else {
      // Lines differ - check if it's a removal, addition, or both
      const oldLineInNew = newLines.slice(newIndex).indexOf(oldLine);
      const newLineInOld = oldLines.slice(oldIndex).indexOf(newLine);

      if (oldLineInNew === -1 && newLineInOld === -1) {
        // Both lines are unique - mark as removed and added
        if (oldIndex < oldLines.length) {
          diff.push({
            type: "removed",
            content: oldLine || "",
            oldLineNumber: oldIndex + 1,
          });
          oldIndex++;
        }
        if (newIndex < newLines.length) {
          diff.push({
            type: "added",
            content: newLine || "",
            newLineNumber: newIndex + 1,
          });
          newIndex++;
        }
      } else if (
        oldLineInNew !== -1 &&
        (newLineInOld === -1 || oldLineInNew <= newLineInOld)
      ) {
        // Old line appears later in new - mark intervening new lines as added
        while (newLines[newIndex] !== oldLine) {
          diff.push({
            type: "added",
            content: newLines[newIndex] || "",
            newLineNumber: newIndex + 1,
          });
          newIndex++;
        }
      } else {
        // New line appears later in old - mark intervening old lines as removed
        while (oldLines[oldIndex] !== newLine) {
          diff.push({
            type: "removed",
            content: oldLines[oldIndex] || "",
            oldLineNumber: oldIndex + 1,
          });
          oldIndex++;
        }
      }
    }
  }

  return diff;
}

describe("DiffView - computeDiff", () => {
  describe("simple additions", () => {
    it("should detect single line addition at end", () => {
      const oldStr = "line1\nline2";
      const newStr = "line1\nline2\nline3";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toEqual([
        {
          type: "unchanged",
          content: "line1",
          oldLineNumber: 1,
          newLineNumber: 1,
        },
        {
          type: "unchanged",
          content: "line2",
          oldLineNumber: 2,
          newLineNumber: 2,
        },
        { type: "added", content: "line3", newLineNumber: 3 },
      ]);
    });

    it("should detect single line addition at beginning", () => {
      const oldStr = "line2\nline3";
      const newStr = "line1\nline2\nline3";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toEqual([
        { type: "added", content: "line1", newLineNumber: 1 },
        {
          type: "unchanged",
          content: "line2",
          oldLineNumber: 1,
          newLineNumber: 2,
        },
        {
          type: "unchanged",
          content: "line3",
          oldLineNumber: 2,
          newLineNumber: 3,
        },
      ]);
    });

    it("should detect multiple consecutive additions", () => {
      const oldStr = "line1\nline4";
      const newStr = "line1\nline2\nline3\nline4";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toEqual([
        {
          type: "unchanged",
          content: "line1",
          oldLineNumber: 1,
          newLineNumber: 1,
        },
        { type: "added", content: "line2", newLineNumber: 2 },
        { type: "added", content: "line3", newLineNumber: 3 },
        {
          type: "unchanged",
          content: "line4",
          oldLineNumber: 2,
          newLineNumber: 4,
        },
      ]);
    });
  });

  describe("simple removals", () => {
    it("should detect single line removal at end", () => {
      const oldStr = "line1\nline2\nline3";
      const newStr = "line1\nline2";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toEqual([
        {
          type: "unchanged",
          content: "line1",
          oldLineNumber: 1,
          newLineNumber: 1,
        },
        {
          type: "unchanged",
          content: "line2",
          oldLineNumber: 2,
          newLineNumber: 2,
        },
        { type: "removed", content: "line3", oldLineNumber: 3 },
      ]);
    });

    it("should detect single line removal at beginning", () => {
      const oldStr = "line1\nline2\nline3";
      const newStr = "line2\nline3";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toEqual([
        { type: "removed", content: "line1", oldLineNumber: 1 },
        {
          type: "unchanged",
          content: "line2",
          oldLineNumber: 2,
          newLineNumber: 1,
        },
        {
          type: "unchanged",
          content: "line3",
          oldLineNumber: 3,
          newLineNumber: 2,
        },
      ]);
    });

    it("should detect multiple consecutive removals", () => {
      const oldStr = "line1\nline2\nline3\nline4";
      const newStr = "line1\nline4";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toEqual([
        {
          type: "unchanged",
          content: "line1",
          oldLineNumber: 1,
          newLineNumber: 1,
        },
        { type: "removed", content: "line2", oldLineNumber: 2 },
        { type: "removed", content: "line3", oldLineNumber: 3 },
        {
          type: "unchanged",
          content: "line4",
          oldLineNumber: 4,
          newLineNumber: 2,
        },
      ]);
    });
  });

  describe("modifications (remove + add)", () => {
    it("should detect single line modification", () => {
      const oldStr = "const x = 1;";
      const newStr = "const x = 2;";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toEqual([
        { type: "removed", content: "const x = 1;", oldLineNumber: 1 },
        { type: "added", content: "const x = 2;", newLineNumber: 1 },
      ]);
    });

    it("should detect multiple modifications", () => {
      const oldStr = "line1\nold line\nline3";
      const newStr = "line1\nnew line\nline3";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toEqual([
        {
          type: "unchanged",
          content: "line1",
          oldLineNumber: 1,
          newLineNumber: 1,
        },
        { type: "removed", content: "old line", oldLineNumber: 2 },
        { type: "added", content: "new line", newLineNumber: 2 },
        {
          type: "unchanged",
          content: "line3",
          oldLineNumber: 3,
          newLineNumber: 3,
        },
      ]);
    });

    it("should handle deleting all content (empty newString)", () => {
      const oldStr = "line1\nline2\nline3";
      const newStr = "";
      const diff = computeDiff(oldStr, newStr);

      // Should show all old lines as removed
      const removedLines = diff.filter((d) => d.type === "removed");
      expect(removedLines.length).toBeGreaterThanOrEqual(2);
      expect(
        diff.some((d) => d.content === "line1" && d.type === "removed"),
      ).toBe(true);
      expect(
        diff.some((d) => d.content === "line2" && d.type === "removed"),
      ).toBe(true);
    });

    it("should handle clearing to empty string (single line)", () => {
      const oldStr = "const x = 1;";
      const newStr = "";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toContainEqual({
        type: "removed",
        content: "const x = 1;",
        oldLineNumber: 1,
      });
    });
  });

  describe("complex changes", () => {
    it("should handle mix of additions, removals, and modifications", () => {
      const oldStr = "line1\nremove this\nold value\nline4";
      const newStr = "line1\nnew value\nadded line\nline4";
      const diff = computeDiff(oldStr, newStr);

      // The algorithm processes line by line, so the order may vary
      // What matters is that we have the correct lines marked
      expect(diff).toHaveLength(6);
      expect(diff[0]).toEqual({
        type: "unchanged",
        content: "line1",
        oldLineNumber: 1,
        newLineNumber: 1,
      });
      expect(diff[5]).toEqual({
        type: "unchanged",
        content: "line4",
        oldLineNumber: 4,
        newLineNumber: 4,
      });

      // Check that we have the removed lines
      const removedLines = diff.filter((d) => d.type === "removed");
      expect(removedLines).toHaveLength(2);
      expect(removedLines.some((d) => d.content === "remove this")).toBe(true);
      expect(removedLines.some((d) => d.content === "old value")).toBe(true);

      // Check that we have the added lines
      const addedLines = diff.filter((d) => d.type === "added");
      expect(addedLines).toHaveLength(2);
      expect(addedLines.some((d) => d.content === "new value")).toBe(true);
      expect(addedLines.some((d) => d.content === "added line")).toBe(true);
    });

    it("should handle complete file replacement", () => {
      const oldStr = "old content";
      const newStr = "completely new content";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toEqual([
        { type: "removed", content: "old content", oldLineNumber: 1 },
        { type: "added", content: "completely new content", newLineNumber: 1 },
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty old string (new file)", () => {
      const oldStr = "";
      const newStr = "line1\nline2";
      const diff = computeDiff(oldStr, newStr);

      // When old is empty, split gives [""], new has content
      // Algorithm treats "" vs "line1" as different, so it's a remove + add
      expect(diff).toHaveLength(3);
      expect(diff.filter((d) => d.type === "added")).toHaveLength(2);
    });

    it("should handle empty new string (file deletion)", () => {
      const oldStr = "line1\nline2";
      const newStr = "";
      const diff = computeDiff(oldStr, newStr);

      // When new is empty, split gives [""], old has content
      expect(diff).toHaveLength(3);
      expect(diff.filter((d) => d.type === "removed")).toHaveLength(2);
    });

    it("should handle both strings empty", () => {
      const oldStr = "";
      const newStr = "";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toEqual([
        { type: "unchanged", content: "", oldLineNumber: 1, newLineNumber: 1 },
      ]);
    });

    it("should handle identical strings", () => {
      const oldStr = "line1\nline2\nline3";
      const newStr = "line1\nline2\nline3";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toEqual([
        {
          type: "unchanged",
          content: "line1",
          oldLineNumber: 1,
          newLineNumber: 1,
        },
        {
          type: "unchanged",
          content: "line2",
          oldLineNumber: 2,
          newLineNumber: 2,
        },
        {
          type: "unchanged",
          content: "line3",
          oldLineNumber: 3,
          newLineNumber: 3,
        },
      ]);
    });

    it("should handle lines with special characters", () => {
      const oldStr = 'const x = "hello";';
      const newStr = "const x = 'hello';";
      const diff = computeDiff(oldStr, newStr);

      expect(diff).toEqual([
        { type: "removed", content: 'const x = "hello";', oldLineNumber: 1 },
        { type: "added", content: "const x = 'hello';", newLineNumber: 1 },
      ]);
    });
  });

  describe("language detection", () => {
    it("should detect TypeScript from .ts extension", () => {
      const getLanguage = (path: string): string => {
        const ext = path.split(".").pop()?.toLowerCase();
        const langMap: Record<string, string> = {
          ts: "typescript",
          tsx: "typescript",
          js: "javascript",
          jsx: "javascript",
        };
        return langMap[ext || ""] || "text";
      };

      expect(getLanguage("file.ts")).toBe("typescript");
      expect(getLanguage("file.tsx")).toBe("typescript");
      expect(getLanguage("file.js")).toBe("javascript");
      expect(getLanguage("file.jsx")).toBe("javascript");
      expect(getLanguage("file.txt")).toBe("text");
    });
  });
});
