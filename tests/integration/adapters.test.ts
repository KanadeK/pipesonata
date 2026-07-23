import { describe, expect, it } from "vitest";

import { analyzeWorkflowFiles } from "../../src/adapters/fileAdapter";
import {
  AdapterError,
  analyzeWorkflowJson,
  combineGitHubPayloads,
  readWorkflowJson,
} from "../../src/adapters/jsonAdapter";
import { loadSample } from "../../src/adapters/sampleAdapter";
import fast from "../../examples/fast.json";

describe("JSON adapter", () => {
  it("parses and analyzes a checked-in combined payload", () => {
    const analysis = analyzeWorkflowJson(JSON.stringify(fast));
    expect(analysis.workflow.name).toBe("Fast CI");
    expect(analysis.summary.maxParallelism).toBe(3);
  });

  it("rejects invalid and oversized JSON", () => {
    expect(() => readWorkflowJson("{not-json")).toThrow(AdapterError);
    expect(() => readWorkflowJson('{"valid":true}', 4)).toThrow(/safety limit/i);
  });

  it("combines standard run and jobs endpoint responses", () => {
    const run = {
      ...fast.run,
      repository: { full_name: "octo-org/real-repository" },
      html_url: "https://github.com/octo-org/real-repository/actions/runs/1001",
    };
    const jobs = { total_count: fast.jobs.length, jobs: fast.jobs };
    const combined = combineGitHubPayloads(run, jobs) as {
      source: { repository: string; runUrl: string };
      jobs: unknown[];
    };

    expect(combined.source).toEqual({
      provider: "github-actions",
      repository: "octo-org/real-repository",
      runUrl: "https://github.com/octo-org/real-repository/actions/runs/1001",
    });
    expect(combined.jobs).toHaveLength(5);
  });

  it("rejects mismatched endpoint payloads", () => {
    expect(() => combineGitHubPayloads({}, { jobs: [] })).toThrow(/run payload/i);
    expect(() => combineGitHubPayloads(fast.run, {})).toThrow(/jobs payload/i);
  });
});

describe("browser file adapter", () => {
  it("loads one combined file", async () => {
    const file = new File([JSON.stringify(fast)], "fast.json", {
      type: "application/json",
    });
    const analysis = await analyzeWorkflowFiles([file]);
    expect(analysis.criticalPath.jobNames).toEqual(["prepare", "test", "package"]);
  });

  it("loads a run and jobs pair in either order", async () => {
    const run = new File([JSON.stringify(fast.run)], "run.json");
    const jobs = new File([JSON.stringify({ total_count: 5, jobs: fast.jobs })], "jobs.json");
    const analysis = await analyzeWorkflowFiles([jobs, run]);
    expect(analysis.workflow.id).toBe("1001");
    expect(analysis.workflow.jobs).toHaveLength(5);
  });

  it("rejects missing, excessive, and ambiguous file selections", async () => {
    await expect(analyzeWorkflowFiles([])).rejects.toThrow(/choose one/i);
    const files = [new File(["{}"], "a"), new File(["{}"], "b"), new File(["{}"], "c")];
    await expect(analyzeWorkflowFiles(files)).rejects.toThrow(/at most two/i);
    await expect(analyzeWorkflowFiles(files.slice(0, 2))).rejects.toThrow(/requires one/i);
  });
});

describe("sample adapter", () => {
  it("returns independent analyses for every bundled scenario", () => {
    const fastAnalysis = loadSample("fast");
    const flakyAnalysis = loadSample("flaky");
    expect(fastAnalysis.workflow.conclusion).toBe("success");
    expect(flakyAnalysis.workflow.conclusion).toBe("failure");
    expect(flakyAnalysis.summary.retryCount).toBeGreaterThan(0);
  });
});
