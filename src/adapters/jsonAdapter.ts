import { analyzeWorkflow } from "../core/analyzeWorkflow";
import type { WorkflowAnalysis } from "../core/model";

export class AdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdapterError";
  }
}

export const DEFAULT_MAX_INPUT_BYTES = 10 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readWorkflowJson(text: string, maxBytes = DEFAULT_MAX_INPUT_BYTES): unknown {
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > maxBytes) {
    throw new AdapterError(
      `Workflow JSON is ${bytes} bytes, above the ${maxBytes} byte safety limit.`,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown JSON parser error";
    throw new AdapterError(`Workflow JSON could not be parsed: ${detail}`);
  }
}

export function combineGitHubPayloads(runPayload: unknown, jobsPayload: unknown): unknown {
  if (!isRecord(runPayload) || !("id" in runPayload) || !("created_at" in runPayload)) {
    throw new AdapterError("The run payload is not a GitHub Actions workflow run response.");
  }
  if (!isRecord(jobsPayload) || !Array.isArray(jobsPayload.jobs)) {
    throw new AdapterError("The jobs payload is not a GitHub Actions jobs response.");
  }

  const repository =
    isRecord(runPayload.repository) && typeof runPayload.repository.full_name === "string"
      ? runPayload.repository.full_name
      : "github-actions/imported-run";
  const runUrl = typeof runPayload.html_url === "string" ? runPayload.html_url : undefined;

  return {
    schemaVersion: "1.0",
    source: {
      provider: "github-actions",
      repository,
      ...(runUrl ? { runUrl } : {}),
    },
    run: runPayload,
    jobs: jobsPayload.jobs,
  };
}

export function analyzeWorkflowJson(
  text: string,
  maxBytes = DEFAULT_MAX_INPUT_BYTES,
): WorkflowAnalysis {
  return analyzeWorkflow(readWorkflowJson(text, maxBytes));
}
