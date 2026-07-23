import { describe, expect, it } from "vitest";

import { analyzeWorkflow } from "../../src/core/analyzeWorkflow";
import { calculateCriticalPath } from "../../src/core/criticalPath";
import { createEngineeringReport } from "../../src/core/exporters";
import { DomainInputError, parseWorkflowInput } from "../../src/core/parseWorkflow";
import { workflowFixture } from "../helpers/workflowFixture";

describe("workflow edge cases", () => {
  it("accepts an embedded GitHub shape and normalizes an active zero-duration run", () => {
    const analysis = analyzeWorkflow({
      id: "raw-run",
      workflow_name: "Raw CI",
      created_at: "2026-07-23T00:00:00.000Z",
      conclusion: "custom-conclusion",
      jobs: [
        {
          id: "solo",
          name: "solo",
          started_at: "2026-07-23T00:00:10.000Z",
          completed_at: null,
          steps: [
            {
              id: "active-step",
              name: "Active",
              started_at: "2026-07-23T00:00:10.000Z",
              completed_at: null,
            },
            {
              name: "Skipped",
              conclusion: "skipped",
              started_at: "2026-07-23T00:00:10.000Z",
              completed_at: null,
            },
            {
              name: "Cancelled",
              conclusion: "cancelled",
              started_at: "2026-07-23T00:00:10.000Z",
              completed_at: null,
            },
          ],
        },
      ],
    });

    expect(analysis.workflow).toMatchObject({
      name: "Raw CI",
      event: "unknown",
      status: "completed",
      conclusion: null,
      durationMs: 0,
      source: {
        provider: "github-actions",
        repository: "local-fixture",
      },
    });
    expect(analysis.workflow.jobs[0]).toMatchObject({
      status: "completed",
      queueMs: 10_000,
      needs: [],
    });
    expect(analysis.summary.averageParallelism).toBe(0);
    expect(analysis.score.notes.map((note) => note.velocity)).toEqual([62, 30, 44]);
  });

  it("reports a clean in-progress workflow without inventing hotspots", () => {
    const analysis = analyzeWorkflow({
      run: {
        id: "clean",
        name: "Clean run",
        created_at: "2026-07-23T00:00:00.000Z",
        run_started_at: "2026-07-23T00:00:00.000Z",
        updated_at: "2026-07-23T00:00:01.000Z",
        status: "in_progress",
        conclusion: null,
      },
      jobs: [
        {
          id: "compile",
          name: "compile",
          created_at: "2026-07-23T00:00:00.000Z",
          started_at: "2026-07-23T00:00:00.000Z",
          completed_at: "2026-07-23T00:00:01.000Z",
          conclusion: "success",
          needs: [],
          steps: [
            {
              number: 1,
              name: "Compile",
              started_at: "2026-07-23T00:00:00.000Z",
              completed_at: "2026-07-23T00:00:01.000Z",
              conclusion: "success",
            },
          ],
        },
      ],
    });
    const report = createEngineeringReport(analysis);

    expect(analysis.hotspots).toEqual([]);
    expect(report).toContain("No engineering hotspots were detected");
    expect(report).toContain("Conclusion: in progress");
  });

  it("rejects malformed object, schema, job timing, and run timing inputs", () => {
    expect(() => parseWorkflowInput(null)).toThrow(DomainInputError);
    expect(() =>
      parseWorkflowInput({
        run: {
          id: "empty",
          name: "Empty",
          created_at: "2026-07-23T00:00:00.000Z",
        },
        jobs: [],
      }),
    ).toThrow(/jobs/i);

    const reversedJob = structuredClone(workflowFixture);
    reversedJob.jobs[0]!.completed_at = "2026-07-22T23:59:59.000Z";
    expect(() => parseWorkflowInput(reversedJob)).toThrow(/Job "build" finishes before/i);

    const reversedRun = structuredClone(workflowFixture);
    reversedRun.run.run_started_at = "2026-07-23T00:01:00.000Z";
    expect(() => parseWorkflowInput(reversedRun)).toThrow(/Workflow run finishes before/i);
  });
});

describe("critical path validation", () => {
  it("rejects duplicate names and missing dependency references", () => {
    const duplicate = structuredClone(workflowFixture);
    duplicate.jobs[1]!.name = "build";
    expect(() => calculateCriticalPath(parseWorkflowInput(duplicate))).toThrow(/duplicated/i);

    const missing = structuredClone(workflowFixture);
    missing.jobs[1]!.needs = ["ghost"];
    expect(() => calculateCriticalPath(parseWorkflowInput(missing))).toThrow(/missing dependency/i);
  });

  it("uses a deterministic lexical tie-break for equal independent jobs", () => {
    const parsed = parseWorkflowInput({
      run: {
        id: "tie",
        name: "Tie",
        created_at: "2026-07-23T00:00:00.000Z",
        run_started_at: "2026-07-23T00:00:00.000Z",
        updated_at: "2026-07-23T00:00:01.000Z",
      },
      jobs: [
        {
          id: "a",
          name: "alpha",
          started_at: "2026-07-23T00:00:00.000Z",
          completed_at: "2026-07-23T00:00:01.000Z",
        },
        {
          id: "b",
          name: "beta",
          started_at: "2026-07-23T00:00:00.000Z",
          completed_at: "2026-07-23T00:00:01.000Z",
        },
      ],
    });
    parsed.jobs.reverse();

    expect(calculateCriticalPath(parsed).jobNames).toEqual(["alpha"]);
  });
});

describe("hotspot classification", () => {
  it("reports a job-level failure when no failed step is present", () => {
    const jobFailure = structuredClone(workflowFixture);
    jobFailure.jobs[3]!.steps[0]!.conclusion = "success";
    const analysis = analyzeWorkflow(jobFailure);

    expect(analysis.hotspots).toContainEqual(
      expect.objectContaining({
        id: "failure-job:4",
        kind: "failure",
        label: "deploy",
      }),
    );
  });

  it("classifies two repeated installs by observed excess time", () => {
    const repeated = {
      run: {
        id: "install-run",
        name: "Install run",
        created_at: "2026-07-23T00:00:00.000Z",
        run_started_at: "2026-07-23T00:00:00.000Z",
        updated_at: "2026-07-23T00:00:23.000Z",
      },
      jobs: [
        {
          id: "one",
          name: "one",
          created_at: "2026-07-23T00:00:00.000Z",
          started_at: "2026-07-23T00:00:00.000Z",
          completed_at: "2026-07-23T00:00:12.000Z",
          steps: [
            {
              name: "npm ci (node 24)",
              started_at: "2026-07-23T00:00:00.000Z",
              completed_at: "2026-07-23T00:00:12.000Z",
            },
          ],
        },
        {
          id: "two",
          name: "two",
          created_at: "2026-07-23T00:00:12.000Z",
          started_at: "2026-07-23T00:00:12.000Z",
          completed_at: "2026-07-23T00:00:23.000Z",
          steps: [
            {
              name: "npm ci [linux]",
              started_at: "2026-07-23T00:00:12.000Z",
              completed_at: "2026-07-23T00:00:23.000Z",
            },
          ],
        },
      ],
    };
    const hotspot = analyzeWorkflow(repeated).hotspots.find(
      (candidate) => candidate.kind === "repeated-install",
    );

    expect(hotspot).toMatchObject({
      severity: "high",
      occurrences: 2,
      wasteMs: 11_000,
    });
  });
});
