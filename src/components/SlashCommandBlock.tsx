"use client";

interface SlashCommandBlockProps {
  commandName: string;
  commandMessage?: string;
  commandArgs?: string;
}

export default function SlashCommandBlock({
  commandName,
  commandArgs,
}: SlashCommandBlockProps) {
  return (
    <div className="bg-muted/50 border-l-4 border-primary rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-6 h-6 bg-primary/10 text-primary font-bold text-xs rounded-md">
          /s
        </span>
        <span className="text-xs text-muted-foreground">Slash command:</span>
        <span className="font-mono text-sm font-semibold">{commandName}</span>
      </div>

      {commandArgs?.trim() && (
        <div className="mt-2 text-xs font-mono text-foreground bg-muted rounded px-2 py-1">
          {commandArgs}
        </div>
      )}
    </div>
  );
}
