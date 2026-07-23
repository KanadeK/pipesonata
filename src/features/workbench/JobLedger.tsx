import type { WorkflowAnalysis } from "../../core/model";

interface JobLedgerProps {
  analysis: WorkflowAnalysis;
}

function formatDuration(milliseconds: number): string {
  return `${Math.round(milliseconds / 100) / 10}s`;
}

export function JobLedger({ analysis }: JobLedgerProps) {
  const criticalIds = new Set(analysis.criticalPath.jobIds);

  return (
    <section className="ledger-section" aria-labelledby="ledger-title">
      <div className="section-heading section-heading--ledger">
        <div>
          <p className="section-kicker">Run ledger</p>
          <h2 id="ledger-title">Jobs in execution order</h2>
        </div>
        <p>{analysis.workflow.event} event</p>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Job</th>
              <th scope="col">Result</th>
              <th scope="col">Queue</th>
              <th scope="col">Run time</th>
              <th scope="col">Steps</th>
              <th scope="col">Attempts</th>
              <th scope="col">Path</th>
            </tr>
          </thead>
          <tbody>
            {analysis.workflow.jobs.map((job) => (
              <tr key={job.id}>
                <th scope="row">{job.name}</th>
                <td>
                  <span className={`result-text result-text--${job.conclusion}`}>
                    {job.conclusion ?? job.status}
                  </span>
                </td>
                <td>{formatDuration(job.queueMs)}</td>
                <td>{formatDuration(job.durationMs)}</td>
                <td>{job.steps.length}</td>
                <td>{job.attempt}</td>
                <td>{criticalIds.has(job.id) ? "critical" : "parallel"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
