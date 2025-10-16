import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import UploadDropzoneWithAuth from "@/components/UploadDropzoneWithAuth";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex-1 bg-background">
      <SiteHeader session={session} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4">AI Sessions</h1>
            <p className="text-lg text-muted-foreground mb-2">
              Share Claude Code transcripts
            </p>
            <p className="text-sm text-muted-foreground/70">
              (Other coding agents coming soon!)
            </p>
          </div>

          <UploadDropzoneWithAuth isAuthenticated={!!session} />

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
