# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-27

### Added

- Backend service under `server/` with auth, profiles, activity logging, conversations, and AI chat routing
- SQLite-backed persistence for users, sessions, profiles, activities, conversations, and identity mappings
- Four auth integration modes: shared-secret POST, JWT, reverse-proxy headers, and iframe/popup postMessage bridge
- Built-in fallback login page for local development
- LLM-powered AI characters with backend-routed chat (OpenRouter, OpenAI, mock)
- User-editable system prompts for AI-controlled avatar stand-ins
- Collision-aware pathfinding for AI character wandering
- Overhead name labels for all characters (players, other players, AI characters)
- Integrated Socket.IO room server for real-time multiplayer sync
- Repeatable realtime smoke test for multiplayer contract validation
- Scene navigator overlay and avatar directory panels
- Persistent player-to-player and player-to-AI conversation storage
- Activity logging for chat, room events, avatar updates, prompt changes, and iframe usage
- First-time avatar onboarding flow
- Webpack dev server proxy for seamless local development
- Comprehensive documentation: getting started, auth integration, hosting, and architecture
- Copyable `.env` templates for local and production configuration
- Electron Forge packaging support

### Changed

- Renamed runtime and public-facing branding to ThisIsMyDepartment.AI
- Replaced external Python chat bridge with backend-routed agent chat
- Introduced backend-managed identity handoff and stable user IDs (replacing transient guest names)
- Jitsi disabled on localhost by default to avoid `/http-bind` errors

## [0.0.1] - 2021-05-07

Initial release (Gather.town clone)
