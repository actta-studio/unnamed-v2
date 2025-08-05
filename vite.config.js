import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

function toKebabCase(name) {
  return name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function getEntriesFor(dirName, prefix) {
  const fullPath = resolve(__dirname, `src/${dirName}`);
  if (!fs.existsSync(fullPath)) return {};

  const files = fs.readdirSync(fullPath);
  const entries = {};

  files.forEach((file) => {
    if (file.endsWith(".js")) {
      const baseName = file.replace(".js", "");
      const kebabName = toKebabCase(baseName);
      entries[`${prefix}__${kebabName}`] = resolve(fullPath, file);
    }
  });

  return entries;
}

export default defineConfig({
  root: "src",
  base: "",
  build: {
    outDir: "../assets",
    emptyOutDir: false,
    manifest: false,
    rollupOptions: {
      input: {
        global__app: resolve(__dirname, "src/app.js"),
        ...getEntriesFor("sections", "section"),
        ...getEntriesFor("snippets", "snippet"),
        ...getEntriesFor("components", "component"),
        ...getEntriesFor("templates", "template"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
});
