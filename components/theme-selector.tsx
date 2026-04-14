"use client";

/**
 * @fileoverview Renders the theme switcher used to change the app appearance.
 * @contributors Johnson Zhang
 */

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

type ThemeOption = "system" | "medichain";

function subscribe() {
  return () => {};
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const value: ThemeOption = theme === "medichain" ? "medichain" : "system";

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Theme</span>
      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
        value={mounted ? value : "system"}
        onChange={(e) => setTheme(e.target.value)}
        aria-label="Select theme"
      >
        <option value="system">System</option>
        <option value="medichain">Medichain</option>
      </select>
    </label>
  );
}
