import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import TranscriptViewer from "@/components/TranscriptViewer";
import { auth } from "@/lib/auth";
import { parseJSONL } from "@/lib/parser";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function TranscriptPage({ params }: PageProps) {
  const { token } = await params;
  const session = await auth();

  try {
    // Fetch directly from database instead of through API route
    const transcript = await prisma.transcript.findUnique({
      where: {
        secretToken: token,
      },
      select: {
        id: true,
        title: true,
        fileData: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            image: true,
            githubUsername: true,
          },
        },
      },
    });

    if (!transcript) {
      notFound();
    }

    const parsed = parseJSONL(transcript.fileData);
    const isOwner = session?.user?.id === transcript.userId;

    return (
      <>
        <SiteHeader session={session} />
        <TranscriptViewer
          transcript={parsed}
          title={transcript.title || "Untitled Transcript"}
          createdAt={transcript.createdAt.toISOString()}
          userImage={transcript.user?.image ?? undefined}
          githubUsername={transcript.user?.githubUsername ?? undefined}
          isOwner={isOwner}
          transcriptId={transcript.id}
          secretToken={token}
        />
      </>
    );
  } catch (error) {
    console.error("Failed to load transcript:", error);
    notFound();
  }
}
