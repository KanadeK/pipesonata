# Output formats

Every PipeSonata export is generated from the current immutable `WorkflowAnalysis`. Repeating an
export without changing input produces equivalent semantic content.

## SVG

The SVG contains the complete timing score with a `viewBox`, accessible `<title>` and `<desc>`, job
and step data attributes, observed time grid, outcome colors, and critical-path outlines. It can be
opened in a browser or vector editor.

## PNG

The browser serializes the SVG, draws it on a canvas at two times the SVG dimensions, applies the
active theme background, and downloads a PNG. No remote image or font is required.

## MIDI-like note JSON

This format is a stable interchange schedule, not a Standard MIDI File:

```json
{
  "schema": "pipesonata.notes/v1",
  "source": {
    "provider": "github-actions",
    "repository": "owner/repository",
    "runId": "1001"
  },
  "tempoBpm": 112,
  "scale": ["C3", "Eb3", "F3", "G3", "Bb3"],
  "durationBeats": 16,
  "notes": [
    {
      "id": "job-1:step-1",
      "jobId": "job-1",
      "stepId": "job-1:step-1",
      "label": "Unit tests",
      "pitch": "G3",
      "midi": 55,
      "channel": 0,
      "velocity": 0.76,
      "startBeat": 0,
      "durationBeats": 4,
      "outcome": "success"
    }
  ]
}
```

Consumers should branch on `schema` and ignore unknown fields for forward compatibility.

## Engineering report

The Markdown report records:

- workflow, repository, run ID, conclusion, and duration;
- job and step counts;
- peak and average parallelism;
- queue and retry totals;
- critical path, duration, and confidence;
- ranked engineering hotspots and estimated visible time.

Before download, the report passes through deterministic redaction for bearer tokens, JWTs, URL
credentials, passwords, cookies, common secret assignments, and GitHub token patterns. Redaction is
defense in depth, not a guarantee that arbitrary project names or custom identifiers are safe to
share.

## File names

Interactive exports use a sanitized stem derived from repository, workflow name, and run ID.
`npm run demo` writes versioned reference artifacts:

```text
demo-output/
  pipesonata-v0.1.0-demo-manifest.json
  pipesonata-v0.1.0-fast-notes.json
  pipesonata-v0.1.0-fast-report.md
  pipesonata-v0.1.0-fast-score.png
  pipesonata-v0.1.0-fast-score.svg
```
