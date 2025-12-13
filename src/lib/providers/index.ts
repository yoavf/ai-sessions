/**
 * Provider registry and factory for transcript parsing
 */

import { log } from "@/lib/logger";
import type { ParsedTranscript, TokenCounts } from "@/types/transcript";
import { ClaudeCodeProvider } from "./claude-code";
import { CodexProvider } from "./codex";
import { CopilotCliProvider } from "./copilot-cli";
import { GeminiProvider } from "./gemini";
import { MistralVibeProvider } from "./mistral-vibe";
import type { DetectionResult, TranscriptProvider } from "./types";

/**
 * Registry of all available providers
 */
const providers: TranscriptProvider[] = [
  new ClaudeCodeProvider(),
  new CodexProvider(),
  new CopilotCliProvider(),
  new GeminiProvider(),
  new MistralVibeProvider(),
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
      log.error(`Provider ${provider.name} detection failed`, {
        provider: provider.name,
        errorMessage: errorMsg,
      });
      detectionErrors.push({ provider: provider.name, error: errorMsg });
    }
  }

  // Log if all providers failed
  if (detectionErrors.length === providers.length) {
    log.error("All providers failed detection", {
      providerCount: detectionErrors.length,
      errors: detectionErrors
        .map((e) => `${e.provider}: ${e.error}`)
        .join("; "),
    });
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

/**
 * Calculate total token usage from transcript
 * Extracts and aggregates token information from provider-specific formats
 * @param content Raw JSONL/JSON content (needed to extract provider-specific token data)
 * @param providerName Provider name to use correct extraction logic
 * @returns Aggregated token counts or null if no token data available
 */
export function calculateTokenCounts(
  content: string,
  providerName: string,
): TokenCounts | null {
  const lines = content.trim().split("\n");

  if (providerName === "claude-code") {
    // Claude Code: Extract from assistant messages with .message.usage
    let totalInput = 0;
    let totalOutput = 0;
    let maxCacheRead = 0;
    let maxCacheWrite = 0;

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === "assistant" && parsed.message?.usage) {
          const usage = parsed.message.usage;
          totalInput += usage.input_tokens || 0;
          totalOutput += usage.output_tokens || 0;
          // Cache tokens are cumulative in Claude's API, so use max instead of sum
          maxCacheRead = Math.max(
            maxCacheRead,
            usage.cache_read_input_tokens || 0,
          );
          maxCacheWrite = Math.max(
            maxCacheWrite,
            usage.cache_creation_input_tokens || 0,
          );
        }
      } catch {
        // Skip malformed lines
      }
    }

    if (totalInput === 0 && totalOutput === 0) return null;

    return {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      // Total includes all tokens: fresh input + cached input + output
      totalTokens: totalInput + maxCacheRead + totalOutput,
      cacheReadTokens: maxCacheRead > 0 ? maxCacheRead : undefined,
      cacheWriteTokens: maxCacheWrite > 0 ? maxCacheWrite : undefined,
    };
  }

  if (providerName === "gemini-cli") {
    // Gemini: Parse JSON and extract from .messages[].tokens
    try {
      const data = JSON.parse(content);
      if (!data.messages || !Array.isArray(data.messages)) return null;

      let totalInput = 0;
      let totalOutput = 0;
      let totalCached = 0;
      let totalThinking = 0;
      let totalTool = 0;

      for (const message of data.messages) {
        if (message.tokens) {
          totalInput += message.tokens.input || 0;
          totalOutput += message.tokens.output || 0;
          totalCached += message.tokens.cached || 0;
          totalThinking += message.tokens.thoughts || 0;
          totalTool += message.tokens.tool || 0;
        }
      }

      if (totalInput === 0 && totalOutput === 0) return null;

      return {
        inputTokens: totalInput,
        outputTokens: totalOutput,
        totalTokens: totalInput + totalOutput,
        cacheReadTokens: totalCached > 0 ? totalCached : undefined,
        thinkingTokens: totalThinking > 0 ? totalThinking : undefined,
        toolTokens: totalTool > 0 ? totalTool : undefined,
      };
    } catch {
      return null;
    }
  }

  if (providerName === "codex") {
    // Codex: Extract from event_msg with payload.type === "token_count"
    // Use the last token_count event for cumulative totals
    let lastTokenData: TokenCounts | null = null;

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (
          parsed.type === "event_msg" &&
          parsed.payload?.type === "token_count" &&
          parsed.payload?.info?.total_token_usage
        ) {
          const usage = parsed.payload.info.total_token_usage;
          lastTokenData = {
            inputTokens: usage.input_tokens || 0,
            outputTokens: usage.output_tokens || 0,
            totalTokens: usage.total_tokens || 0,
            cacheReadTokens:
              usage.cached_input_tokens > 0
                ? usage.cached_input_tokens
                : undefined,
            thinkingTokens:
              usage.reasoning_output_tokens > 0
                ? usage.reasoning_output_tokens
                : undefined,
          };
        }
      } catch {
        // Skip malformed lines
      }
    }

    return lastTokenData;
  }

  if (providerName === "mistral-vibe") {
    // Mistral Vibe: Parse JSON and extract from metadata.stats
    try {
      const data = JSON.parse(content);
      if (!data.metadata?.stats) return null;

      const stats = data.metadata.stats;
      const inputTokens = stats.session_prompt_tokens || 0;
      const outputTokens = stats.session_completion_tokens || 0;
      const totalTokens =
        stats.session_total_llm_tokens || inputTokens + outputTokens;

      if (inputTokens === 0 && outputTokens === 0) return null;

      return {
        inputTokens,
        outputTokens,
        totalTokens,
      };
    } catch {
      return null;
    }
  }

  return null;
}

// Export providers and types
export { ClaudeCodeProvider } from "./claude-code";
export { CodexProvider } from "./codex";
export { CopilotCliProvider } from "./copilot-cli";
export { GeminiProvider } from "./gemini";
export { MistralVibeProvider } from "./mistral-vibe";
export type { DetectionResult, TranscriptProvider } from "./types";
