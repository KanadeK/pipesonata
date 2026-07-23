# Release checklist

## Quality

- [ ] Clean worktree on `main`
- [ ] Locked install succeeds with `npm ci`
- [ ] Lint, format, typecheck, coverage, E2E, and build pass
- [ ] Core line coverage is at least 80%
- [ ] Three deterministic examples pass acceptance tests
- [ ] Keyboard, responsive, reduced-motion, and no-audio paths are verified

## Artifacts

- [ ] Static application and demo outputs are packaged
- [ ] Package is extracted into a clean temporary directory and smoke-tested
- [ ] `SHA256SUMS.txt` matches every release asset
- [ ] Package contains no credentials, `.env` files, caches, or private logs

## Identity and publication

- [ ] Author and committer match the authenticated GitHub owner
- [ ] Commit history contains no `Co-authored-by` trailer
- [ ] GitHub Actions are green
- [ ] `main` and annotated `v0.1.0` tag point to the intended commit
- [ ] Release is public, not a draft, and assets are downloadable
- [ ] GitHub Pages demo is live before repository homepage is set
