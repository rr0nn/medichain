"use client";

/**
 * @fileoverview Wraps Sonner's toaster with the app theme configuration.
 * @contributors Johnson Zhang
 */

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      richColors
      closeButton
      {...props}
    />
  );
}
