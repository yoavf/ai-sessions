"use client";

import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown>;

// Escape XML/HTML tags that could cause React errors, but preserve markdown syntax
// We escape tags like <environment_context>, <cwd>, etc. but NOT code/list markdown
function escapeXmlTags(text: string): string {
  // Match XML tags: < followed by letter/underscore, then non-> chars, then >
  // This catches <environment_context>, <cwd>, <approval_policy>, etc.
  // But NOT markdown like **bold**, `code`, or comparison operators
  return text.replace(/<([a-zA-Z_][a-zA-Z0-9_:\-.]*)([^>]*)>/g, "&lt;$1$2&gt;");
}

export const Response = memo(
  ({ className, components, children, ...props }: ResponseProps) => {
    // Escape XML tags in string children to prevent rehype-raw parsing errors
    const safeChildren =
      typeof children === "string" ? escapeXmlTags(children) : children;

    return (
      <Streamdown
        className={cn(
          "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          className,
        )}
        components={{
          // Disable h1-h6 headings - render as regular paragraphs to prevent markdown interference
          h1: ({ children }) => <p className="font-semibold">{children}</p>,
          h2: ({ children }) => <p className="font-semibold">{children}</p>,
          h3: ({ children }) => <p className="font-semibold">{children}</p>,
          h4: ({ children }) => <p className="font-semibold">{children}</p>,
          h5: ({ children }) => <p className="font-semibold">{children}</p>,
          h6: ({ children }) => <p className="font-semibold">{children}</p>,
          ...components,
        }}
        {...props}
      >
        {safeChildren}
      </Streamdown>
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";
