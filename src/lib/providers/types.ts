/**
 * Provider interface for parsing different transcript formats
 */

import type { ParsedTranscript } from "@/types/transcript";

/**
 * Interface that all transcript providers must implement
 */
export interface TranscriptProvider {
  /**
   * Unique identifier for this provider
   */
  readonly name: string;

  /**
   * Display name for UI (e.g., "Claude Code", "Codex")
   */
  readonly displayName: string;

  /**
   * Detect if the given content matches this provider's format
   * @param content Raw JSONL content
   * @returns true if this provider can parse the content
   */
  detect(content: string): boolean;

  /**
   * Parse the transcript content into a unified format
   * @param content Raw JSONL content
   * @returns Parsed transcript
   * @throws Error if parsing fails
   */
  parse(content: string): ParsedTranscript;

  /**
   * Format a model ID into a human-readable name (optional)
   * @param modelId Raw model identifier
   * @returns Formatted model name or null to use default formatting
   */
  formatModelName?(modelId: string): string | null;
}

/**
 * Result of provider detection with confidence level
 */
export interface DetectionResult {
  provider: string;
  confidence: "high" | "medium" | "low";
}
