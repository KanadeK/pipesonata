import type { Hotspot, NormalizedWorkflow } from "./model";

const installPattern =
  /\b(?:npm ci|npm install|pnpm install|yarn install|pip install|poetry install|bundle install|cargo fetch|restore dependencies|install dependencies|setup dependencies)\b/i;

function normalizeStepName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function severityRank(severity: Hotspot["severity"]): number {
  return { high: 0, medium: 1, low: 2 }[severity];
}

export function identifyHotspots(workflow: NormalizedWorkflow): Hotspot[] {
  const hotspots: Hotspot[] = [];
  const installs = new Map<
    string,
    Array<{ jobId: string; stepName: string; durationMs: number }>
  >();

  for (const job of workflow.jobs) {
    if (job.attempt > 1) {
      hotspots.push({
        id: `unstable-job:${job.id}`,
        kind: "unstable-step",
        severity: "high",
        label: job.name,
        detail: `Job completed on attempt ${job.attempt}.`,
        occurrences: job.attempt,
        wasteMs: 0,
        jobIds: [job.id],
      });
    }

    const queueThresholdMs = Math.max(5_000, workflow.durationMs * 0.1);
    if (job.queueMs >= queueThresholdMs) {
      hotspots.push({
        id: `queue:${job.id}`,
        kind: "queue",
        severity: job.queueMs >= workflow.durationMs * 0.5 ? "high" : "medium",
        label: job.name,
        detail: `Queued for ${Math.round(job.queueMs / 100) / 10} seconds before execution.`,
        occurrences: 1,
        wasteMs: job.queueMs,
        jobIds: [job.id],
      });
    }

    let hasFailedStep = false;
    for (const step of job.steps) {
      const normalizedName = normalizeStepName(step.name);
      if (installPattern.test(normalizedName)) {
        const occurrences = installs.get(normalizedName) ?? [];
        occurrences.push({
          jobId: job.id,
          stepName: step.name,
          durationMs: step.durationMs,
        });
        installs.set(normalizedName, occurrences);
      }

      if (step.retryCount > 0 || step.attempt > 1) {
        const attempts = Math.max(step.attempt, step.retryCount + 1);
        hotspots.push({
          id: `unstable-step:${step.id}`,
          kind: "unstable-step",
          severity: attempts > 1 ? "high" : "medium",
          label: step.name,
          detail: `Step required ${attempts} attempts or recorded retries.`,
          occurrences: attempts,
          wasteMs: 0,
          jobIds: [job.id],
        });
      }

      if (step.conclusion === "failure" || step.conclusion === "timed_out") {
        hasFailedStep = true;
        hotspots.push({
          id: `failure:${step.id}`,
          kind: "failure",
          severity: "high",
          label: step.name,
          detail: `Step concluded with ${step.conclusion}.`,
          occurrences: 1,
          wasteMs: step.durationMs,
          jobIds: [job.id],
        });
      }
    }

    if (!hasFailedStep && (job.conclusion === "failure" || job.conclusion === "timed_out")) {
      hotspots.push({
        id: `failure-job:${job.id}`,
        kind: "failure",
        severity: "high",
        label: job.name,
        detail: `Job concluded with ${job.conclusion} without a failed step record.`,
        occurrences: 1,
        wasteMs: job.durationMs,
        jobIds: [job.id],
      });
    }
  }

  for (const [normalizedName, occurrences] of installs) {
    if (occurrences.length < 2) {
      continue;
    }
    const durations = occurrences.map((occurrence) => occurrence.durationMs);
    const baselineMs = Math.max(...durations);
    const totalMs = durations.reduce((sum, durationMs) => sum + durationMs, 0);
    const wasteMs = Math.max(0, totalMs - baselineMs);
    hotspots.push({
      id: `repeated-install:${normalizedName}`,
      kind: "repeated-install",
      severity: occurrences.length >= 3 || wasteMs >= 10_000 ? "high" : "medium",
      label: occurrences[0]?.stepName ?? normalizedName,
      detail: `${occurrences.length} matching dependency installation steps were observed.`,
      occurrences: occurrences.length,
      wasteMs,
      jobIds: [...new Set(occurrences.map((occurrence) => occurrence.jobId))],
    });
  }

  return hotspots.sort(
    (left, right) =>
      severityRank(left.severity) - severityRank(right.severity) ||
      right.wasteMs - left.wasteMs ||
      left.kind.localeCompare(right.kind) ||
      left.label.localeCompare(right.label),
  );
}
