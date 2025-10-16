"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

// Escape < and > to prevent rehype-raw from parsing XML/HTML tags
// Streamdown uses rehype-raw which tries to parse HTML, so we need to escape angle brackets
function escapeHtml(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const Response = memo(
  ({ className, components, children, ...props }: ResponseProps) => {
    // Escape HTML in string children to prevent XML tags from being parsed
    const safeChildren = typeof children === 'string' ? escapeHtml(children) : children;

    return (
      <Streamdown
        className={cn(
          "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          className
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
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
