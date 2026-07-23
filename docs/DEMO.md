# Reproducible demo

`npm run demo` builds the production application, starts a loopback-only preview on a strict
project-specific port, launches Chromium, verifies the workbench heading, captures the README image,
and downloads all four export types from the bundled fast fixture.

```bash
npm ci
npm run demo
```

Generated files:

```text
docs/assets/pipesonata-demo.png
demo-output/pipesonata-v0.1.0-demo-manifest.json
demo-output/pipesonata-v0.1.0-fast-notes.json
demo-output/pipesonata-v0.1.0-fast-report.md
demo-output/pipesonata-v0.1.0-fast-score.png
demo-output/pipesonata-v0.1.0-fast-score.svg
```

The screenshot is tracked because it documents the released interface. `demo-output/` is ignored
because those files are regenerated and later copied into the release package.

## Manual acceptance

1. Select **Serial bottleneck** and confirm duration `3m 0s`, peak lanes `1`, and critical path
   `prepare -> compile -> unit -> integration -> package`.
2. Import [`examples/flaky.json`](../examples/flaky.json) and confirm a failed conclusion, 6 retries,
   and a `Playwright tests` hotspot.
3. Import malformed JSON and confirm the previous valid analysis remains.
4. Enable sound, play and stop the compressed score, then turn sound off.
5. Export SVG, PNG, Notes JSON, and Report and inspect each file.
6. Switch theme, reload, and confirm the theme persists without persisting workflow data.
7. At 390 px width, confirm the page does not overflow and the score and ledger scroll within their
   own containers.

The Playwright suite automates these paths without replacing the manual release smoke check.
