"use client";

/**
 * @fileoverview Renders the theme switcher used to change the app appearance.
 * @contributors Johnson Zhang
 */

import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useState, useSyncExternalStore } from "react";

type ThemeOption = "light" | "dark";

const THEME_OPTIONS: Array<{
  value: ThemeOption;
  label: string;
}> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function subscribe() {
  return () => {};
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const value: ThemeOption = theme === "dark" ? "dark" : "light";
  const selectedTheme = useMemo(
    () => THEME_OPTIONS.find((option) => option.value === value) ?? THEME_OPTIONS[0],
    [value],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-auto w-[180px] justify-between rounded-xl border-[color:var(--glass-border)] bg-background/55 py-2 shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-sm hover:bg-background/70"
        >
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Theme
            </p>
            <span className="block truncate text-sm text-foreground">
              {mounted ? selectedTheme.label : "Light"}
            </span>
          </div>
          <ChevronDownIcon className="shrink-0 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="gap-0 overflow-hidden border-none p-0 outline outline-border sm:max-w-xs"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--glass-border)] bg-background/55 px-3 py-2.5 backdrop-blur-sm">
          <DialogTitle className="text-sm font-medium">Select theme</DialogTitle>
          <DialogClose className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
        <Command>
          <CommandList>
            <CommandGroup>
              {THEME_OPTIONS.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    setTheme(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {value === option.value ? (
                    <CheckIcon className="ml-auto size-4" />
                  ) : (
                    <div className="ml-auto size-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
