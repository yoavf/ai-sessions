import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import UploadDropzoneWithAuth from "@/components/UploadDropzoneWithAuth";
import { auth } from "@/lib/auth";
import { getCsrfToken } from "@/lib/csrf";

export default async function Home() {
  const session = await auth();

  // CSRF token is guaranteed to exist because middleware ensures it
  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    throw new Error("CSRF token missing - middleware may not be running");
  }

  return (
    <div className="flex-1 bg-background">
      <SiteHeader session={session} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4">AI Sessions</h1>
            <p className="text-lg text-muted-foreground mb-2">
              Share AI coding sessions
            </p>
            <p className="text-sm text-muted-foreground/70">
              Supports Claude Code, Codex, and Gemini CLI
            </p>
          </div>

          <UploadDropzoneWithAuth
            isAuthenticated={!!session}
            csrfToken={csrfToken}
          />

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Examples:{" "}
              <Link
                href="/t/_Vdv6M0GYsfztNVv"
                className="text-primary hover:underline"
              >
                Claude Code
              </Link>
              ,{" "}
              <Link
                href="/t/NBKE6kb6ZswNSwsS"
                className="text-primary hover:underline"
              >
                Codex
              </Link>
              ,{" "}
              <Link
                href="/t/NBKE6kb6ZswNSwsS"
                className="text-primary hover:underline"
              >
                Gemini CLI
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Need help finding your transcripts?{" "}
              <Link href="/help" className="text-primary hover:underline">
                Check out the help page
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
