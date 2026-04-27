/**
 * @fileoverview Configures Vitest for unit and integration testing in this project.
 * @contributors John Kollannur
 */

import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        exclude: [...configDefaults.exclude, "tests/e2e/**"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
});
