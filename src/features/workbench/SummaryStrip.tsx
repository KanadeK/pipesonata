import type { WorkflowAnalysis } from "../../core/model";

interface SummaryStripProps {
  analysis: WorkflowAnalysis;
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 60_000) {
    return `${Math.round(milliseconds / 100) / 10}s`;
  }
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.round((milliseconds % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function SummaryStrip({ analysis }: SummaryStripProps) {
  const metrics = [
    { label: "Duration", value: formatDuration(analysis.summary.durationMs) },
    {
      label: "Jobs / steps",
      value: `${analysis.summary.jobCount} / ${analysis.summary.stepCount}`,
    },
    { label: "Peak lanes", value: String(analysis.summary.maxParallelism) },
    { label: "Queue total", value: formatDuration(analysis.summary.totalQueueMs) },
    { label: "Retries", value: String(analysis.summary.retryCount) },
    { label: "Hotspots", value: String(analysis.hotspots.length) },
  ];

  return (
    <section className="summary-strip" aria-label="Workflow summary">
      {metrics.map((metric) => (
        <div className="summary-metric" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </section>
  );
}
