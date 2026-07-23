import type { CriticalPath, NormalizedJob, NormalizedWorkflow } from "./model";
import { DomainInputError } from "./parseWorkflow";

interface PathCandidate {
  ids: string[];
  names: string[];
  durationMs: number;
}

function selectLonger(left: PathCandidate, right: PathCandidate): PathCandidate {
  if (right.durationMs !== left.durationMs) {
    return right.durationMs > left.durationMs ? right : left;
  }
  return right.names.join("\u0000").localeCompare(left.names.join("\u0000")) < 0 ? right : left;
}

export function calculateCriticalPath(workflow: NormalizedWorkflow): CriticalPath {
  const jobsById = new Map<string, NormalizedJob>();
  const jobsByName = new Map<string, NormalizedJob>();

  for (const job of workflow.jobs) {
    jobsById.set(job.id, job);
    if (jobsByName.has(job.name)) {
      throw new DomainInputError(
        `Job name "${job.name}" is duplicated, so name-based dependencies are ambiguous.`,
      );
    }
    jobsByName.set(job.name, job);
  }

  const memo = new Map<string, PathCandidate>();
  const visiting = new Set<string>();

  const visit = (job: NormalizedJob): PathCandidate => {
    const cached = memo.get(job.id);
    if (cached) {
      return cached;
    }
    if (visiting.has(job.id)) {
      throw new DomainInputError(`Dependency cycle detected at job "${job.name}".`);
    }

    visiting.add(job.id);
    let prior: PathCandidate = { ids: [], names: [], durationMs: 0 };

    for (const dependency of job.needs) {
      const dependencyJob = jobsById.get(dependency) ?? jobsByName.get(dependency);
      if (!dependencyJob) {
        throw new DomainInputError(
          `Job "${job.name}" references missing dependency "${dependency}".`,
        );
      }
      prior = selectLonger(prior, visit(dependencyJob));
    }

    visiting.delete(job.id);
    const result = {
      ids: [...prior.ids, job.id],
      names: [...prior.names, job.name],
      durationMs: prior.durationMs + job.durationMs,
    };
    memo.set(job.id, result);
    return result;
  };

  let longest: PathCandidate = { ids: [], names: [], durationMs: 0 };
  for (const job of workflow.jobs) {
    longest = selectLonger(longest, visit(job));
  }

  return {
    jobIds: longest.ids,
    jobNames: longest.names,
    durationMs: longest.durationMs,
    confidence: workflow.jobs.some((job) => job.needs.length > 0) ? "explicit" : "lower-bound",
  };
}
