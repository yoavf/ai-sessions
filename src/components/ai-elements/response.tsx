"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, components, ...props }: ResponseProps) => (
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
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
