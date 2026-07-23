# Architecture

PipeSonata separates deterministic workflow analysis from browser and file adapters.

```text
GitHub Actions JSON / fixtures
              |
        input adapters
              |
      validated domain model
              |
  timeline + critical path + hotspots
              |
   visual score + audio note schedule
              |
 PNG / SVG / MIDI-like JSON / report
```

- `src/core/` contains data models and pure calculations.
- `src/adapters/` converts external representations into the core model.
- `src/features/` owns application services and user-facing components.
- `src/workers/` is reserved for deterministic heavy analysis off the main thread.
- `tests/unit/`, `tests/integration/`, and `tests/e2e/` cover each boundary independently.

The browser never needs network access for bundled examples or imported files. Visual and sound
outputs are generated from one immutable analysis result so repeated exports remain stable.
