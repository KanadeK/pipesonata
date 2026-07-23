# Contributing

Thank you for improving PipeSonata.

## Local setup

1. Install Node.js 22.12 or newer.
2. Run `npm ci`.
3. Create a focused branch.
4. Run `npm run lint`, `npm run typecheck`, `npm run test:coverage`, and `npm run build`.

Tests must exercise real input and observable output. Do not weaken assertions or disable a quality
gate to make a change pass. New bug fixes should include a regression test.

## Pull requests

Keep commits reviewable, explain the user-facing effect, and include verification evidence. Never
commit credentials, private workflow logs, or proprietary fixture data.
