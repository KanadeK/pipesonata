import { describe, expect, it } from "vitest";

import { analyzeWorkflow } from "../../src/core/analyzeWorkflow";
import { createEngineeringReport, createMidiLikeJson } from "../../src/core/exporters";
import { redactSensitiveText } from "../../src/core/redact";
import { workflowFixture } from "../helpers/workflowFixture";

describe("deterministic exports", () => {
  it("serializes a stable MIDI-like document", () => {
    const analysis = analyzeWorkflow(workflowFixture);
    const first = createMidiLikeJson(analysis);
    const second = createMidiLikeJson(analyzeWorkflow(structuredClone(workflowFixture)));
    const document = JSON.parse(first) as { schema: string; notes: unknown[] };

    expect(second).toBe(first);
    expect(document.schema).toBe("pipesonata.notes/v1");
    expect(document.notes).toHaveLength(8);
  });

  it("redacts common credentials from text and reports", () => {
    const syntheticToken = `ghp_${"a".repeat(36)}`;
    const text = `Authorization: Bearer ${syntheticToken}\npassword=hunter-two`;
    const redacted = redactSensitiveText(text);

    expect(redacted).not.toContain(syntheticToken);
    expect(redacted).not.toContain("hunter-two");
    expect(redacted).toContain("[REDACTED]");

    const fixtureWithSecret = structuredClone(workflowFixture);
    fixtureWithSecret.jobs[3]!.steps[0]!.name = `Publish token=${syntheticToken}`;
    const report = createEngineeringReport(analyzeWorkflow(fixtureWithSecret));

    expect(report).not.toContain(syntheticToken);
    expect(report).toContain("[REDACTED]");
    expect(report).toContain("Critical path");
  });
});
