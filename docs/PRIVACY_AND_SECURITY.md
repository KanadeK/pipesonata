# Privacy and security

PipeSonata is local-first. File imports are parsed in the browser and are not uploaded by the static
application.

## Data boundaries

- Bundled examples contain synthetic data under this repository's MIT license.
- Imported workflow data remains in memory until the page is closed or another run is loaded.
- Audio is synthesized with WebAudio and does not use a remote media service.
- Exported reports redact common token, authorization, cookie, password, and secret patterns.
- The application does not include analytics, advertising, telemetry, or persistent token storage.

## User responsibilities

Workflow metadata can still expose repository names, commit identifiers, actor names, and internal
job naming. Review every export before sharing it outside the intended audience.

## Online adapters

Any future online adapter must make network use explicit, minimize requested permissions, accept
short-lived credentials, and provide a deterministic offline fixture path for tests.
