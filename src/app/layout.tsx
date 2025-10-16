import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://aisessions.dev"),
  title: "AI Sessions",
  description: "Share Claude Code transcripts",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "AI Sessions",
    title: "AI Sessions",
    description: "Share Claude Code transcripts",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AI Sessions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Sessions",
    description: "Share Claude Code transcripts",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          src="https://cdn.counter.dev/script.js"
          data-id="4fbcc31f-5f37-40c3-8788-8fb56c79209b"
          data-utcoffset="3"
        ></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Providers>
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
