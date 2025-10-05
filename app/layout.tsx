import type { Metadata, Viewport } from "next";
import { satoshi } from "@/lib/fonts";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Better Do It - The Collaborative Todo App",
  description: "Encouraging accountability by sharing progress among friend.",
  // iOS Safari compatibility
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
  // Open Graph metadata for social media sharing
  openGraph: {
    title: "Better Do It - The Collaborative Todo App",
    description:
      "Encouraging accountability by sharing progress among friends.",
    type: "website",
    locale: "en_US",
    siteName: "Better Do It",
  },
  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
    title: "Better Do It - The Collaborative Todo App",
    description:
      "Encouraging accountability by sharing progress among friends.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${satoshi.variable} antialiased`}>{children}</body>
    </html>
  );
}
