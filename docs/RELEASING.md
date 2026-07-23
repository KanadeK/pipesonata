# Releasing

PipeSonata uses an evidence-first release path. The local commands and GitHub workflows call the
same scripts.

## Local gates

From a clean `main` checkout with the release version already committed:

```bash
npm ci
npx playwright install chromium
npm run verify
npm run audit:dependencies
npm run package
npm run release-check
```

`npm run release-check` is intentionally strict for v0.1.0. It validates the required initial
milestone subjects, checks their author and committer identity, rejects a `Co-authored-by` trailer in
that initial history, verifies every SHA-256 row, inspects archive paths, extracts the static tarball,
serves it on loopback, and loads the released workbench in Chromium.

`--allow-development` exists only for testing packaging before the release-preparation commit. CI and
release jobs never use it.

## Release assets

`npm run package` replaces `dist-release/` with:

```text
pipesonata-v0.1.0-web-static.tar.gz
pipesonata-v0.1.0-web-demo.tar.gz
pipesonata-v0.1.0-source.tar.gz
pipesonata-v0.1.0-sbom.cdx.json
pipesonata-v0.1.0-provenance.json
SHA256SUMS.txt
```

The static archive includes the production app, license, bilingual README files, deterministic
examples, and a package manifest. The demo archive contains browser-generated SVG, PNG, note JSON,
Markdown, and the workbench screenshot. The source archive is built from Git's tracked and
non-ignored file set. The CycloneDX SBOM is generated from `package-lock.json`.

## GitHub workflows

- `CI` runs all eight verification gates, then packages and smoke-tests a release candidate.
- `Security` runs the locked dependency audit against the official npm advisory endpoint and scans
  source files for high-confidence credential formats.
- `Pages` runs only after a successful `CI` workflow on `main`, then deploys `dist/` with GitHub's
  official Pages actions.
- `Release` runs on `v*` tags, repeats verification and packaging, then creates or refreshes the
  GitHub release with every file in `dist-release/`.

Every workflow declares minimum permissions and a timeout. Only official `actions/*` components are
used.

## Publish v0.1.0

1. Confirm `npm run release-check` passes on clean `main`.
2. Push `main` and wait for `CI`, `Security`, and `Pages` to succeed.
3. Verify the Pages URL with a fresh request.
4. Create the annotated tag: `git tag -a v0.1.0 -m "PipeSonata v0.1.0"`.
5. Push the tag and wait for `Release` to succeed.
6. Download every release asset, verify `SHA256SUMS.txt`, and extract the static archive again.
7. Verify repository visibility, default branch, topics, homepage, contributors, and commit
   identities.

Do not publish from a dirty worktree or replace a release asset without refreshing checksums and
provenance.
