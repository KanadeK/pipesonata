import { z } from "zod";

import type {
  NormalizedJob,
  NormalizedStep,
  NormalizedWorkflow,
  WorkflowConclusion,
} from "./model";

export class DomainInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainInputError";
  }
}

const identifierSchema = z.union([z.string().min(1), z.number().finite()]);
const timestampSchema = z
  .string()
  .min(1)
  .refine((value) => Number.isFinite(Date.parse(value)), {
    message: "Expected an ISO-8601 timestamp",
  });
const conclusionSchema = z.string().nullable().optional();

const stepSchema = z
  .object({
    id: identifierSchema.optional(),
    number: z.number().int().positive().optional(),
    name: z.string().min(1),
    status: z.string().min(1).optional(),
    conclusion: conclusionSchema,
    started_at: timestampSchema,
    completed_at: timestampSchema.nullable().optional(),
    attempt: z.number().int().positive().optional(),
    retry_count: z.number().int().nonnegative().optional(),
  })
  .passthrough();

const jobSchema = z
  .object({
    id: identifierSchema,
    name: z.string().min(1),
    status: z.string().min(1).optional(),
    conclusion: conclusionSchema,
    created_at: timestampSchema.optional(),
    started_at: timestampSchema,
    completed_at: timestampSchema.nullable().optional(),
    run_attempt: z.number().int().positive().optional(),
    attempt: z.number().int().positive().optional(),
    needs: z.array(z.string().min(1)).optional(),
    steps: z.array(stepSchema).optional(),
  })
  .passthrough();

const runSchema = z
  .object({
    id: identifierSchema,
    name: z.string().min(1).optional(),
    workflow_name: z.string().min(1).optional(),
    event: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    conclusion: conclusionSchema,
    run_attempt: z.number().int().positive().optional(),
    created_at: timestampSchema,
    run_started_at: timestampSchema.optional(),
    updated_at: timestampSchema.optional(),
    head_sha: z.string().min(1).optional(),
    html_url: z.string().url().optional(),
  })
  .passthrough();

const fixtureSchema = z
  .object({
    schemaVersion: z.string().optional(),
    source: z
      .object({
        provider: z.string().min(1).optional(),
        repository: z.string().min(1).optional(),
        runUrl: z.string().url().optional(),
      })
      .optional(),
    run: runSchema,
    jobs: z.array(jobSchema).min(1),
  })
  .passthrough();

type ParsedFixture = z.infer<typeof fixtureSchema>;
type ParsedJob = z.infer<typeof jobSchema>;
type ParsedStep = z.infer<typeof stepSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTimestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new DomainInputError(`${label} has an invalid timestamp.`);
  }
  return parsed;
}

function normalizeConclusion(value: string | null | undefined): WorkflowConclusion {
  if (value === undefined || value === null) {
    return null;
  }
  const known = new Set([
    "success",
    "failure",
    "cancelled",
    "skipped",
    "neutral",
    "timed_out",
    "action_required",
    "stale",
  ]);
  return known.has(value) ? (value as WorkflowConclusion) : null;
}

function normalizeStep(
  step: ParsedStep,
  jobId: string,
  fallbackNumber: number,
  runCompletedAtMs: number,
): NormalizedStep {
  const number = step.number ?? fallbackNumber;
  const startedAtMs = parseTimestamp(step.started_at, `Step "${step.name}"`);
  const completedAtMs = step.completed_at
    ? parseTimestamp(step.completed_at, `Step "${step.name}"`)
    : runCompletedAtMs;

  if (completedAtMs < startedAtMs) {
    throw new DomainInputError(`Step "${step.name}" finishes before it starts.`);
  }

  return {
    id: step.id === undefined ? `${jobId}:step:${number}` : String(step.id),
    number,
    name: step.name,
    status: step.status ?? "completed",
    conclusion: normalizeConclusion(step.conclusion),
    startedAtMs,
    completedAtMs,
    durationMs: completedAtMs - startedAtMs,
    attempt: step.attempt ?? 1,
    retryCount: step.retry_count ?? 0,
  };
}

function normalizeJob(
  job: ParsedJob,
  runCreatedAtMs: number,
  runCompletedAtMs: number,
): Omit<NormalizedJob, "lane"> {
  const id = String(job.id);
  const startedAtMs = parseTimestamp(job.started_at, `Job "${job.name}"`);
  const completedAtMs = job.completed_at
    ? parseTimestamp(job.completed_at, `Job "${job.name}"`)
    : runCompletedAtMs;

  if (completedAtMs < startedAtMs) {
    throw new DomainInputError(`Job "${job.name}" finishes before it starts.`);
  }

  const createdAtMs = job.created_at
    ? parseTimestamp(job.created_at, `Job "${job.name}"`)
    : runCreatedAtMs;
  const steps = (job.steps ?? [])
    .map((step, index) => normalizeStep(step, id, index + 1, runCompletedAtMs))
    .sort(
      (left, right) =>
        left.number - right.number ||
        left.startedAtMs - right.startedAtMs ||
        left.id.localeCompare(right.id),
    );

  return {
    id,
    name: job.name,
    status: job.status ?? "completed",
    conclusion: normalizeConclusion(job.conclusion),
    createdAtMs,
    startedAtMs,
    completedAtMs,
    queueMs: Math.max(0, startedAtMs - createdAtMs),
    durationMs: completedAtMs - startedAtMs,
    attempt: job.attempt ?? job.run_attempt ?? 1,
    needs: [...(job.needs ?? [])],
    steps,
  };
}

function assignLanes(jobs: Array<Omit<NormalizedJob, "lane">>): NormalizedJob[] {
  const laneEnds: number[] = [];
  return jobs.map((job) => {
    let lane = laneEnds.findIndex((endAtMs) => endAtMs <= job.startedAtMs);
    if (lane === -1) {
      lane = laneEnds.length;
    }
    laneEnds[lane] = job.completedAtMs;
    return { ...job, lane };
  });
}

function prepareFixture(input: unknown): unknown {
  if (!isRecord(input)) {
    throw new DomainInputError("Workflow input must be a JSON object.");
  }

  if (!Array.isArray(input.jobs)) {
    throw new DomainInputError(
      "A GitHub workflow run payload must be combined with its jobs endpoint response before analysis.",
    );
  }

  if ("run" in input) {
    return input;
  }

  return {
    source: input.source,
    run: input,
    jobs: input.jobs,
  };
}

function parseFixture(input: unknown): ParsedFixture {
  const result = fixtureSchema.safeParse(prepareFixture(input));
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") || "input";
    throw new DomainInputError(`${path}: ${issue?.message ?? "Invalid workflow input"}`);
  }
  return result.data;
}

export function parseWorkflowInput(input: unknown): NormalizedWorkflow {
  const fixture = parseFixture(input);
  const runCreatedAtMs = parseTimestamp(fixture.run.created_at, "Workflow run");

  const provisionalEndAtMs = fixture.run.updated_at
    ? parseTimestamp(fixture.run.updated_at, "Workflow run")
    : Math.max(
        ...fixture.jobs.map((job) =>
          job.completed_at
            ? parseTimestamp(job.completed_at, `Job "${job.name}"`)
            : parseTimestamp(job.started_at, `Job "${job.name}"`),
        ),
      );

  const jobsWithoutLanes = fixture.jobs
    .map((job) => normalizeJob(job, runCreatedAtMs, provisionalEndAtMs))
    .sort(
      (left, right) =>
        left.startedAtMs - right.startedAtMs ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id),
    );
  const jobs = assignLanes(jobsWithoutLanes);
  const startedAtMs = fixture.run.run_started_at
    ? parseTimestamp(fixture.run.run_started_at, "Workflow run")
    : Math.min(...jobs.map((job) => job.startedAtMs));
  const completedAtMs = Math.max(provisionalEndAtMs, ...jobs.map((job) => job.completedAtMs));

  if (completedAtMs < startedAtMs) {
    throw new DomainInputError("Workflow run finishes before it starts.");
  }

  return {
    id: String(fixture.run.id),
    name: fixture.run.workflow_name ?? fixture.run.name ?? "Imported workflow",
    event: fixture.run.event ?? "unknown",
    status: fixture.run.status ?? "completed",
    conclusion: normalizeConclusion(fixture.run.conclusion),
    attempt: fixture.run.run_attempt ?? 1,
    createdAtMs: runCreatedAtMs,
    startedAtMs,
    completedAtMs,
    durationMs: completedAtMs - startedAtMs,
    headSha: fixture.run.head_sha,
    source: {
      provider: fixture.source?.provider ?? "github-actions",
      repository: fixture.source?.repository ?? "local-fixture",
      runUrl: fixture.source?.runUrl ?? fixture.run.html_url,
    },
    jobs,
  };
}
