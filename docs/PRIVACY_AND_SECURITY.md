# Privacy and security

PipeSonata is local-first. File imports are parsed in the browser and are not uploaded by the static
application.

## Data boundaries

- Bundled examples contain synthetic data under this repository's MIT license.
- Imported workflow data remains in memory until the page is closed or another run is loaded.
- The only persisted browser value is the selected light or dark theme.
- Audio is synthesized with WebAudio and does not use a remote media service.
- Exported reports redact common token, authorization, cookie, password, and secret patterns.
- The application does not include analytics, advertising, telemetry, or persistent token storage.

## Network boundary

The production build is a set of static files. It has no API server, upload route, GitHub adapter,
service worker, or runtime content delivery dependency. Import analysis and all four export paths
work after the page has loaded without an application network request.

Links to GitHub, project documentation, and the repository are ordinary user-activated navigation.
Future online adapters must not silently change this default.

## Redaction boundary

Redaction recognizes common bearer tokens, JWTs, GitHub token prefixes, URL user information,
cookie and authorization headers, password fields, and common secret assignments. It operates on
the generated Markdown report before download.

Redaction cannot know whether a repository name, commit SHA, actor, internal host name, custom job
label, or arbitrary opaque identifier is sensitive in a particular organization. SVG, PNG, and note
JSON preserve labels by design. Treat every export as potentially confidential until reviewed.

## User responsibilities

Workflow metadata can still expose repository names, commit identifiers, actor names, and internal
job naming. Review every export before sharing it outside the intended audience.

Only import workflow data that you are authorized to inspect. A static local-first tool reduces
transport risk but does not change the source data's ownership or retention obligations.

## Online adapters

Any future online adapter must make network use explicit, minimize requested permissions, accept
short-lived credentials, and provide a deterministic offline fixture path for tests.

It must also document token lifetime, storage, revocation, pagination, rate limits, and the exact
requests it performs. Long-lived credentials must never enter `WorkflowAnalysis` or an export.
