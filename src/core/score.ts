import { Note, Scale } from "@tonaljs/tonal";

import type { NormalizedWorkflow, ScoreNote, WorkflowConclusion, WorkflowScore } from "./model";

const TEMPO_BPM = 120;
const SUCCESS_SCALE = Scale.get("C4 minor pentatonic").notes;
const FAILURE_PITCHES = ["C3", "Db3", "G2"];

function round(value: number, precision = 3): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function velocityFor(conclusion: WorkflowConclusion): number {
  switch (conclusion) {
    case "failure":
    case "timed_out":
      return 108;
    case "cancelled":
      return 44;
    case "skipped":
      return 30;
    case "success":
      return 76;
    default:
      return 62;
  }
}

function resolvePitch(lane: number, stepNumber: number, conclusion: WorkflowConclusion): string {
  if (conclusion === "failure" || conclusion === "timed_out") {
    return FAILURE_PITCHES[(lane + stepNumber - 1) % FAILURE_PITCHES.length] ?? "C3";
  }
  return SUCCESS_SCALE[(lane * 2 + stepNumber - 1) % SUCCESS_SCALE.length] ?? "C4";
}

function createNote(
  workflow: NormalizedWorkflow,
  jobId: string,
  lane: number,
  step: NormalizedWorkflow["jobs"][number]["steps"][number],
): ScoreNote {
  const pitch = resolvePitch(lane, step.number, step.conclusion);
  const midi = Note.midi(pitch);
  const frequency = Note.freq(pitch);
  if (midi === null || frequency === null) {
    throw new Error(`Tonal could not resolve generated pitch "${pitch}".`);
  }

  const beatsPerSecond = TEMPO_BPM / 60;
  return {
    id: `note:${step.id}`,
    jobId,
    stepId: step.id,
    label: step.name,
    pitch,
    midi,
    frequency: round(frequency, 4),
    channel: lane % 16,
    velocity: velocityFor(step.conclusion),
    startBeat: round(((step.startedAtMs - workflow.startedAtMs) / 1000) * beatsPerSecond),
    durationBeats: Math.max(0.25, round((step.durationMs / 1000) * beatsPerSecond)),
    outcome: step.conclusion,
  };
}

export function createWorkflowScore(workflow: NormalizedWorkflow): WorkflowScore {
  const notes = workflow.jobs
    .flatMap((job) => job.steps.map((step) => createNote(workflow, job.id, job.lane, step)))
    .sort(
      (left, right) =>
        left.startBeat - right.startBeat ||
        left.channel - right.channel ||
        left.id.localeCompare(right.id),
    );

  return {
    schema: "pipesonata.score/v1",
    tempoBpm: TEMPO_BPM,
    scale: "C minor pentatonic with failure cadence",
    durationBeats: round((workflow.durationMs / 1000) * (TEMPO_BPM / 60)),
    notes,
  };
}
