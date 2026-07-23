# Input format

PipeSonata v0.1.0 accepts GitHub Actions workflow run data as local JSON. Input is validated before
analysis; malformed or ambiguous data does not replace the current result in the UI.

## Combined file

The easiest format is a single object:

```json
{
  "schemaVersion": "1.0",
  "source": {
    "provider": "github-actions",
    "repository": "owner/repository"
  },
  "run": {
    "id": 1001,
    "name": "CI",
    "event": "push",
    "status": "completed",
    "conclusion": "success",
    "run_attempt": 1,
    "created_at": "2026-07-23T08:00:00.000Z",
    "run_started_at": "2026-07-23T08:00:02.000Z",
    "updated_at": "2026-07-23T08:00:26.000Z",
    "head_sha": "0123456789abcdef0123456789abcdef01234567"
  },
  "jobs": [
    {
      "id": 1101,
      "name": "test",
      "status": "completed",
      "conclusion": "success",
      "created_at": "2026-07-23T08:00:00.000Z",
      "started_at": "2026-07-23T08:00:02.000Z",
      "completed_at": "2026-07-23T08:00:20.000Z",
      "needs": [],
      "steps": [
        {
          "number": 1,
          "name": "Unit tests",
          "status": "completed",
          "conclusion": "success",
          "started_at": "2026-07-23T08:00:02.000Z",
          "completed_at": "2026-07-23T08:00:20.000Z"
        }
      ]
    }
  ]
}
```

The checked-in files under [`examples/`](../examples/) are the executable reference.

## Standard response pair

PipeSonata also accepts two files selected at the same time:

- the object returned by `GET /repos/{owner}/{repo}/actions/runs/{run_id}`;
- the object returned by `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs`.

The jobs response must contain a top-level `jobs` array. The run response must contain `id` and
`created_at`. File names are irrelevant because PipeSonata classifies the JSON by structure.

```bash
gh api repos/OWNER/REPOSITORY/actions/runs/RUN_ID > run.json
gh api "repos/OWNER/REPOSITORY/actions/runs/RUN_ID/jobs?filter=all&per_page=100" > jobs.json
```

## Dependency metadata

GitHub's jobs REST response does not always expose `needs`. PipeSonata accepts a string array named
`needs` on each job when an upstream exporter provides it. Every referenced value must match another
job name or identifier in the same input.

With `needs`, the critical path confidence is `explicit`. Without it, PipeSonata does not infer
edges from timestamps; it returns the longest observed job as a `lower-bound` path.

## Retry metadata

Standard `run_attempt` values are accepted at run and job level. Fixtures and enriched exporters may
also provide `retry_count` on a step. PipeSonata normalizes both sources into visible attempt and
retry totals.

## Limits and rejection behavior

- One combined file or one run/jobs pair per import.
- At most two selected files.
- Each JSON file is limited to 25 MiB.
- Timestamps must parse and cannot produce a negative job or step duration.
- Duplicate job identifiers, duplicate step identifiers, dependency cycles, and missing dependency
  targets are rejected.
- A run-only response is rejected because it cannot prove job or step timing.
- Unknown fields are tolerated where the schema can safely ignore them.

An import error is shown in an alert while the previous valid analysis remains available.

## Pagination

The GitHub jobs endpoint is paginated. The example command requests up to 100 jobs. For larger runs,
collect every page and merge the `jobs` arrays before import. PipeSonata v0.1.0 does not fetch or
paginate on the user's behalf because the static app has no GitHub credential or network adapter.
