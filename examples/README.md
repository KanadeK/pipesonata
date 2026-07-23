# PipeSonata synthetic examples

These fixtures are deterministic, synthetic GitHub Actions-style workflow runs created specifically
for PipeSonata. They contain no real repository, actor, secret, or customer data.

- `fast.json` demonstrates a short fan-out and fan-in pipeline.
- `serial-bottleneck.json` demonstrates a fully serial critical path.
- `flaky.json` demonstrates reruns, step retries, repeated installs, and a failed test.

The fixtures are distributed under the repository's MIT License.
