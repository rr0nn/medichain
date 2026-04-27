/**
 * @fileoverview Sets up the root app layout, global fonts, and shared client providers.
 * @contributors Johnson Zhang, John Kollannur, Aryan Wadhawan
 */

import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { BackgroundLayer } from "@/components/layout/background-layer";

export const metadata: Metadata = {
  title: "MediChain",
  description: "uni project thing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}
    >
      <body className="antialiased">
        <ThemeProvider>
          <BackgroundLayer />
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
