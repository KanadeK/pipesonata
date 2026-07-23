# Architecture

PipeSonata is a static, local-first React application. Its central constraint is that workflow
semantics are calculated once in pure domain code and then reused by every presentation and export.

## Data flow

```text
GitHub Actions JSON / deterministic fixtures
                       |
       jsonAdapter / fileAdapter / sampleAdapter
                       |
             normalized WorkflowRun
                       |
                 analyzeWorkflow
          /             |              \
  timing summary   critical path     hotspots
          \             |              /
                WorkflowAnalysis
          /             |              \
   D3 timeline       score notes       reports
       |                 |                |
    SVG/PNG          WebAudio/JSON      Markdown
```

## Directory ownership

- `src/core/` contains schemas, normalized models, pure analysis, redaction, score mapping, and text
  exporters. It has no React, DOM, file, audio, or network dependency.
- `src/adapters/` converts combined fixtures, standard GitHub responses, and browser `File` objects
  into core input.
- `src/features/score/` renders the visual timeline from `WorkflowAnalysis`.
- `src/features/audio/` converts deterministic score notes into a user-triggered WebAudio session.
- `src/features/export/` serializes and downloads browser artifacts.
- `src/features/workbench/` coordinates UI state without owning workflow calculations.
- `src/workers/` is the reserved boundary for future large-graph analysis. It is intentionally empty
  in v0.1.0 because the measured fixtures do not justify worker complexity.
- `tests/unit/`, `tests/integration/`, and `tests/e2e/` verify pure functions, real fixture boundaries,
  and production-browser behavior respectively.

## Core invariants

1. Times are normalized to milliseconds and measured against the workflow start.
2. Jobs and steps are sorted deterministically by observed start time, then stable identifier.
3. Explicit `needs` metadata is the only source of dependency edges.
4. A cycle, missing dependency target, or duplicate identifier is rejected with a useful error.
5. Without dependencies, the longest observed job is reported as a lower-bound critical path.
6. Visual, audio, JSON, and report outputs consume the same immutable `WorkflowAnalysis`.
7. Redaction happens before a textual report leaves the core exporter.

## Critical path

For an explicit directed acyclic `needs` graph, PipeSonata applies dynamic programming in
topological order. Each job weight is its observed duration. The path ending at each job is the
largest predecessor total plus that job's duration. The maximum terminal total is returned with
`explicit` confidence.

The result answers a bounded question: which supplied dependency chain has the greatest sum of
observed job durations? It does not infer runner capacity, resource contention, hidden matrix
dependencies, or root cause.

## Parallelism and queueing

The analyzer treats job start and completion timestamps as interval edges. It sweeps those edges to
calculate peak and time-weighted average concurrency. Queue time is the non-negative interval from
job creation to job start. These values are observed timing metrics, not GitHub billing metrics.

## Score mapping

`score.ts` maps steps to notes in a stable C minor pentatonic vocabulary. Job lanes select channels,
step offsets select start beats, duration selects note length, and conclusion influences pitch,
velocity, and waveform. Failures get a distinct low cadence. No randomness or clock state enters the
mapping, so repeated analysis of the same JSON produces the same note schedule.

## Browser boundary

The browser bundle has no online adapter. `File.text()` reads local input into memory, analysis runs
on the main thread, and user-triggered downloads use object URLs. WebAudio starts only after an
explicit control click. The theme is the only persisted value and is stored in `localStorage`; run
data is not persisted.

## Extension rules

- Add an external input through a new adapter, not by weakening core validation.
- Keep credentials outside normalized models and generated artifacts.
- Preserve deterministic ordering and add a real fixture before adding a new provider.
- Add Web Workers only behind the same `WorkflowAnalysis` contract.
- An online adapter must be visibly opt-in, use short-lived minimum-scope credentials, and retain an
  offline acceptance path.
