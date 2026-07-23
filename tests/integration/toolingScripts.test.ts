import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

function runGit(cwd: string, arguments_: string[]) {
  const result = spawnSync("git", arguments_, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("release tooling", () => {
  it("skips tracked paths deleted during a rename while scanning new files", async () => {
    const fixtureRoot = await mkdtemp(path.join(tmpdir(), "pipesonata-secret-scan-"));
    temporaryDirectories.push(fixtureRoot);
    const scriptsDirectory = path.join(fixtureRoot, "scripts");
    await mkdir(scriptsDirectory);
    await writeFile(path.join(fixtureRoot, "deleted.txt"), "safe tracked content\n", "utf8");
    await writeFile(path.join(fixtureRoot, "kept.txt"), "safe working content\n", "utf8");
    runGit(fixtureRoot, ["init"]);
    runGit(fixtureRoot, ["add", "deleted.txt", "kept.txt"]);
    await unlink(path.join(fixtureRoot, "deleted.txt"));
    await copyFile(
      path.resolve("scripts", "scan-secrets.mjs"),
      path.join(scriptsDirectory, "scan-secrets.mjs"),
    );
    await copyFile(
      path.resolve("scripts", "git_files.mjs"),
      path.join(scriptsDirectory, "git_files.mjs"),
    );

    const scan = spawnSync(process.execPath, [path.join(scriptsDirectory, "scan-secrets.mjs")], {
      cwd: fixtureRoot,
      encoding: "utf8",
    });

    expect(scan.status, scan.stderr).toBe(0);
    expect(scan.stdout).toContain("Secret scan passed");
  });

  it("creates an archive from a non-ASCII workspace with relative tar paths", async () => {
    const fixtureRoot = await mkdtemp(path.join(tmpdir(), "pipesonata-tar-"));
    temporaryDirectories.push(fixtureRoot);
    const workspace = path.join(fixtureRoot, "管道乐章");
    await mkdir(path.join(workspace, "staging", "package"), { recursive: true });
    await mkdir(path.join(workspace, "release"), { recursive: true });
    await writeFile(
      path.join(workspace, "staging", "package", "result.txt"),
      "real release content\n",
      "utf8",
    );

    const archive = spawnSync(
      "tar",
      ["-czf", "release/package.tar.gz", "-C", "staging", "package"],
      { cwd: workspace, encoding: "utf8" },
    );
    expect(archive.status, archive.stderr).toBe(0);

    const listing = spawnSync("tar", ["-tzf", "release/package.tar.gz"], {
      cwd: workspace,
      encoding: "utf8",
    });
    expect(listing.status, listing.stderr).toBe(0);
    expect(listing.stdout).toContain("package/result.txt");
  });
});
