import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "www");

// Only runtime files are copied into the native web bundle. Development tools,
// source spreadsheets, and the local Python server are intentionally excluded.
const runtimeEntries = [
  "index.html",
  "manifest.json",
  "css",
  "js",
  "modules",
  "content",
  "logo&title_move_short.mov",
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const entry of runtimeEntries) {
  await cp(path.join(projectRoot, entry), path.join(outputDir, entry), {
    recursive: true,
  });
}

console.log(`Web bundle ready: ${path.relative(projectRoot, outputDir)}/`);
