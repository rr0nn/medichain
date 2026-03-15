// This is directly testing the only exported function in utils.ts, which wraps clsx
// and tailwind-merge.

import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
    it("joins simple class names", () => {
        expect(cn("px-2", "py-4")).toBe("px-2 py-4");
    });

    it("ignores falsy values like clsx does", () => {
        expect(cn("base", false && "hidden", null, undefined, "active")).toBe(
            "base active"
        );
    });

    it("lets tailwind-merge resolve conflicting Tailwind classes", () => {
        expect(cn("px-2", "px-4")).toBe("px-4");
    });

    it("merges arrays/conditional classes correctly", () => {
        expect(cn(["text-sm", "font-medium"], { hidden: false, block: true })).toBe(
            "text-sm font-medium block"
        );
    });
});