"use client";

import { HelpCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface SiteHeaderProps {
  session?: {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  } | null;
}

export function SiteHeader({ session }: SiteHeaderProps) {
  const pathname = usePathname();
  const isMyTranscriptsPage = pathname === "/my-transcripts";
  const isHomePage = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 max-w-full">
        <div className="flex-1">
          {!isHomePage && (
            <Link
              href="/"
              className="font-mono text-lg font-bold hover:text-muted-foreground transition-colors"
            >
              ai_sessions
            </Link>
          )}
        </div>
        <div className="flex items-center justify-end space-x-2">
          {session && !isMyTranscriptsPage && (
            <Button variant="ghost" asChild>
              <Link href="/my-transcripts">My Transcripts</Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" asChild title="Help">
            <Link href="/help">
              <HelpCircle className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Help</span>
            </Link>
          </Button>
          {session && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Sign out"
            >
              <LogOut className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Sign out</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
