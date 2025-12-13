import { makeRelativePath } from "@/lib/path-utils";

/**
 * Get a preview string for a tool call to display in the UI
 * This function extracts the most relevant information from tool inputs
 * to show in collapsed tool headers
 */
export function getToolPreview(
  toolName: string,
  // biome-ignore lint/suspicious/noExplicitAny: Tool input types are dynamic
  input: Record<string, any>,
  cwd?: string,
): string | null {
  switch (toolName) {
    case "Read":
    case "read_file":
      return input.file_path
        ? makeRelativePath(input.file_path, cwd)
        : input.path
          ? makeRelativePath(input.path, cwd)
          : null;

    case "Write":
    case "write_file":
    case "Edit":
    case "replace":
    case "search_replace":
      return input.file_path
        ? makeRelativePath(input.file_path, cwd)
        : input.path
          ? makeRelativePath(input.path, cwd)
          : null;

    case "Glob":
      return input.pattern || null;

    case "Grep":
    case "grep":
      return input.pattern ? `"${input.pattern}"` : null;

    case "Bash":
    case "bash": {
      if (!input.command) return null;
      const cmd = input.command as string;
      const trimmed = cmd.trim();

      if (trimmed.startsWith("npx ")) {
        const match = trimmed.match(/^npx\s+([^\s]+)/);
        return match ? `npx ${match[1]}` : "npx";
      }

      if (trimmed.startsWith("npm ")) {
        const match = trimmed.match(/^npm\s+(run\s+)?([^\s]+)/);
        return match
          ? match[1]
            ? `npm run ${match[2]}`
            : `npm ${match[2]}`
          : "npm";
      }

      const breakPoints = /[&|;]/;
      const breakIndex = cmd.search(breakPoints);
      const displayCmd =
        breakIndex !== -1 ? cmd.substring(0, breakIndex).trim() : cmd;

      return displayCmd.length > 50
        ? `${displayCmd.substring(0, 50)}...`
        : displayCmd;
    }

    case "WebFetch":
      return input.url || null;

    case "Task":
      return input.description || null;

    case "SlashCommand":
      return input.command || null;

    case "TodoWrite":
    case "todo":
      if (input.todos && Array.isArray(input.todos)) {
        return `${input.todos.length} todo${input.todos.length !== 1 ? "s" : ""}`;
      }
      return null;

    case "update_plan":
      if (input.plan && Array.isArray(input.plan)) {
        return `${input.plan.length} step${input.plan.length !== 1 ? "s" : ""}`;
      }
      return null;

    case "shell": {
      if (!input.command) return null;

      // Codex: command is usually ["bash", "-lc", "actual command"]
      let actualCommand: string;
      if (Array.isArray(input.command)) {
        const filtered = input.command.filter(
          (arg: string) => arg !== "bash" && arg !== "-lc",
        );
        actualCommand = filtered.join(" ");
      } else if (typeof input.command === "string") {
        actualCommand = input.command;
      } else {
        return null;
      }

      const firstLine = actualCommand.trim().split("\n")[0];
      const breakPoints = /[&|;]/;
      const breakIndex = firstLine.search(breakPoints);
      const displayCmd =
        breakIndex !== -1
          ? firstLine.substring(0, breakIndex).trim()
          : firstLine;

      return displayCmd.length > 60
        ? `${displayCmd.substring(0, 60)}...`
        : displayCmd;
    }

    default: {
      const previewFields = [
        "path",
        "file_path",
        "pattern",
        "query",
        "command",
        "description",
      ];
      for (const field of previewFields) {
        if (input[field] && typeof input[field] === "string") {
          // Convert paths to relative for path-like fields
          if (field === "path" || field === "file_path") {
            return makeRelativePath(input[field], cwd);
          }
          return input[field];
        }
      }
      return null;
    }
  }
}
