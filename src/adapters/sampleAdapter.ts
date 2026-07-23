import fast from "../../examples/fast.json";
import flaky from "../../examples/flaky.json";
import serialBottleneck from "../../examples/serial-bottleneck.json";
import { analyzeWorkflow } from "../core/analyzeWorkflow";
import type { WorkflowAnalysis } from "../core/model";

export type SampleId = "fast" | "serial-bottleneck" | "flaky";

export interface SampleDefinition {
  id: SampleId;
  label: string;
  description: string;
}

export const samples: readonly SampleDefinition[] = [
  {
    id: "fast",
    label: "Fast fan-out",
    description: "A short three-lane fan-out with a clean package join.",
  },
  {
    id: "serial-bottleneck",
    label: "Serial bottleneck",
    description: "A 180-second dependency chain with no parallel work.",
  },
  {
    id: "flaky",
    label: "Flaky browser suite",
    description: "Retries, repeated installs, and a failed Playwright step.",
  },
];

const payloads: Record<SampleId, unknown> = {
  fast,
  "serial-bottleneck": serialBottleneck,
  flaky,
};

export function loadSample(id: SampleId): WorkflowAnalysis {
  return analyzeWorkflow(structuredClone(payloads[id]));
}
