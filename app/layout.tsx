import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
