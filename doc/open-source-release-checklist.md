# Open-Source Release Checklist

Status tracking for the v1.0.0 public release.

## Completed

- [x] Frontend TypeScript compilation passes
- [x] Backend TypeScript build passes
- [x] Backend startup validated with `better-sqlite3` under Node 20+
- [x] Health endpoint responds on `http://127.0.0.1:8787/health`
- [x] Backend production dependency audit is clean
- [x] Copyable `.env` templates for frontend and backend (local + production)
- [x] Backend-managed auth, profiles, activity logging, conversations, and AI chat routing
- [x] In-world navigator, avatar summoning, and authoritative room-sync presence
- [x] Overhead name labels for all characters (players, AI characters)
- [x] Webpack dev server proxy for `/api`, `/auth`, `/socket.io`
- [x] README rewritten as project entry point with feature list, architecture, and quick start
- [x] Getting-started guide with install, run, troubleshooting, and env reference
- [x] Hosting guide with Nginx config, production env, security checklist, backups
- [x] Auth integration guide with all four modes plus security notes
- [x] Current status document updated
- [x] SECURITY.md with concrete reporting contact
- [x] CODE_OF_CONDUCT.md with concrete reporting contact
- [x] CHANGELOG.md updated for v1.0.0
- [x] package.json version bumped to 1.0.0, license field set to MIT
- [x] Stale files archived (TODO.md, original_README.md, implementation-plan.md, overhaul spec)
- [x] Split Node runtime documented in getting-started and current-status
- [x] Socket.IO v2 status documented as known limitation
- [x] Insecure dev handoff documented with production warning
- [x] Realtime smoke test documented and working

## Remaining before tagging v1.0.0

- [x] Publish the canonical repository URL and replace placeholder clone URLs in docs
- [ ] Validate auth integration against a real upstream deployment (not just curl)
- [x] Run `npm test` clean (spell check + lint + Jest)
- [x] Run `npm audit` and document or resolve any high/critical findings
  - Root: 105 remaining (all in dev dependencies — webpack-dev-server, electron, etc.)
  - Server (production): 8 (4 low, 4 moderate — all in Socket.IO v2 stack; no critical/high)
  - No critical or high vulnerabilities in production backend code
- [x] Verify Electron packaging on at least one target platform (macOS arm64 verified)
- [x] Final pass on asset cleanup (legacy demo text, pre-rename references)

## Future work (post-v1.0.0)

- [ ] Upgrade Socket.IO to v4 (coordinated client + server change)
- [ ] Converge frontend and backend on a single Node runtime
- [ ] Add LLM provider support for Azure, Ollama, and other providers
- [ ] Add end-to-end smoke test for bootstrap, profile, and agent chat
- [ ] Add architecture diagram to README
- [ ] Add health monitoring/metrics endpoint beyond `/health`
- [ ] Evaluate horizontal scaling options (replace SQLite with PostgreSQL)
