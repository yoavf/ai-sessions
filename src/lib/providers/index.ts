/**
 * Provider registry and factory for transcript parsing
 */

import type { ParsedTranscript } from "@/types/transcript";
import { ClaudeCodeProvider } from "./claude-code";
import { CodexProvider } from "./codex";
import { GeminiProvider } from "./gemini";
import type { DetectionResult, TranscriptProvider } from "./types";

/**
 * Registry of all available providers
 */
const providers: TranscriptProvider[] = [
  new ClaudeCodeProvider(),
  new CodexProvider(),
  new GeminiProvider(),
];

/**
 * Get provider by name
 */
export function getProviderByName(name: string): TranscriptProvider | null {
  return providers.find((p) => p.name === name) || null;
}

/**
 * Get all available provider names
 */
export function getAvailableProviders(): string[] {
  return providers.map((p) => p.name);
}

/**
 * Detect which provider should be used for the given content
 * Returns the first provider that reports it can handle the content
 */
export function detectProvider(content: string): DetectionResult {
  const detectionErrors: Array<{ provider: string; error: string }> = [];

  // Try each provider's detect method
  for (const provider of providers) {
    try {
      if (provider.detect(content)) {
        return {
          provider: provider.name,
          confidence: "high",
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Provider ${provider.name} detection failed:`, error);
      detectionErrors.push({ provider: provider.name, error: errorMsg });
    }
  }

  // Log if all providers failed
  if (detectionErrors.length === providers.length) {
    console.error("All providers failed detection", { detectionErrors });
  }

  // Fallback to claude-code with low confidence
  return {
    provider: "claude-code",
    confidence: "low",
    detectionErrors: detectionErrors.length > 0 ? detectionErrors : undefined,
  };
}

/**
 * Parse transcript content using the appropriate provider
 * @param content Raw JSONL content
 * @param providerHint Optional hint about which provider to use (from database)
 * @returns Parsed transcript
 */
export function parseTranscript(
  content: string,
  providerHint?: string,
): ParsedTranscript {
  let provider: TranscriptProvider | null = null;

  // Use hint if provided
  if (providerHint) {
    provider = getProviderByName(providerHint);
  }

  // Fall back to auto-detection
  if (!provider) {
    const detection = detectProvider(content);
    provider = getProviderByName(detection.provider);
  }

  // Final fallback to claude-code
  if (!provider) {
    provider = new ClaudeCodeProvider();
  }

  try {
    return provider.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse transcript with ${provider.name} provider: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Calculate model usage statistics from transcript messages
 * Works with any provider's parsed transcript
 */
export function calculateModelStats(
  transcript: ParsedTranscript,
  providerHint?: string,
): {
  model: string;
  count: number;
  percentage: number;
}[] {
  const modelCounts = new Map<string, number>();
  let totalWithModel = 0;

  // Get provider for model name formatting
  const provider = providerHint ? getProviderByName(providerHint) : null;

  // Count messages by model (only assistant messages with model metadata)
  for (const line of transcript.messages) {
    if (line.message?.role === "assistant" && line.message.model) {
      let friendlyName: string | null = null;

      // Try provider-specific formatting first
      if (provider?.formatModelName) {
        friendlyName = provider.formatModelName(line.message.model);
      }

      // Fall back to raw model ID if no formatter or it returned null
      if (!friendlyName || friendlyName === line.message.model) {
        // Skip synthetic models
        if (
          line.message.model === "<synthetic>" ||
          line.message.model.includes("synthetic")
        ) {
          continue;
        }
        friendlyName = line.message.model;
      }

      modelCounts.set(friendlyName, (modelCounts.get(friendlyName) || 0) + 1);
      totalWithModel++;
    }
  }

  // Convert to array and calculate percentages
  const stats = Array.from(modelCounts.entries())
    .map(([model, count]) => ({
      model,
      count,
      percentage: Math.round((count / totalWithModel) * 100),
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

  return stats;
}

// Export providers and types
export { ClaudeCodeProvider } from "./claude-code";
export { CodexProvider } from "./codex";
export { GeminiProvider } from "./gemini";
export type { DetectionResult, TranscriptProvider } from "./types";
