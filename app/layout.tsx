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
  title: "Better Do It - Collaborative Todo App",
  description:
    "The collaborative todo app designed for partners. Plan, track, and accomplish your goals together.",
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
  },
  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
    title: "Better Do It - Collaborative Todo App",
    description:
      "The collaborative todo app designed for partners. Plan, track, and accomplish your goals together.",
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
