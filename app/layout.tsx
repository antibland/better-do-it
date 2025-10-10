import type { Metadata, Viewport } from "next";
import { satoshi } from "@/lib/fonts";
import { Toaster } from "react-hot-toast";
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
      <body className={`${satoshi.variable} antialiased`}>
        {children}
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={8}
          containerClassName=""
          containerStyle={{}}
          toastOptions={{
            // Define default options
            duration: 4000,
            style: {
              background: "var(--card)",
              color: "var(--card-foreground)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "16px",
              fontSize: "14px",
              fontWeight: "500",
            },
            // Default options for specific types
            success: {
              duration: 3000,
              style: {
                background: "var(--card)",
                color: "var(--foreground)",
                border: "1px solid var(--success)",
              },
              iconTheme: {
                primary: "var(--success)",
                secondary: "var(--card)",
              },
            },
            error: {
              duration: 4000,
              style: {
                background: "var(--card)",
                color: "var(--foreground)",
                border: "1px solid var(--destructive)",
              },
              iconTheme: {
                primary: "var(--destructive)",
                secondary: "var(--card)",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
