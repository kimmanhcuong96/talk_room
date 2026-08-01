import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(scriptDir, "../dist");
const indexPath = join(distDir, "index.html");
const fallbackPath = join(distDir, "404.html");

if (existsSync(indexPath)) {
  copyFileSync(indexPath, fallbackPath);
}
