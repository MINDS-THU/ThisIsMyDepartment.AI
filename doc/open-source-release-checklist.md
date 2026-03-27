# ThisIsMyDepartment.AI Open-Source Release Checklist

This checklist captures the remaining work between the current overhaul state and a first public open-source release.

## Current validated baseline

- frontend TypeScript compilation passes
- backend TypeScript build passes
- backend startup has been validated after rebuilding `better-sqlite3` for the active runtime
- default backend health endpoint responds on `http://127.0.0.1:8787/health`
- backend production dependency audit is clean
- copyable runtime configuration templates exist for frontend local runtime and backend local or production deployment
- backend-managed auth, profile persistence, activity logging, conversation storage, and integrated agent chat are all present in the main repository
- in-world navigator, avatar summoning flow, and authoritative room-sync presence are implemented in the current app

## Release blockers

- decide and publish the canonical repository URL and maintainer/contact information
- confirm the production auth integration guidance against a real upstream deployment
- resolve or explicitly document the split runtime expectations between the legacy frontend toolchain and the backend SQLite dependency
- resolve or explicitly accept the remaining root production dependency findings in the legacy `socket.io-client` stack
- validate and document the integrated backend realtime room server deployment path used by browser clients

## Dependency and runtime follow-up

- review the root production audit findings affecting `socket.io-client`, `engine.io-client`, `socket.io-parser`, `ws`, and `parseuri`
- upgrade client and server together and validate protocol compatibility before changing the Socket.IO major version
- either keep the current split-runtime story clearly documented or deliberately converge the frontend and backend on a cleaner shared Node baseline
- document when `npm --prefix server rebuild better-sqlite3` is required after switching runtimes in local development or CI

## Documentation follow-up

- replace placeholder clone/publish instructions with the final public repository URL
- publish a real security reporting channel in [SECURITY.md](SECURITY.md)
- keep [.env.example](.env.example), [server/.env.local.example](server/.env.local.example), and [server/.env.production.example](server/.env.production.example) aligned with the real runtime surface as configuration evolves
- keep institution-specific login adapters outside the public repository and document only the normalized backend handoff contract

## Product and packaging follow-up

- finish the remaining historical cleanup in assets, demo text, and archived reference material that still reflects pre-release naming
- verify Electron packaging metadata, icons, and app naming on each target platform you plan to support
- decide whether the Electron shell is part of the first public release or deferred behind the browser-hosted deployment path

## Security and hosting follow-up

- set production cookie settings and TLS proxy expectations explicitly for the published deployment guide
- document minimum secret management expectations for auth handoff and LLM provider keys
- verify reverse-proxy header trust boundaries in a real deployment
- confirm `postMessage` origin allowlists for embedded login flows
- validate OpenRouter and OpenAI deployment guidance under the same release process used for auth and realtime checks

## Nice-to-have before first tag

- add a top-level release architecture diagram
- add an end-to-end smoke test script for bootstrap, profile update, and agent chat
- add a compatibility note describing which parts of the original Gather-derived stack are still intentionally retained
