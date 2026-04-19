"use client";

/**
 * @fileoverview Wraps the client app with theme state and next-themes integration.
 * @contributors Johnson Zhang
 */

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    /* Theme Provider - Applies the selected app theme to the client UI. */
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      themes={["light", "dark"]}
    >
      {children}
    </NextThemesProvider>
  );
}
