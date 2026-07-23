export type WorkflowConclusion =
  | "success"
  | "failure"
  | "cancelled"
  | "skipped"
  | "neutral"
  | "timed_out"
  | "action_required"
  | "stale"
  | null;

export interface WorkflowSource {
  provider: string;
  repository: string;
  runUrl?: string;
}

export interface NormalizedStep {
  id: string;
  number: number;
  name: string;
  status: string;
  conclusion: WorkflowConclusion;
  startedAtMs: number;
  completedAtMs: number;
  durationMs: number;
  attempt: number;
  retryCount: number;
}

export interface NormalizedJob {
  id: string;
  name: string;
  status: string;
  conclusion: WorkflowConclusion;
  createdAtMs: number;
  startedAtMs: number;
  completedAtMs: number;
  queueMs: number;
  durationMs: number;
  attempt: number;
  needs: string[];
  lane: number;
  steps: NormalizedStep[];
}

export interface NormalizedWorkflow {
  id: string;
  name: string;
  event: string;
  status: string;
  conclusion: WorkflowConclusion;
  attempt: number;
  createdAtMs: number;
  startedAtMs: number;
  completedAtMs: number;
  durationMs: number;
  headSha?: string;
  source: WorkflowSource;
  jobs: NormalizedJob[];
}

export interface CriticalPath {
  jobIds: string[];
  jobNames: string[];
  durationMs: number;
  confidence: "explicit" | "lower-bound";
}

export type HotspotKind = "repeated-install" | "unstable-step" | "failure" | "queue";

export interface Hotspot {
  id: string;
  kind: HotspotKind;
  severity: "high" | "medium" | "low";
  label: string;
  detail: string;
  occurrences: number;
  wasteMs: number;
  jobIds: string[];
}

export interface ScoreNote {
  id: string;
  jobId: string;
  stepId: string;
  label: string;
  pitch: string;
  midi: number;
  frequency: number;
  channel: number;
  velocity: number;
  startBeat: number;
  durationBeats: number;
  outcome: WorkflowConclusion;
}

export interface WorkflowScore {
  schema: "pipesonata.score/v1";
  tempoBpm: number;
  scale: string;
  durationBeats: number;
  notes: ScoreNote[];
}

export interface AnalysisSummary {
  durationMs: number;
  jobCount: number;
  stepCount: number;
  maxParallelism: number;
  averageParallelism: number;
  totalQueueMs: number;
  failedStepCount: number;
  retryCount: number;
}

export interface WorkflowAnalysis {
  workflow: NormalizedWorkflow;
  summary: AnalysisSummary;
  criticalPath: CriticalPath;
  hotspots: Hotspot[];
  score: WorkflowScore;
}
