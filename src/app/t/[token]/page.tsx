import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import TranscriptPageDropzone from "@/components/TranscriptPageDropzone";
import TranscriptViewer from "@/components/TranscriptViewer";
import { auth } from "@/lib/auth";
import { getCsrfToken } from "@/lib/csrf";
import {
  generateDefaultTitle,
  isUuidOrSessionId,
  parseJSONL,
} from "@/lib/parser";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;

  try {
    const transcript = await prisma.transcript.findUnique({
      where: { secretToken: token },
      select: {
        title: true,
        source: true,
        createdAt: true,
        fileData: true,
        user: {
          select: {
            githubUsername: true,
          },
        },
      },
    });

    if (!transcript) {
      return {
        title: "Transcript Not Found",
        description: "The requested transcript could not be found.",
      };
    }

    const parsed = parseJSONL(transcript.fileData);

    // Determine if we have a custom title or need to generate one
    const hasCustomTitle =
      transcript.title && !isUuidOrSessionId(transcript.title);
    const title: string = hasCustomTitle
      ? (transcript.title as string)
      : generateDefaultTitle(transcript.source, transcript.createdAt);

    const username = transcript.user?.githubUsername || "Anonymous";
    const messageCount = parsed.metadata.messageCount;
    const date = new Date(transcript.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const description = `AI coding session by ${username} • ${messageCount} messages • ${date}`;

    return {
      title: `${title} - AI Sessions`,
      description,
      openGraph: {
        type: "article",
        url: `/t/${token}`,
        title: `${title} - AI Sessions`,
        description,
        siteName: "AI Sessions",
        images: [
          {
            url: `/t/${token}/opengraph-image`,
            width: 1200,
            height: 630,
            alt: title || "AI Session Transcript",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} - AI Sessions`,
        description,
        images: [`/t/${token}/opengraph-image`],
      },
    };
  } catch (_error) {
    return {
      title: "Error Loading Transcript",
      description: "An error occurred while loading the transcript.",
    };
  }
}

export default async function TranscriptPage({ params }: PageProps) {
  const { token } = await params;
  const session = await auth();

  // CSRF token is guaranteed to exist because middleware ensures it
  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    throw new Error("CSRF token missing - middleware may not be running");
  }

  try {
    // Fetch directly from database instead of through API route
    const transcript = await prisma.transcript.findUnique({
      where: {
        secretToken: token,
      },
      select: {
        id: true,
        title: true,
        source: true,
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

    // Determine if we have a custom title or need to generate one
    const hasCustomTitle =
      transcript.title && !isUuidOrSessionId(transcript.title);
    const title: string = hasCustomTitle
      ? (transcript.title as string)
      : generateDefaultTitle(transcript.source, transcript.createdAt);

    return (
      <TranscriptPageDropzone isAuthenticated={!!session} csrfToken={csrfToken}>
        <SiteHeader session={session} />
        <TranscriptViewer
          transcript={parsed}
          title={title}
          source={transcript.source}
          createdAt={transcript.createdAt.toISOString()}
          userImage={transcript.user?.image ?? undefined}
          githubUsername={transcript.user?.githubUsername ?? undefined}
          isOwner={isOwner}
          transcriptId={transcript.id}
          secretToken={token}
        />
      </TranscriptPageDropzone>
    );
  } catch (error) {
    console.error("Failed to load transcript:", error);
    notFound();
  }
}
