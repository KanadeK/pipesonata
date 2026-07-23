import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;
const slug = packageJson.name;
const prefix = `${slug}-v${version}`;
const releaseDirectory = path.join(root, "dist-release");
const stagingDirectory = path.join(releaseDirectory, ".staging");
const stableTime = new Date("2000-01-01T00:00:00.000Z");

function run(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${arguments_.join(" ")} failed.\n${
        result.error?.message || result.stderr || result.stdout || ""
      }`,
    );
  }
  return result.stdout;
}

async function normalizeTimes(target) {
  const targetStat = await stat(target);
  if (targetStat.isDirectory()) {
    const entries = await readdir(target);
    entries.sort();
    for (const entry of entries) {
      await normalizeTimes(path.join(target, entry));
    }
  }
  await utimes(target, stableTime, stableTime);
}

async function archiveDirectory(directory, output) {
  await normalizeTimes(directory);
  run("tar", ["-czf", output, "-C", path.dirname(directory), path.basename(directory)]);
}

async function copyTrackedSource(destination) {
  const listed = spawnSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (listed.status !== 0) {
    throw new Error(`git ls-files failed.\n${listed.stderr.toString("utf8")}`);
  }
  const files = listed.stdout.toString("utf8").split("\0").filter(Boolean).sort();
  for (const relativeFile of files) {
    const source = path.join(root, relativeFile);
    const target = path.join(destination, relativeFile);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
}

async function sha256(file) {
  const content = await readFile(file);
  return createHash("sha256").update(content).digest("hex");
}

for (const requiredPath of [
  "dist/index.html",
  "demo-output/pipesonata-v0.1.0-demo-manifest.json",
]) {
  try {
    await stat(path.join(root, requiredPath));
  } catch {
    throw new Error(`${requiredPath} is missing. Run the build and demo generators first.`);
  }
}

await rm(releaseDirectory, { recursive: true, force: true });
await mkdir(stagingDirectory, { recursive: true });

const staticRoot = path.join(stagingDirectory, `${prefix}-web-static`);
await cp(path.join(root, "dist"), staticRoot, { recursive: true });
await copyFile(path.join(root, "LICENSE"), path.join(staticRoot, "LICENSE"));
await copyFile(path.join(root, "README.md"), path.join(staticRoot, "README.md"));
await copyFile(path.join(root, "README.zh-CN.md"), path.join(staticRoot, "README.zh-CN.md"));
await cp(path.join(root, "examples"), path.join(staticRoot, "examples"), { recursive: true });
await writeFile(
  path.join(staticRoot, "PACKAGE_MANIFEST.json"),
  `${JSON.stringify(
    {
      schema: "pipesonata.package/v1",
      name: slug,
      version,
      platform: "web-static",
      entrypoint: "index.html",
      license: "MIT",
      localFirst: true,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const demoRoot = path.join(stagingDirectory, `${prefix}-web-demo`);
await cp(path.join(root, "demo-output"), demoRoot, { recursive: true });
await copyFile(
  path.join(root, "docs", "assets", "pipesonata-demo.png"),
  path.join(demoRoot, `${prefix}-workbench.png`),
);

const sourceRoot = path.join(stagingDirectory, `${prefix}-source`);
await mkdir(sourceRoot, { recursive: true });
await copyTrackedSource(sourceRoot);
const revision = run("git", ["rev-parse", "HEAD"]).trim();
await writeFile(path.join(sourceRoot, "SOURCE_REVISION.txt"), `${revision}\n`, "utf8");

const archives = [
  {
    directory: staticRoot,
    filename: `${prefix}-web-static.tar.gz`,
  },
  {
    directory: demoRoot,
    filename: `${prefix}-web-demo.tar.gz`,
  },
  {
    directory: sourceRoot,
    filename: `${prefix}-source.tar.gz`,
  },
];
for (const archive of archives) {
  await archiveDirectory(archive.directory, path.join(releaseDirectory, archive.filename));
}

await rm(stagingDirectory, { recursive: true, force: true });

const npmExecutable = process.env.npm_execpath ? process.execPath : "npm";
const npmArguments = process.env.npm_execpath ? [process.env.npm_execpath] : [];
const sbom = run(
  npmExecutable,
  [
    ...npmArguments,
    "sbom",
    "--package-lock-only",
    "--sbom-format=cyclonedx",
    "--sbom-type=application",
  ],
  {
    env: {
      ...process.env,
      NO_UPDATE_NOTIFIER: "1",
      npm_config_update_notifier: "false",
    },
  },
);
const sbomFilename = `${prefix}-sbom.cdx.json`;
await writeFile(path.join(releaseDirectory, sbomFilename), sbom, "utf8");

const treeState = run("git", ["status", "--porcelain"]).trim() ? "dirty" : "clean";
const provenanceFilename = `${prefix}-provenance.json`;
await writeFile(
  path.join(releaseDirectory, provenanceFilename),
  `${JSON.stringify(
    {
      schema: "pipesonata.release/v1",
      name: slug,
      version,
      revision,
      treeState,
      node: process.version,
      platform: `${process.platform}-${process.arch}`,
      assets: [...archives.map((archive) => archive.filename), sbomFilename],
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const assets = (await readdir(releaseDirectory))
  .filter((filename) => filename !== "SHA256SUMS.txt")
  .sort();
const checksums = [];
for (const filename of assets) {
  checksums.push(`${await sha256(path.join(releaseDirectory, filename))}  ${filename}`);
}
await writeFile(path.join(releaseDirectory, "SHA256SUMS.txt"), `${checksums.join("\n")}\n`, "utf8");

console.log(`Release package created in ${path.relative(root, releaseDirectory)}:`);
for (const filename of [...assets, "SHA256SUMS.txt"]) {
  const fileStat = await stat(path.join(releaseDirectory, filename));
  console.log(`  ${filename} (${fileStat.size} bytes)`);
}
