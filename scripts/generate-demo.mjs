import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { preview } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetDirectory = path.join(root, "docs", "assets");
const outputDirectory = path.join(root, "demo-output");
const port = 43174;
const baseUrl = `http://127.0.0.1:${port}`;

await mkdir(assetDirectory, { recursive: true });
await mkdir(outputDirectory, { recursive: true });

const server = await preview({
  root,
  logLevel: "error",
  preview: {
    host: "127.0.0.1",
    port,
    strictPort: true,
  },
});
const browser = await chromium.launch();

try {
  const page = await browser.newPage({
    acceptDownloads: true,
    colorScheme: "light",
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Hear where CI waits." }).waitFor();

  if (!process.argv.includes("--skip-doc-screenshot")) {
    await page.screenshot({
      path: path.join(assetDirectory, "pipesonata-demo.png"),
      animations: "disabled",
    });
  }

  const exports = [
    ["SVG", "pipesonata-v0.1.0-fast-score.svg"],
    ["PNG", "pipesonata-v0.1.0-fast-score.png"],
    ["Notes JSON", "pipesonata-v0.1.0-fast-notes.json"],
    ["Report", "pipesonata-v0.1.0-fast-report.md"],
  ];
  for (const [buttonName, filename] of exports) {
    const pendingDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: buttonName, exact: true }).click();
    const download = await pendingDownload;
    await download.saveAs(path.join(outputDirectory, filename));
  }

  await writeFile(
    path.join(outputDirectory, "pipesonata-v0.1.0-demo-manifest.json"),
    `${JSON.stringify(
      {
        schema: "pipesonata.demo/v1",
        version: "0.1.0",
        fixture: "examples/fast.json",
        files: exports.map(([, filename]) => filename),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (!process.argv.includes("--skip-doc-screenshot")) {
    console.log(`Demo screenshot: ${path.relative(root, assetDirectory)}/pipesonata-demo.png`);
  }
  console.log(`Demo exports: ${path.relative(root, outputDirectory)}`);
} finally {
  await browser.close();
  await new Promise((resolve, reject) => {
    server.httpServer.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
