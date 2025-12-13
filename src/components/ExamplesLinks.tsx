import Image from "next/image";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExampleLink {
  href: string;
  icon: string;
  name: string;
  rounded?: boolean;
}

const examples: ExampleLink[] = [
  {
    href: "/t/_Vdv6M0GYsfztNVv",
    icon: "/claude.png",
    name: "Claude Code",
    rounded: true,
  },
  {
    href: "/t/NBKE6kb6ZswNSwsS",
    icon: "/codex.png",
    name: "Codex",
  },
  {
    href: "/t/zT6MhMxvoJ0xuG8T",
    icon: "/gemini.jpg",
    name: "Gemini CLI",
    rounded: true,
  },
  {
    href: "/t/rzjYpWkpaK5YcqDD",
    icon: "/mistral-vibe.png",
    name: "Mistral Vibe",
    rounded: true,
  },
];

export function ExamplesLinks() {
  return (
    <TooltipProvider delayDuration={100}>
      <span className="inline-flex items-center gap-2">
        <span>Examples:</span>
        {examples.map((example) => (
          <Tooltip key={example.href}>
            <TooltipTrigger asChild>
              <Link href={example.href} className="inline-flex">
                <Image
                  src={example.icon}
                  alt={example.name}
                  width={16}
                  height={16}
                  className={`inline-block hover:scale-110 transition-transform ${example.rounded ? "rounded-full" : ""}`}
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>{example.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </span>
    </TooltipProvider>
  );
}
