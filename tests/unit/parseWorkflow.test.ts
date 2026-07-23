import { describe, expect, it } from "vitest";

import { DomainInputError, parseWorkflowInput } from "../../src/core/parseWorkflow";
import { workflowFixture } from "../helpers/workflowFixture";

describe("parseWorkflowInput", () => {
  it("normalizes real job and step timing", () => {
    const workflow = parseWorkflowInput(workflowFixture);

    expect(workflow.id).toBe("42001");
    expect(workflow.durationMs).toBe(40_000);
    expect(workflow.jobs).toHaveLength(4);
    expect(workflow.jobs[0]).toMatchObject({
      id: "1",
      name: "build",
      queueMs: 5_000,
      durationMs: 10_000,
    });
    expect(workflow.jobs[0]?.steps[1]).toMatchObject({
      name: "npm ci",
      durationMs: 4_000,
    });
  });

  it("rejects a step that finishes before it starts", () => {
    const invalid = structuredClone(workflowFixture);
    invalid.jobs[0]!.steps[0]!.completed_at = "2026-07-22T23:59:59.000Z";

    expect(() => parseWorkflowInput(invalid)).toThrowError(DomainInputError);
    expect(() => parseWorkflowInput(invalid)).toThrow(/Checkout.*finishes before it starts/i);
  });

  it("explains why a run-only GitHub payload cannot be analyzed", () => {
    expect(() =>
      parseWorkflowInput({
        id: 1,
        name: "CI",
        created_at: "2026-07-23T00:00:00.000Z",
      }),
    ).toThrow(/jobs endpoint/i);
  });
});
