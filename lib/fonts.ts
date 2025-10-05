/**
 * Font configuration for the Better Do It application
 *
 * This file centralizes all font definitions following Next.js best practices.
 * Satoshi is a modern geometric sans-serif typeface perfect for clean,
 * professional task management interfaces.
 */

import localFont from "next/font/local";

// Satoshi font family configuration
// Using variable fonts for better performance and comprehensive weight support
const satoshi = localFont({
  src: [
    // Variable font (primary) - supports all weights from 300-900
    {
      path: "../public/fonts/satoshi/Satoshi-Variable.woff2",
      weight: "300 900",
      style: "normal",
    },
    {
      path: "../public/fonts/satoshi/Satoshi-VariableItalic.woff2",
      weight: "300 900",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
  display: "swap", // Optimize font loading with font-display: swap
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

// Export fonts for use throughout the application
export { satoshi };

// Type definitions for font objects
export type SatoshiFont = typeof satoshi;
