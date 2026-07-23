import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const git = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
  cwd: root,
  encoding: "buffer",
});
if (git.status !== 0) {
  process.stderr.write(git.stderr);
  process.exit(git.status ?? 1);
}

const binaryExtensions = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".webm",
  ".webp",
  ".zip",
  ".gz",
]);
const patterns = [
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];

const files = git.stdout.toString("utf8").split("\0").filter(Boolean);
const findings = [];
for (const relativeFile of files) {
  if (
    path.basename(relativeFile) !== ".env.example" &&
    path.basename(relativeFile).startsWith(".env")
  ) {
    findings.push(`${relativeFile}: tracked environment file`);
    continue;
  }
  if (binaryExtensions.has(path.extname(relativeFile).toLowerCase())) {
    continue;
  }
  const content = await readFile(path.join(root, relativeFile), "utf8");
  for (const [label, pattern] of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      findings.push(`${relativeFile}: ${label}`);
    }
  }
}

if (findings.length > 0) {
  throw new Error(`Potential credentials found:\n${findings.join("\n")}`);
}

console.log(`Secret scan passed for ${files.length} tracked files.`);
