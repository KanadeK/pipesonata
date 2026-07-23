import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { analyzeWorkflow } from "../../src/core/analyzeWorkflow";
import { createMidiLikeJson } from "../../src/core/exporters";

interface FixtureDocument {
  expected: {
    criticalPath: string[];
    maxParallelism: number;
    conclusion: string;
  };
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe.each(["fast", "serial-bottleneck", "flaky"])("%s fixture", (fixtureName) => {
  it("matches its checked-in acceptance contract", async () => {
    const fixturePath = path.join(repositoryRoot, "examples", `${fixtureName}.json`);
    const text = await readFile(fixturePath, "utf8");
    const fixture = JSON.parse(text) as FixtureDocument;
    const analysis = analyzeWorkflow(JSON.parse(text) as unknown);

    expect(analysis.criticalPath.jobNames).toEqual(fixture.expected.criticalPath);
    expect(analysis.summary.maxParallelism).toBe(fixture.expected.maxParallelism);
    expect(analysis.workflow.conclusion).toBe(fixture.expected.conclusion);
    expect(createMidiLikeJson(analysis)).toBe(
      createMidiLikeJson(analyzeWorkflow(JSON.parse(text) as unknown)),
    );
  });
});
