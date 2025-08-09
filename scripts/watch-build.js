// scripts/watch-build.js
import { build } from "vite";
import chokidar from "chokidar";

const paths = [
  "src/app.js",
  "src/{sections,snippets,components,templates}/**/*.js",
];

let timer = null;
const DEBOUNCE_MS = 200; // tweak to taste

const runBuild = async () => {
  console.log("🔨 Building…");
  try {
    await build();
    console.log("✅ Build complete");
  } catch (e) {
    console.error("❌ Build failed", e);
  }
};

const kick = () => {
  clearTimeout(timer);
  timer = setTimeout(runBuild, DEBOUNCE_MS);
};

chokidar
  .watch(paths, { ignoreInitial: false })
  .on("add", kick)
  .on("change", kick)
  .on("unlink", kick);
