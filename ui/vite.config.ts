import { defineConfig } from "vite";

declare const __dirname: string;
declare function require(id: string): any;

const { readFileSync } = require("fs");
const { resolve } = require("path");

const pluginManifest = JSON.parse(
  readFileSync(resolve(__dirname, "../plugin.json"), "utf-8"),
) as { version?: string };
const pluginVersion = pluginManifest.version ?? "0.0.0";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __REMOTE_PLUGIN_VERSION__: JSON.stringify(pluginVersion),
  },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["react", "react-dom"],
    },
  },
});
