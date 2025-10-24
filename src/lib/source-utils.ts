/**
 * Utility functions for handling AI source names and icons
 */

import { ASSISTANTS_CONFIG, DEFAULT_ASSISTANT } from "@/config/assistants";

/**
 * Map source to assistant icon path
 */
export function getAssistantIconPath(source: string): string {
  return ASSISTANTS_CONFIG[source]?.icon || DEFAULT_ASSISTANT.icon;
}

/**
 * Get short assistant name for display
 */
export function getShortAssistantName(source: string): string {
  return ASSISTANTS_CONFIG[source]?.name || DEFAULT_ASSISTANT.name;
}
