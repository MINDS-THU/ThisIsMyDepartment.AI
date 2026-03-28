# Current Status

This document summarizes what is implemented, what is still in progress, and known technical constraints.

## Implemented Features

### Authentication and Identity

* Session bootstrap via `GET /api/bootstrap`
* Session creation via `POST /auth/handoff` (shared-secret, JWT, or insecure dev mode)
* Reverse-proxy header login via `GET /auth/proxy-login`
* Embedded auth bridge via `GET /auth/postmessage-bridge`
* Fallback login page at `GET /auth/login` for local development
* Stable user IDs derived from normalized verified identity
* Logout via `POST /auth/logout`

### User Profiles

* First-time avatar onboarding (sprite selection before entering the world)
* Persisted avatar updates via `PUT /api/me/profile`
* User profile lookup via `GET /api/me`
* In-game settings UI for changing avatar, display name, and media devices

### Data Persistence

* SQLite-backed storage for users, sessions, profiles, activities, and conversations
* Automatic migration from legacy `server/data/state.json` on first startup
* Default database: `server/data/state.sqlite`

### Activity Logging

Server-side logging of:

* Player chat messages
* AI character conversations
* Room join and leave events
* Avatar appearance updates
* Character prompt updates
* Iframe open, close, and URL changes

### Conversations

* Persistent player-to-player conversation storage
* Persistent user-to-AI-agent conversation storage
* AI-authored messages are visually labeled in the conversation window

### AI Characters

* Backend-routed chat via `/api/agents` and `/api/agents/:agentId/chat`
* User-editable system prompt for the user's own AI-controlled stand-in
* AI characters wander with collision-aware pathfinding
* Overhead name labels with "(AI)" suffix for AI characters
* LLM provider support: **OpenRouter**, **OpenAI**, **mock** (offline fallback)
* Agent definitions as `*.agent.ts` files with auto-generated registry

### Real-Time Multiplayer

* Integrated Socket.IO room server in the backend process
* Avatar movement, chat, and presence sync
* Stable user ID handling for join, leave, and reconnect
* Summoned avatar presence shared through room sync
* Repeatable smoke test script (`scripts/realtimeSmokeTest.js`)

### Navigation and UI

* Scene navigator overlay for room teleport shortcuts
* Avatar directory for browsing users and summoning offline AI stand-ins
* Collapsible side panels for character status and navigation
* Overhead name labels for all characters (players, other players, AI characters)

### Frontend Runtime

* Browser entry: `ThisIsMyDepartmentApp`
* Backend-bound requests include credentials
* Jitsi disabled on localhost unless explicitly configured
* Webpack dev server proxies `/api`, `/auth`, and `/socket.io` to backend
* Copyable `.env` templates for frontend and backend

## Known Limitations

### Node Version Split

The frontend toolchain requires Node 16.20.2 (Volta-pinned). The backend requires Node 20+ for `better-sqlite3`. This is a known friction point; use nvm or Volta to switch between versions.

### Socket.IO v2

The browser client uses `socket.io-client@2.3.0`. Upgrading requires coordinated client and server changes and is tracked as future work.

### Single-Process Backend

The backend runs as a single Node.js process with SQLite. This is suitable for small-to-medium deployments (a department or lab) but not for horizontal scaling.

### Jitsi on Localhost

Voice and video are disabled on localhost unless `TIMD_JITSI_*` variables are configured. This avoids browser errors from missing `/http-bind` endpoints.

### Provider Coverage

Currently supported LLM providers: OpenRouter, OpenAI, and mock. Azure, Ollama, and other providers are not yet implemented.

## Related Documents

* [getting-started.md](getting-started.md) -- install and run locally
* [auth-integration.md](auth-integration.md) -- connect a real login system
* [hosting.md](hosting.md) -- deploy to production
