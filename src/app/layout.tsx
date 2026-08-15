import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CollabCanvas — Real-time Collaborative Infinite Canvas",
  description:
    "A Miro/Figma-class real-time collaborative whiteboard built on Next.js, Yjs CRDTs, and React Flow. Multiplayer cursors, conflict-free edits, 60 FPS canvas.",
  keywords: [
    "collaborative canvas",
    "whiteboard",
    "Yjs",
    "CRDT",
    "React Flow",
    "real-time",
    "multiplayer",
    "Next.js",
  ],
  authors: [{ name: "CollabCanvas" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "CollabCanvas",
    description:
      "Real-time collaborative infinite canvas with Yjs CRDTs and React Flow.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster />
        <SonnerToaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
