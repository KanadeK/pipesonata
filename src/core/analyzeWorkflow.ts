import { calculateCriticalPath } from "./criticalPath";
import { identifyHotspots } from "./hotspots";
import type { AnalysisSummary, NormalizedWorkflow, WorkflowAnalysis } from "./model";
import { parseWorkflowInput } from "./parseWorkflow";
import { createWorkflowScore } from "./score";

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function calculateParallelism(workflow: NormalizedWorkflow): {
  maxParallelism: number;
  averageParallelism: number;
} {
  const changes = new Map<number, number>();
  for (const job of workflow.jobs) {
    changes.set(job.startedAtMs, (changes.get(job.startedAtMs) ?? 0) + 1);
    changes.set(job.completedAtMs, (changes.get(job.completedAtMs) ?? 0) - 1);
  }

  const times = [...changes.keys()].sort((left, right) => left - right);
  let active = 0;
  let maxParallelism = 0;
  let weightedActiveMs = 0;
  let previousTime = times[0] ?? workflow.startedAtMs;

  for (const time of times) {
    weightedActiveMs += active * Math.max(0, time - previousTime);
    active += changes.get(time) ?? 0;
    maxParallelism = Math.max(maxParallelism, active);
    previousTime = time;
  }

  return {
    maxParallelism,
    averageParallelism:
      workflow.durationMs === 0 ? 0 : round(weightedActiveMs / workflow.durationMs),
  };
}

function createSummary(workflow: NormalizedWorkflow): AnalysisSummary {
  const parallelism = calculateParallelism(workflow);
  const steps = workflow.jobs.flatMap((job) => job.steps);
  return {
    durationMs: workflow.durationMs,
    jobCount: workflow.jobs.length,
    stepCount: steps.length,
    ...parallelism,
    totalQueueMs: workflow.jobs.reduce((sum, job) => sum + job.queueMs, 0),
    failedStepCount: steps.filter(
      (step) => step.conclusion === "failure" || step.conclusion === "timed_out",
    ).length,
    retryCount:
      workflow.jobs.reduce((sum, job) => sum + Math.max(0, job.attempt - 1), 0) +
      steps.reduce((sum, step) => sum + step.retryCount + Math.max(0, step.attempt - 1), 0),
  };
}

export function analyzeWorkflow(input: unknown): WorkflowAnalysis {
  const workflow = parseWorkflowInput(input);
  return {
    workflow,
    summary: createSummary(workflow),
    criticalPath: calculateCriticalPath(workflow),
    hotspots: identifyHotspots(workflow),
    score: createWorkflowScore(workflow),
  };
}
