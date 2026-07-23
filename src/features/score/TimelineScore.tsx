import { scaleLinear } from "d3";
import { forwardRef, useId } from "react";

import type { WorkflowAnalysis, WorkflowConclusion } from "../../core/model";

interface TimelineScoreProps {
  analysis: WorkflowAnalysis;
}

const WIDTH = 1200;
const LEFT = 178;
const RIGHT = 42;
const TOP = 68;
const ROW_HEIGHT = 76;
const BOTTOM = 54;

function outcomeColor(conclusion: WorkflowConclusion): string {
  switch (conclusion) {
    case "failure":
    case "timed_out":
      return "#ff6b61";
    case "cancelled":
      return "#d1a55d";
    case "skipped":
      return "#89918d";
    default:
      return "#d4ef62";
  }
}

function formatTick(milliseconds: number): string {
  if (milliseconds < 60_000) {
    return `${Math.round(milliseconds / 100) / 10}s`;
  }
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.round((milliseconds % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export const TimelineScore = forwardRef<SVGSVGElement, TimelineScoreProps>(function TimelineScore(
  { analysis },
  ref,
) {
  const titleId = useId();
  const descriptionId = useId();
  const height = Math.max(420, TOP + analysis.workflow.jobs.length * ROW_HEIGHT + BOTTOM);
  const plotWidth = WIDTH - LEFT - RIGHT;
  const x = scaleLinear()
    .domain([0, Math.max(1, analysis.workflow.durationMs)])
    .range([LEFT, LEFT + plotWidth]);
  const ticks = x.ticks(6);
  const criticalIds = new Set(analysis.criticalPath.jobIds);

  return (
    <svg
      ref={ref}
      className="timeline-score"
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      data-testid="timeline-score"
    >
      <title id={titleId}>Workflow timing score for {analysis.workflow.name}</title>
      <desc id={descriptionId}>
        {analysis.summary.jobCount} jobs and {analysis.summary.stepCount} steps across{" "}
        {formatTick(analysis.summary.durationMs)}. The critical path is{" "}
        {analysis.criticalPath.jobNames.join(" then ")}.
      </desc>
      <rect width={WIDTH} height={height} fill="#15191a" />
      <text x={LEFT} y={30} className="svg-title">
        EXECUTION SCORE
      </text>
      <text x={LEFT} y={50} className="svg-subtitle">
        {analysis.workflow.source.repository} / run {analysis.workflow.id}
      </text>

      {ticks.map((tick) => {
        const position = x(tick);
        return (
          <g key={tick}>
            <line
              x1={position}
              x2={position}
              y1={TOP - 14}
              y2={height - BOTTOM + 8}
              stroke="#343b39"
              strokeWidth={1}
            />
            <text x={position} y={height - 20} textAnchor="middle" className="svg-tick">
              {formatTick(tick)}
            </text>
          </g>
        );
      })}

      {analysis.workflow.jobs.map((job, jobIndex) => {
        const y = TOP + jobIndex * ROW_HEIGHT;
        const jobStart = job.startedAtMs - analysis.workflow.startedAtMs;
        const jobEnd = job.completedAtMs - analysis.workflow.startedAtMs;
        const isCritical = criticalIds.has(job.id);
        return (
          <g key={job.id} data-job-id={job.id}>
            <line
              x1={LEFT}
              x2={WIDTH - RIGHT}
              y1={y + ROW_HEIGHT - 8}
              y2={y + ROW_HEIGHT - 8}
              stroke="#292f2e"
            />
            {isCritical ? (
              <rect x={24} y={y + 12} width={4} height={36} rx={2} fill="#d4ef62" />
            ) : null}
            <text x={42} y={y + 29} className="svg-job-name">
              {job.name}
            </text>
            <text x={42} y={y + 49} className="svg-job-meta">
              lane {job.lane + 1} / {formatTick(job.durationMs)}
            </text>
            <line
              x1={x(jobStart)}
              x2={x(jobEnd)}
              y1={y + 33}
              y2={y + 33}
              stroke="#56605d"
              strokeWidth={2}
            />
            {job.steps.map((step) => {
              const start = step.startedAtMs - analysis.workflow.startedAtMs;
              const end = step.completedAtMs - analysis.workflow.startedAtMs;
              const stepX = x(start);
              const stepWidth = Math.max(4, x(end) - stepX);
              const color = outcomeColor(step.conclusion);
              return (
                <g key={step.id} data-step-id={step.id}>
                  <rect
                    x={stepX}
                    y={y + 17}
                    width={stepWidth}
                    height={32}
                    rx={5}
                    fill={color}
                    fillOpacity={step.conclusion === "success" ? 0.78 : 0.92}
                    stroke={isCritical ? "#f1f6dc" : color}
                    strokeWidth={isCritical ? 1.5 : 0.5}
                  />
                  {stepWidth > 76 ? (
                    <text
                      x={stepX + 8}
                      y={y + 38}
                      className="svg-step-label"
                      textLength={Math.max(20, stepWidth - 16)}
                      lengthAdjust="spacingAndGlyphs"
                    >
                      {step.name}
                    </text>
                  ) : null}
                  <circle
                    cx={stepX + Math.min(stepWidth / 2, 12)}
                    cy={y + 12}
                    r={step.conclusion === "failure" ? 5 : 3.5}
                    fill={color}
                  />
                  <title>
                    {step.name}: {formatTick(step.durationMs)}, {step.conclusion ?? step.status}
                  </title>
                </g>
              );
            })}
          </g>
        );
      })}

      <g transform={`translate(${LEFT}, ${height - 4})`}>
        <rect width={14} height={4} rx={2} fill="#d4ef62" />
        <text x={22} y={4} className="svg-legend">
          success
        </text>
        <rect x={92} width={14} height={4} rx={2} fill="#ff6b61" />
        <text x={114} y={4} className="svg-legend">
          failure
        </text>
        <rect x={184} width={14} height={4} rx={2} fill="#f1f6dc" />
        <text x={206} y={4} className="svg-legend">
          critical path outline
        </text>
      </g>
    </svg>
  );
});
