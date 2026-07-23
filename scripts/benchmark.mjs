import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureNames = ["fast", "serial-bottleneck", "flaky"];
const iterations = 500;
const warmupIterations = 50;

function percentile(sorted, ratio) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? 0;
}

const server = await createServer({
  root,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const { analyzeWorkflow } = await server.ssrLoadModule("/src/core/analyzeWorkflow.ts");
  const fixtures = await Promise.all(
    fixtureNames.map(async (name) => ({
      name,
      payload: JSON.parse(await readFile(path.join(root, "examples", `${name}.json`), "utf8")),
    })),
  );

  const results = [];
  for (const fixture of fixtures) {
    for (let index = 0; index < warmupIterations; index += 1) {
      analyzeWorkflow(structuredClone(fixture.payload));
    }

    const durations = [];
    for (let index = 0; index < iterations; index += 1) {
      const startedAt = performance.now();
      const analysis = analyzeWorkflow(structuredClone(fixture.payload));
      durations.push(performance.now() - startedAt);
      if (analysis.summary.jobCount === 0) {
        throw new Error(`${fixture.name} produced an empty analysis.`);
      }
    }

    durations.sort((left, right) => left - right);
    const totalMs = durations.reduce((sum, duration) => sum + duration, 0);
    results.push({
      fixture: fixture.name,
      iterations,
      medianMs: Number(percentile(durations, 0.5).toFixed(3)),
      p95Ms: Number(percentile(durations, 0.95).toFixed(3)),
      maxMs: Number((durations.at(-1) ?? 0).toFixed(3)),
      analysesPerSecond: Number(((iterations / totalMs) * 1000).toFixed(1)),
    });
  }

  const output = {
    schema: "pipesonata.benchmark/v1",
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    method: `${warmupIterations} warmups, then ${iterations} structured-clone plus full-analysis iterations per fixture`,
    results,
  };

  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    console.log(`PipeSonata benchmark on ${output.node} (${output.platform})`);
    console.table(results);
  }
} finally {
  await server.close();
}
