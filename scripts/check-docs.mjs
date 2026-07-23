import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const documents = [
  "README.md",
  "README.zh-CN.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "docs/ARCHITECTURE.md",
  "docs/BENCHMARK.md",
  "docs/COMPETITOR_SCAN.md",
  "docs/DEMO.md",
  "docs/INPUT_FORMAT.md",
  "docs/OUTPUT_FORMATS.md",
  "docs/PRIVACY_AND_SECURITY.md",
  "docs/RELEASING.md",
  "docs/releases/v0.1.0.md",
];

const missing = [];
for (const relativeDocument of documents) {
  const documentPath = path.join(root, relativeDocument);
  const markdown = await readFile(documentPath, "utf8");
  const links = markdown.matchAll(/\]\(([^)]+)\)/g);
  for (const match of links) {
    const link = match[1]?.trim();
    if (
      !link ||
      link.startsWith("#") ||
      link.startsWith("http://") ||
      link.startsWith("https://") ||
      link.startsWith("mailto:")
    ) {
      continue;
    }
    const relativeTarget = decodeURIComponent(link.split("#")[0] ?? "");
    const target = path.resolve(path.dirname(documentPath), relativeTarget);
    if (!existsSync(target)) {
      missing.push(`${relativeDocument}: ${relativeTarget}`);
    }
  }
}

const chineseReadme = await readFile(path.join(root, "README.zh-CN.md"), "utf8");
if (!chineseReadme.includes("听见 CI 在哪里等待")) {
  throw new Error("README.zh-CN.md failed its UTF-8 content check.");
}
if (missing.length > 0) {
  throw new Error(`Missing local documentation targets:\n${missing.join("\n")}`);
}

console.log(`Documentation check passed for ${documents.length} files.`);
