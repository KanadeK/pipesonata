import { spawnSync } from "node:child_process";

// Keep the aggregate gate usable on Windows, macOS, and Linux.
const npmCommand = process.env.npm_execpath ? process.execPath : "npm";
const npmPrefix = process.env.npm_execpath ? [process.env.npm_execpath] : [];
const steps = [
  ["Formatting", ["run", "format:check"]],
  ["Lint", ["run", "lint"]],
  ["TypeScript", ["run", "typecheck"]],
  ["Documentation", ["run", "docs:check"]],
  ["Secret scan", ["run", "scan:secrets"]],
  ["Unit and integration coverage", ["run", "test:coverage"]],
  ["Production browser paths", ["run", "test:e2e"]],
  ["Production build", ["run", "build"]],
];

for (const [label, arguments_] of steps) {
  console.log(`\n[verify] ${label}`);
  const result = spawnSync(npmCommand, [...npmPrefix, ...arguments_], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\n[verify] ${steps.length} gates passed.`);
