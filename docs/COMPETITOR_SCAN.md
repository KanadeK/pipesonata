# Public repository scan

Scan date: 2026-07-23

## Method

The scan queried GitHub's public repository index for the exact names `PipeSonata` and `pipesonata`,
then sampled projects matching GitHub Actions dashboards, workflow visualizers, pipeline timelines,
workflow telemetry, and data sonification. Stars and update dates are point-in-time metadata, not
quality rankings.

No public repository was returned for either exact name query. The name and slug are therefore kept.

## Relevant repositories

| Repository                                                                                                            | Stars | Updated    | Main capability                                         | Overlap and distinction                                                                                       |
| --------------------------------------------------------------------------------------------------------------------- | ----: | ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [catchpoint/workflow-telemetry-action](https://github.com/catchpoint/workflow-telemetry-action)                       |   409 | 2026-07-21 | Collects runner CPU, memory, I/O, and process telemetry | Strong CI diagnostics; PipeSonata focuses on portable run JSON, critical paths, and audiovisual output        |
| [debba/gitdeck](https://github.com/debba/gitdeck)                                                                     |   365 | 2026-07-15 | Broad GitHub and Forgejo dashboard including Actions    | Overlaps run visibility; PipeSonata is a single-run analysis instrument rather than repository management     |
| [chriskinsman/github-action-dashboard](https://github.com/chriskinsman/github-action-dashboard)                       |   228 | 2026-07-13 | Tracks GitHub Actions status                            | Overlaps run monitoring; PipeSonata analyzes job and step timing plus exportable engineering hotspots         |
| [cschleiden/github-actions-hero](https://github.com/cschleiden/github-actions-hero)                                   |   116 | 2026-05-05 | Interactive GitHub Actions tutorial and visualizer      | Overlaps workflow visualization; PipeSonata consumes execution results rather than teaching workflow syntax   |
| [kineteklabs/twotone](https://github.com/kineteklabs/twotone)                                                         |    87 | 2026-07-03 | Browser data sonification and data-driven music         | Overlaps sonification; PipeSonata has CI-specific semantics and engineering diagnostics                       |
| [github-community-projects/org-metrics-dashboard](https://github.com/github-community-projects/org-metrics-dashboard) |    85 | 2026-05-03 | Actions-powered organization health dashboard           | Overlaps engineering metrics; PipeSonata works at job and step resolution for one workflow run                |
| [amir-bio/github-actions-stats](https://github.com/amir-bio/github-actions-stats)                                     |    27 | 2024-04-24 | Visualizes workflow runs for a repository               | Overlaps run visualization; PipeSonata adds deterministic score/audio mapping and multi-format exports        |
| [see-mike-out/erie-web](https://github.com/see-mike-out/erie-web)                                                     |    14 | 2026-05-08 | Declarative grammar for data sonification               | Overlaps structured audio mapping; PipeSonata couples notes to CI state, parallelism, retries, and failures   |
| [twidi/gitlab-pipeline-visualizer](https://github.com/twidi/gitlab-pipeline-visualizer)                               |     5 | 2026-05-27 | GitLab dependency and timeline visualizer               | Overlaps timeline and dependencies; PipeSonata targets GitHub Actions JSON and adds engineering/audio exports |
| [MUCb/GitLab-Pipeline-Visualizer](https://github.com/MUCb/GitLab-Pipeline-Visualizer)                                 |     0 | 2026-05-15 | Static GitLab pipeline timeline app                     | Overlaps static timeline inspection; PipeSonata includes critical-path and hotspot analysis                   |

## Product adjustment

The scan did not reveal an active project with the same name and a highly isomorphic MVP. PipeSonata
keeps the original scope but sharpens three differences:

1. Offline-first analysis from shareable, deterministic run data.
2. One source model for visual timing, WebAudio notes, and export artifacts.
3. Actionable engineering findings alongside the artistic representation.

This is a sampled public-repository comparison, not a claim of global uniqueness.
