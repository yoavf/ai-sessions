/**
 * Assistant configuration
 * Maps AI source identifiers to their display metadata (name, icon)
 */

export interface AssistantConfig {
  name: string;
  icon: string;
}

export const ASSISTANTS_CONFIG: Record<string, AssistantConfig> = {
  "claude-code": { name: "claude", icon: "/claude.png" },
  "gemini-cli": { name: "gemini", icon: "/gemini.jpg" },
  codex: { name: "codex", icon: "/codex.png" },
  "mistral-vibe": { name: "mistral-vibe", icon: "/mistral-vibe.svg" },
};

export const DEFAULT_ASSISTANT: AssistantConfig = {
  name: "assistant",
  icon: "/claude.png",
};
