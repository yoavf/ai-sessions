/**
 * Shared utilities for transcript parsing
 */

import type { ContentBlock } from "@/types/transcript";

/**
 * Parse text that may contain <user_instructions> tags
 * Returns array of content blocks with proper splitting around tags
 *
 * This function is used by multiple transcript providers (e.g., Codex)
 * to extract user instructions from text content and create properly
 * typed content blocks.
 *
 * @param text - The text to parse for user instructions
 * @returns Array of ContentBlock objects with split content
 *
 * @example
 * // Input with user instructions
 * parseUserInstructions("Prompt before\n<user_instructions>\nInstructions\n</user_instructions>\nPrompt after")
 * // Returns:
 * // [
 * //   { type: "text", text: "Prompt before" },
 * //   { type: "user-instructions", text: "Instructions" },
 * //   { type: "text", text: "Prompt after" }
 * // ]
 *
 * @example
 * // Input without user instructions
 * parseUserInstructions("Regular text")
 * // Returns: [{ type: "text", text: "Regular text" }]
 */
export function parseUserInstructions(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Check if text contains <user_instructions> tags
  const userInstructionsMatch = text.match(
    /<user_instructions>([\s\S]*?)<\/user_instructions>/,
  );

  if (userInstructionsMatch) {
    // Extract the instructions content
    const instructionsText = userInstructionsMatch[1].trim();

    // Get any text before the tag
    const beforeTag = text.substring(0, userInstructionsMatch.index).trim();
    if (beforeTag) {
      blocks.push({
        type: "text",
        text: beforeTag,
      });
    }

    // Add user instructions as special content block
    blocks.push({
      type: "user-instructions",
      text: instructionsText,
    });

    // Get any text after the tag
    const afterTag = text
      .substring(userInstructionsMatch.index! + userInstructionsMatch[0].length)
      .trim();
    if (afterTag) {
      blocks.push({
        type: "text",
        text: afterTag,
      });
    }
  } else {
    // No user_instructions tag, add as normal text
    blocks.push({
      type: "text",
      text,
    });
  }

  return blocks;
}
