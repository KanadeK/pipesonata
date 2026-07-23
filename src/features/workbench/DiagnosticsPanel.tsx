import { ArrowRight, ArrowsClockwise, Package, Timer, WarningCircle } from "@phosphor-icons/react";

import type { Hotspot, WorkflowAnalysis } from "../../core/model";

interface DiagnosticsPanelProps {
  analysis: WorkflowAnalysis;
}

function formatDuration(milliseconds: number): string {
  return `${Math.round(milliseconds / 100) / 10}s`;
}

function HotspotIcon({ kind }: { kind: Hotspot["kind"] }) {
  const props = { size: 18, weight: "regular" as const, "aria-hidden": true };
  switch (kind) {
    case "repeated-install":
      return <Package {...props} />;
    case "unstable-step":
      return <ArrowsClockwise {...props} />;
    case "queue":
      return <Timer {...props} />;
    default:
      return <WarningCircle {...props} />;
  }
}

export function DiagnosticsPanel({ analysis }: DiagnosticsPanelProps) {
  return (
    <aside className="diagnostics-panel" aria-labelledby="diagnostics-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Engineering readout</p>
          <h2 id="diagnostics-title">Where this run bends</h2>
        </div>
        <span className={`run-conclusion run-conclusion--${analysis.workflow.conclusion}`}>
          {analysis.workflow.conclusion ?? "in progress"}
        </span>
      </div>

      <section className="critical-path-block" aria-labelledby="critical-path-title">
        <div className="diagnostic-label">
          <span id="critical-path-title">Critical path</span>
          <strong>{formatDuration(analysis.criticalPath.durationMs)}</strong>
        </div>
        <div className="path-sequence">
          {analysis.criticalPath.jobNames.map((name, index) => (
            <div className="path-node" key={`${name}-${index}`}>
              <span>{name}</span>
              {index < analysis.criticalPath.jobNames.length - 1 ? (
                <ArrowRight size={15} aria-hidden />
              ) : null}
            </div>
          ))}
        </div>
        <p className="confidence-note">
          {analysis.criticalPath.confidence === "explicit"
            ? "Calculated from explicit needs dependencies."
            : "Lower bound because dependency metadata is absent."}
        </p>
      </section>

      <section className="hotspot-block" aria-labelledby="hotspot-title">
        <div className="diagnostic-label">
          <span id="hotspot-title">Hotspots</span>
          <strong>{analysis.hotspots.length}</strong>
        </div>
        {analysis.hotspots.length === 0 ? (
          <div className="empty-diagnostic">
            <strong>No structural hotspots</strong>
            <p>This fixture has no retries, failures, repeated installs, or material queueing.</p>
          </div>
        ) : (
          <ol className="hotspot-list">
            {analysis.hotspots.map((hotspot) => (
              <li key={hotspot.id} className={`hotspot hotspot--${hotspot.severity}`}>
                <HotspotIcon kind={hotspot.kind} />
                <div>
                  <div className="hotspot-title-row">
                    <strong>{hotspot.label}</strong>
                    <span>{hotspot.severity}</span>
                  </div>
                  <p>{hotspot.detail}</p>
                  {hotspot.wasteMs > 0 ? (
                    <small>{formatDuration(hotspot.wasteMs)} visible time</small>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}
