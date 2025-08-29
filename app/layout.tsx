import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Better Do It - Collaborative Todo App",
  description:
    "The collaborative todo app designed for partners. Plan, track, and accomplish your goals together.",
  viewport:
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  // iOS Safari compatibility
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
  // Open Graph metadata for social media sharing
  openGraph: {
    title: "Better Do It - Collaborative Todo App",
    description:
      "The collaborative todo app designed for partners. Plan, track, and accomplish your goals together.",
    type: "website",
    locale: "en_US",
    siteName: "Better Do It",
    // The opengraph-image.png file in the app directory will be automatically used
    // Next.js will generate the appropriate og:image meta tags
  },
  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
    title: "Better Do It - Collaborative Todo App",
    description:
      "The collaborative todo app designed for partners. Plan, track, and accomplish your goals together.",
    // The opengraph-image.png will also be used for Twitter cards
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
