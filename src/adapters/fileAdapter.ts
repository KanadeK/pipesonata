import type { WorkflowAnalysis } from "../core/model";
import {
  AdapterError,
  analyzeWorkflowJson,
  combineGitHubPayloads,
  readWorkflowJson,
} from "./jsonAdapter";
import { analyzeWorkflow } from "../core/analyzeWorkflow";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeJobsPayload(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.jobs) && !("run" in value);
}

function looksLikeRunPayload(value: unknown): boolean {
  return isRecord(value) && "id" in value && "created_at" in value && !("run" in value);
}

export async function analyzeWorkflowFiles(files: readonly File[]): Promise<WorkflowAnalysis> {
  if (files.length === 0) {
    throw new AdapterError("Choose one combined JSON file or a run/jobs file pair.");
  }
  if (files.length > 2) {
    throw new AdapterError("PipeSonata accepts at most two JSON files per import.");
  }

  if (files.length === 1) {
    const file = files[0];
    if (!file) {
      throw new AdapterError("The selected file is unavailable.");
    }
    return analyzeWorkflowJson(await file.text());
  }

  const payloads = await Promise.all(
    files.map(async (file) => readWorkflowJson(await file.text())),
  );
  const runPayload = payloads.find(looksLikeRunPayload);
  const jobsPayload = payloads.find(looksLikeJobsPayload);
  if (!runPayload || !jobsPayload || runPayload === jobsPayload) {
    throw new AdapterError(
      "Two-file import requires one workflow run response and one jobs response.",
    );
  }

  return analyzeWorkflow(combineGitHubPayloads(runPayload, jobsPayload));
}
