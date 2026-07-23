import { expect, test, type Download, type Page } from "@playwright/test";

async function readDownload(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function downloadFrom(page: Page, buttonName: string): Promise<Download> {
  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  return pendingDownload;
}

test("loads deterministic fixtures and exposes the proven critical path", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hear where CI waits.");
  await page.getByLabel("Load a bundled fixture").selectOption("serial-bottleneck");

  await expect(page.locator(".run-identity strong")).toHaveText("Serial release");
  await expect(page.getByLabel("Workflow summary")).toContainText("3m 0s");
  await expect(page.getByLabel("Workflow summary")).toContainText("Peak lanes1");
  await expect(page.locator(".path-sequence")).toHaveText("preparecompileunitintegrationpackage");
  await expect(
    page.getByRole("img", { name: /Workflow timing score for Serial release/ }),
  ).toBeVisible();
});

test("imports a real combined GitHub fixture without sending it away", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("workflow-file-input").setInputFiles("examples/flaky.json");

  await expect(page.locator(".run-identity strong")).toHaveText("Flaky browser suite");
  await expect(page.getByText("Imported 4 jobs and 8 steps locally.")).toBeVisible();
  await expect(page.locator(".run-conclusion")).toHaveText("failure");
  await expect(page.getByLabel("Workflow summary")).toContainText("Retries6");
  await expect(page.locator(".hotspot-list")).toContainText("Playwright tests");
});

test("keeps the current analysis when an import is invalid", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("workflow-file-input").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"run":'),
  });

  await expect(page.getByRole("alert")).toContainText("Could not complete that action");
  await expect(page.getByRole("alert")).toContainText("could not be parsed");
  await expect(page.locator(".run-identity strong")).toHaveText("Fast CI");
  await expect(
    page.getByText("Import failed. The previous analysis remains available."),
  ).toBeVisible();
});

test("exports inspectable SVG, PNG, note JSON, and Markdown evidence", async ({ page }) => {
  await page.goto("/");

  const svgDownload = await downloadFrom(page, "SVG");
  const svg = (await readDownload(svgDownload)).toString("utf8");
  expect(svgDownload.suggestedFilename()).toMatch(/fast-ci-1001\.svg$/);
  expect(svg).toContain("<svg");
  expect(svg).toContain("Workflow timing score for Fast CI");

  const pngDownload = await downloadFrom(page, "PNG");
  const png = await readDownload(pngDownload);
  expect(pngDownload.suggestedFilename()).toMatch(/fast-ci-1001\.png$/);
  expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  const notesDownload = await downloadFrom(page, "Notes JSON");
  const notes = JSON.parse((await readDownload(notesDownload)).toString("utf8")) as {
    schema: string;
    notes: unknown[];
  };
  expect(notesDownload.suggestedFilename()).toMatch(/fast-ci-1001\.notes\.json$/);
  expect(notes.schema).toBe("pipesonata.notes/v1");
  expect(notes.notes).toHaveLength(9);

  const reportDownload = await downloadFrom(page, "Report");
  const report = (await readDownload(reportDownload)).toString("utf8");
  expect(reportDownload.suggestedFilename()).toMatch(/fast-ci-1001\.report\.md$/);
  expect(report).toContain("# PipeSonata engineering report");
  expect(report).toContain("prepare -> test -> package");
});

test("preserves keyboard, theme, reduced-motion, and narrow-screen usability", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");

  await page.keyboard.press("Tab");
  await expect(page.locator(".brand")).toBeFocused();

  const themeButton = page.getByRole("button", { name: "Switch to dark theme" });
  await themeButton.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => window.localStorage.getItem("pipesonata-theme"))).toBe("dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      scoreScrollable:
        document.querySelector(".score-scroll")!.scrollWidth >
        document.querySelector(".score-scroll")!.clientWidth,
      tableScrollable:
        document.querySelector(".table-scroll")!.scrollWidth >
        document.querySelector(".table-scroll")!.clientWidth,
    })),
  ).toEqual({
    pageWidth: 390,
    viewportWidth: 390,
    scoreScrollable: true,
    tableScrollable: true,
  });

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.locator("button")).toHaveCount(8);
});
