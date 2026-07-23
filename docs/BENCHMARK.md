# Benchmark

PipeSonata includes a lightweight, reproducible domain benchmark:

```bash
npm run benchmark
npm run benchmark -- --json
```

## Release baseline

- Date: 2026-07-23
- Host: Windows x64
- Node.js: v24.18.0
- Method: 50 warmups, then 500 measured iterations per fixture
- Measured operation: `structuredClone` plus full Zod validation, normalization, timing summary,
  critical path, hotspot analysis, and score generation

| Fixture           |   Median |      p95 |  Maximum | Analyses / second |
| ----------------- | -------: | -------: | -------: | ----------------: |
| fast              | 0.236 ms | 0.722 ms | 1.452 ms |           3,356.4 |
| serial-bottleneck | 0.194 ms | 0.377 ms | 1.536 ms |           4,534.4 |
| flaky             | 0.190 ms | 0.494 ms | 1.880 ms |           4,196.6 |

These numbers describe tiny checked-in fixtures on one host. They are a regression reference, not a
capacity promise for arbitrary workflows. Browser rendering, file reading, PNG encoding, and audio
playback are intentionally outside this microbenchmark. CI should treat functional gates as
authoritative and use benchmark changes as a prompt for investigation rather than a brittle pass or
fail threshold.
