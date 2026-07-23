import { describe, expect, it } from "vitest";

import { analyzeWorkflow } from "../../src/core/analyzeWorkflow";
import { workflowFixture } from "../helpers/workflowFixture";

describe("analyzeWorkflow", () => {
  it("derives concurrency, queueing, failures, retries, and repeated installs", () => {
    const analysis = analyzeWorkflow(workflowFixture);

    expect(analysis.summary).toMatchObject({
      durationMs: 40_000,
      jobCount: 4,
      stepCount: 8,
      maxParallelism: 2,
      averageParallelism: 1.25,
      totalQueueMs: 70_000,
      failedStepCount: 1,
      retryCount: 2,
    });
    expect(analysis.hotspots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "repeated-install",
          occurrences: 3,
          wasteMs: 5_000,
        }),
        expect.objectContaining({
          kind: "unstable-step",
          label: "Unit tests",
        }),
        expect.objectContaining({
          kind: "failure",
          label: "Publish",
        }),
      ]),
    );
  });

  it("is deterministic for identical input", () => {
    const first = analyzeWorkflow(workflowFixture);
    const second = analyzeWorkflow(structuredClone(workflowFixture));

    expect(second).toEqual(first);
    expect(first.score.notes).toHaveLength(8);
    expect(first.score.notes.every((note) => Number.isFinite(note.frequency))).toBe(true);
  });
});
