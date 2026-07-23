import { describe, expect, it } from "vitest";

import { calculateCriticalPath } from "../../src/core/criticalPath";
import { parseWorkflowInput } from "../../src/core/parseWorkflow";
import { workflowFixture } from "../helpers/workflowFixture";

describe("calculateCriticalPath", () => {
  it("finds the longest dependency path", () => {
    const workflow = parseWorkflowInput(workflowFixture);
    const path = calculateCriticalPath(workflow);

    expect(path.jobNames).toEqual(["build", "test", "deploy"]);
    expect(path.durationMs).toBe(40_000);
    expect(path.confidence).toBe("explicit");
  });

  it("rejects cyclic dependency data", () => {
    const cyclic = structuredClone(workflowFixture);
    cyclic.jobs[0]!.needs = ["deploy"];

    expect(() => calculateCriticalPath(parseWorkflowInput(cyclic))).toThrow(/cycle/i);
  });

  it("labels a dependency-free result as a lower bound", () => {
    const independent = structuredClone(workflowFixture);
    for (const job of independent.jobs) {
      job.needs = [];
    }

    const path = calculateCriticalPath(parseWorkflowInput(independent));
    expect(path.jobNames).toEqual(["test"]);
    expect(path.durationMs).toBe(20_000);
    expect(path.confidence).toBe("lower-bound");
  });
});
