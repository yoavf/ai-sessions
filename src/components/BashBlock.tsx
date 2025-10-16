"use client";

import CodeBlock from "./CodeBlock";

interface BashBlockProps {
  input?: string;
  stdout?: string;
  stderr?: string;
}

export default function BashBlock({ input, stdout, stderr }: BashBlockProps) {
  return (
    <div className="space-y-2">
      {input && (
        <div className="bg-muted rounded-lg p-3 border">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Command
          </div>
          <code className="text-sm text-emerald-600 dark:text-emerald-400 font-mono">
            $ {input}
          </code>
        </div>
      )}

      {stdout && (
        <div className="bg-muted/50 rounded-lg border">
          <div className="text-xs font-medium text-muted-foreground px-3 py-2 border-b">
            Output
          </div>
          <div className="p-3">
            <CodeBlock code={stdout} language="text" />
          </div>
        </div>
      )}

      {stderr && (
        <div className="bg-destructive/10 rounded-lg border border-destructive/20">
          <div className="text-xs font-medium text-destructive px-3 py-2 border-b border-destructive/20">
            Error Output
          </div>
          <div className="p-3">
            <CodeBlock code={stderr} language="text" />
          </div>
        </div>
      )}
    </div>
  );
}
