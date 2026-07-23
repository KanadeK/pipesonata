import type { WorkflowAnalysis } from "./model";
import { redactSensitiveText } from "./redact";

function formatSeconds(milliseconds: number): string {
  return `${Math.round(milliseconds / 100) / 10}s`;
}

export function createMidiLikeJson(analysis: WorkflowAnalysis): string {
  return JSON.stringify(
    {
      schema: "pipesonata.notes/v1",
      source: {
        provider: analysis.workflow.source.provider,
        repository: analysis.workflow.source.repository,
        runId: analysis.workflow.id,
      },
      tempoBpm: analysis.score.tempoBpm,
      scale: analysis.score.scale,
      durationBeats: analysis.score.durationBeats,
      notes: analysis.score.notes.map((note) => ({
        id: note.id,
        jobId: note.jobId,
        stepId: note.stepId,
        label: note.label,
        pitch: note.pitch,
        midi: note.midi,
        channel: note.channel,
        velocity: note.velocity,
        startBeat: note.startBeat,
        durationBeats: note.durationBeats,
        outcome: note.outcome,
      })),
    },
    null,
    2,
  );
}

export function createEngineeringReport(analysis: WorkflowAnalysis): string {
  const path = analysis.criticalPath.jobNames.join(" -> ");
  const hotspotRows =
    analysis.hotspots.length === 0
      ? "- No engineering hotspots were detected in this run."
      : analysis.hotspots
          .map(
            (hotspot) =>
              `- **${hotspot.label}** (${hotspot.kind}, ${hotspot.severity}): ${hotspot.detail} Estimated visible time: ${formatSeconds(hotspot.wasteMs)}.`,
          )
          .join("\n");

  const report = `# PipeSonata engineering report

## Run

- Workflow: ${analysis.workflow.name}
- Repository: ${analysis.workflow.source.repository}
- Run ID: ${analysis.workflow.id}
- Conclusion: ${analysis.workflow.conclusion ?? "in progress"}
- Duration: ${formatSeconds(analysis.summary.durationMs)}
- Jobs / steps: ${analysis.summary.jobCount} / ${analysis.summary.stepCount}
- Max / average parallelism: ${analysis.summary.maxParallelism} / ${analysis.summary.averageParallelism}
- Total queue time: ${formatSeconds(analysis.summary.totalQueueMs)}
- Recorded retries: ${analysis.summary.retryCount}

## Critical path

${path || "No jobs"} (${formatSeconds(analysis.criticalPath.durationMs)}, ${analysis.criticalPath.confidence})

## Engineering hotspots

${hotspotRows}

## Interpretation

The critical path uses explicit \`needs\` relationships when present. Without dependency metadata,
PipeSonata reports the longest observed job as a lower bound instead of inferring a dependency that
the GitHub jobs response does not prove.
`;

  return redactSensitiveText(report);
}
