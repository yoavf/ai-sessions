/**
 * Utility functions for handling AI source names and icons
 */

/**
 * Map source to assistant icon path
 */
const DEFAULT_ASSISTANT_ICON = "/claude.png";

export function getAssistantIconPath(source: string): string {
  const iconMap: Record<string, string> = {
    "claude-code": "/claude.png",
    "gemini-cli": "/gemini.jpg",
    codex: "/codex.png",
  };
  return iconMap[source] || DEFAULT_ASSISTANT_ICON;
}

/**
 * Get short assistant name for display
 */
export function getShortAssistantName(source: string): string {
  const nameMap: Record<string, string> = {
    "claude-code": "claude",
    "gemini-cli": "gemini",
    codex: "codex",
  };
  return nameMap[source] || "assistant";
}
