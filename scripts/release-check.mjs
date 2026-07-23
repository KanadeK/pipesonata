import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdtemp, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const developmentMode = process.argv.includes("--allow-development");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const prefix = `${packageJson.name}-v${packageJson.version}`;
const releaseDirectory = path.join(root, "dist-release");
const expectedMilestones = [
  "chore: initialize repository and quality gates",
  "feat: implement domain core",
  "feat: add adapters and sample data",
  "feat: deliver usable interface",
  "test: add integration and end-to-end coverage",
  "docs: complete bilingual documentation and demos",
  "ci: add build test package and release workflows",
  "release: prepare v0.1.0",
];
const requiredFiles = [
  ".github/workflows/ci.yml",
  ".github/workflows/pages.yml",
  ".github/workflows/release.yml",
  ".github/workflows/security.yml",
  "docs/releases/v0.1.0.md",
  "LICENSE",
  "README.md",
  "README.zh-CN.md",
];
const requiredAssets = [
  `${prefix}-web-static.tar.gz`,
  `${prefix}-web-demo.tar.gz`,
  `${prefix}-source.tar.gz`,
  `${prefix}-sbom.cdx.json`,
  `${prefix}-provenance.json`,
  "SHA256SUMS.txt",
];

function run(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${arguments_.join(" ")} failed.\n${result.stderr || result.stdout || ""}`,
    );
  }
  return result.stdout;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function sha256(file) {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

function archiveEntries(file) {
  return run("tar", ["-tzf", file]).split(/\r?\n/).filter(Boolean);
}

function contentType(file) {
  const extension = path.extname(file).toLowerCase();
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".map": "application/json; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml",
    }[extension] ?? "application/octet-stream"
  );
}

async function smokeExtractedStatic(staticRoot) {
  const requestErrors = [];
  const server = createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(
        new URL(request.url ?? "/", "http://localhost").pathname,
      );
      const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
      const target = path.resolve(staticRoot, relativePath);
      if (
        !target.startsWith(`${path.resolve(staticRoot)}${path.sep}`) &&
        target !== path.resolve(staticRoot)
      ) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const content = await readFile(target);
      response.writeHead(200, { "content-type": contentType(target) });
      response.end(content);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object", "Static smoke server did not bind.");

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    page.on("pageerror", (error) => requestErrors.push(error.message));
    page.on("requestfailed", (request) =>
      requestErrors.push(`${request.url()}: ${request.failure()?.errorText ?? "request failed"}`),
    );
    const response = await page.goto(`http://127.0.0.1:${address.port}/`, {
      waitUntil: "networkidle",
    });
    assert(response?.ok(), `Extracted static package returned HTTP ${response?.status()}.`);
    await page.getByRole("heading", { level: 1, name: "Hear where CI waits." }).waitFor();
    assert(
      requestErrors.length === 0,
      `Extracted package browser errors:\n${requestErrors.join("\n")}`,
    );
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

assert(packageJson.version === "0.1.0", "package.json version must be 0.1.0.");
assert(
  (await readFile(path.join(root, "src", "core", "version.ts"), "utf8")).includes('"0.1.0"'),
  "Application version does not match package.json.",
);
for (const requiredFile of requiredFiles.filter(
  (file) => !developmentMode || file !== "docs/releases/v0.1.0.md",
)) {
  await stat(path.join(root, requiredFile));
}

const branch = run("git", ["branch", "--show-current"]).trim();
assert(
  branch === "main" || process.env.GITHUB_REF_TYPE === "tag",
  `Release check must run on main or a tag checkout, not ${branch || "detached HEAD"}.`,
);
const status = run("git", ["status", "--porcelain", "--untracked-files=all"]).trim();
assert(developmentMode || status === "", `Release worktree is not clean:\n${status}`);

const subjects = run("git", ["log", "--reverse", "--format=%s"]).trim().split(/\r?\n/);
if (developmentMode) {
  assert(
    JSON.stringify(subjects) === JSON.stringify(expectedMilestones.slice(0, subjects.length)),
    `Existing milestone history is not a valid required prefix:\n${subjects.join("\n")}`,
  );
} else {
  assert(
    subjects.length >= expectedMilestones.length &&
      JSON.stringify(subjects.slice(0, expectedMilestones.length)) ===
        JSON.stringify(expectedMilestones),
    `Milestone history differs from the required eight commits:\n${subjects.join("\n")}`,
  );
}
const identities = run("git", ["log", "--reverse", "--format=%an <%ae>|%cn <%ce>"])
  .trim()
  .split(/\r?\n/)
  .slice(0, Math.min(expectedMilestones.length, subjects.length));
const expectedIdentity = "KanadeK <1207048080@qq.com>";
assert(
  identities.every((identity) => identity === `${expectedIdentity}|${expectedIdentity}`),
  `Unexpected author or committer identity:\n${identities.join("\n")}`,
);
const initialBodies = run("git", ["log", "--reverse", "--format=%B%x00"])
  .split("\0")
  .slice(0, expectedMilestones.length)
  .join("\n")
  .toLowerCase();
assert(
  !initialBodies.includes("co-authored-by:"),
  "Initial history contains a Co-authored-by trailer.",
);

const releaseFiles = await readdir(releaseDirectory);
for (const requiredAsset of requiredAssets) {
  assert(releaseFiles.includes(requiredAsset), `Missing release asset: ${requiredAsset}`);
}
const checksumText = await readFile(path.join(releaseDirectory, "SHA256SUMS.txt"), "utf8");
const checksumRows = checksumText.trim().split(/\r?\n/);
assert(
  checksumRows.length === requiredAssets.length - 1,
  "SHA256SUMS.txt has an unexpected row count.",
);
for (const row of checksumRows) {
  const match = row.match(/^([a-f0-9]{64}) {2}(.+)$/i);
  assert(match, `Malformed checksum row: ${row}`);
  const [, expectedHash, filename] = match;
  assert(requiredAssets.includes(filename), `Checksum references an unexpected asset: ${filename}`);
  assert(
    (await sha256(path.join(releaseDirectory, filename))) === expectedHash.toLowerCase(),
    `Checksum mismatch: ${filename}`,
  );
}

for (const archiveName of requiredAssets.filter((asset) => asset.endsWith(".tar.gz"))) {
  const entries = archiveEntries(path.join(releaseDirectory, archiveName));
  assert(entries.length > 1, `${archiveName} is empty.`);
  const unsafe = entries.filter(
    (entry) =>
      /(^|\/)(?:node_modules|\.git|dist-release|demo-output)(?:\/|$)/.test(entry) ||
      /(^|\/)\.env(?!\.example)(?:\/|$)/.test(entry) ||
      /\.log$/i.test(entry),
  );
  assert(unsafe.length === 0, `${archiveName} contains unsafe paths:\n${unsafe.join("\n")}`);
}

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "pipesonata-release-"));
try {
  run("tar", [
    "-xzf",
    path.join(releaseDirectory, `${prefix}-web-static.tar.gz`),
    "-C",
    temporaryDirectory,
  ]);
  const staticRoot = path.join(temporaryDirectory, `${prefix}-web-static`);
  await stat(path.join(staticRoot, "index.html"));
  await stat(path.join(staticRoot, "LICENSE"));
  await smokeExtractedStatic(staticRoot);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

const provenance = JSON.parse(
  await readFile(path.join(releaseDirectory, `${prefix}-provenance.json`), "utf8"),
);
assert(provenance.version === packageJson.version, "Provenance version mismatch.");
assert(
  provenance.revision === run("git", ["rev-parse", "HEAD"]).trim(),
  "Provenance revision mismatch.",
);
assert(
  developmentMode || provenance.treeState === "clean",
  "Provenance was generated from a dirty tree.",
);

console.log(
  `Release check passed${developmentMode ? " in development mode" : ""}: ${
    requiredAssets.length
  } assets, ${checksumRows.length} checksums, extracted browser smoke, and verified milestone history.`,
);
