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
};

export const DEFAULT_ASSISTANT: AssistantConfig = {
  name: "assistant",
  icon: "/claude.png",
};
