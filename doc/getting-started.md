# Getting Started

This guide walks you through installing, configuring, and running ThisIsMyDepartment.AI for local development.

## What you are starting

The app has two runtime parts:

1. **Frontend** -- a browser client served on port `8000` by webpack-dev-server.
2. **Backend** -- a Node.js service on port `8787` that handles auth, profiles, persistence, AI chat routing, and real-time room sync via Socket.IO.

Both must be running for the app to work.

## Requirements

### Node.js

The project has split Node version requirements due to its legacy frontend toolchain:

* **Frontend toolchain** (webpack 4, TypeScript compiler): validated with Node **16.20.2**, pinned via Volta in `package.json`.
* **Backend** (`better-sqlite3` native module): requires Node **20** or newer.

Recommended approach: use [nvm](https://github.com/nvm-sh/nvm) or [Volta](https://volta.sh/) to manage Node versions. The backend will work under Node 20+ regardless of the Volta pin.

### Other tools

* A modern desktop browser (Chrome, Firefox, Edge, Safari)
* [Visual Studio Code](https://code.visualstudio.com/) (recommended, not required)
* [Tiled](http://www.mapeditor.org/) (only if you want to edit the map)

### macOS note

The backend depends on `better-sqlite3`, which compiles a native C++ addon during `npm install`. If the build fails because `python` is not found, create a temporary alias:

```sh
alias python=python3
```

Then rerun `npm install`.

## Install

```sh
git clone https://github.com/MINDS-THU/ThisIsMyDepartment.AI.git
cd ThisIsMyDepartment.AI
npm install
```

`npm install` at the root also installs backend dependencies under `server/` via the `postinstall` script.

If you switch Node versions after installing, the `better-sqlite3` native module may need rebuilding:

```sh
npm --prefix server rebuild better-sqlite3
```

## Configure

### Frontend environment variables

Frontend runtime values are injected by webpack from the root `.env` file. For local development the defaults work out of the box -- no `.env` file is required.

If you need to override the backend URL or configure Jitsi for local voice/video chat:

```sh
cp .env.example .env
# Edit .env as needed
```

> **Note:** Jitsi (voice/video chat) is disabled on localhost by default. To enable it locally, set the `TIMD_JITSI_*` variables in `.env` pointing to a Jitsi server (e.g., `meet.jit.si`). See [hosting.md](hosting.md#jitsi-integration) for details.

### Backend environment variables

The backend loads environment files in this order:

1. `server/.env`
2. `server/.env.local` (recommended for development)
3. `server/.env.production` (when `NODE_ENV=production`)

Shell environment variables take precedence over file values.

For local development:

```sh
cp server/.env.local.example server/.env.local
# Edit server/.env.local as needed
```

The defaults in the example file work without changes for a basic local setup.

Override the env file path with `SERVER_ENV_FILE=/path/to/your.env` if needed.

## Build

Compile the frontend TypeScript to `lib/`:

```sh
npm run compile
```

Build the backend TypeScript to `server/dist/`:

```sh
npm run server:build
```

Both steps are required before the first run.

## Run

Start the backend first (in terminal 1):

```sh
npm run server:start
```

Start the frontend (in terminal 2):

```sh
npm start
```

Default addresses:

| Service | URL |
|---------|-----|
| Frontend | `http://127.0.0.1:8000/` |
| Backend | `http://127.0.0.1:8787/` |
| Health check | `http://127.0.0.1:8787/health` |

The webpack dev server proxies `/api`, `/auth`, and `/socket.io` requests to the backend automatically.

## First login

With no upstream auth configured, the built-in fallback login page handles authentication:

1. Open `http://127.0.0.1:8000/` in your browser.
2. The frontend redirects to the login page.
3. Fill in the form and click **Continue To The Department**.
4. On first login, the app prompts you to choose an avatar.
5. After choosing an avatar, you enter the virtual world.

## Verify your setup

After both services start, confirm:

* [ ] `http://127.0.0.1:8787/health` returns `{"ok":true}`
* [ ] `http://127.0.0.1:8000/` loads the browser client
* [ ] Login and avatar selection work
* [ ] Returning users keep their saved avatar
* [ ] AI characters respond when you press E near them (requires an LLM API key, or uses mock mode)
* [ ] Opening a second browser tab shows the other user's avatar in the room

## Daily development workflow

### Frontend changes

Keep the TypeScript compiler running in watch mode:

```sh
npm run watch
```

With `npm start` running in another terminal, the browser reloads automatically when files in `lib/` change.

### Backend changes

After editing files in `server/src/`:

```sh
npm run server:build
npm run server:start
```

### Running tests

```sh
npm test              # spell check + lint + Jest test suite
npm run check         # Jest only (faster)
```

### Realtime smoke test

Validates the Socket.IO multiplayer contract (room sync, messages, reconnection):

```sh
npm run server:build
PORT=8789 node server/dist/server/src/app.js   # terminal 1: fresh backend on a test port
TIMD_REALTIME_URL=http://127.0.0.1:8789 npm run smoke:realtime   # terminal 2
```

Use a fresh port so the test validates the current build, not an older running instance.

## Local data storage

Backend state is stored in SQLite:

```text
server/data/state.sqlite
```

Override the path: `SERVER_STATE_DB_FILE=/custom/path/state.sqlite`

Legacy JSON state in `server/data/state.json` is imported automatically on first startup if the database is empty.

## Troubleshooting

### `better-sqlite3` build fails

This native module must be compiled for your Node version. Common fixes:

```sh
# Ensure build tools are available
xcode-select --install          # macOS
# or: sudo apt install build-essential python3   # Debian/Ubuntu

# Rebuild for current Node version
npm --prefix server rebuild better-sqlite3
```

### Webpack dev server fails with `ERR_OSSL_EVP_UNSUPPORTED`

Node 17+ changed the default OpenSSL provider. Fix:

```sh
NODE_OPTIONS=--openssl-legacy-provider npm start
```

### Frontend loads but login redirects in a loop

The session cookie must be on the same origin as the frontend. In local development, the webpack dev server proxies `/auth` and `/api` to the backend. If you access the frontend via a different hostname than `127.0.0.1` or `localhost`, cookies may not attach correctly.

### Backend crashes with `MODULE_NOT_FOUND` or binding errors

The compiled `better-sqlite3` addon is version-specific. If you switched Node versions:

```sh
npm --prefix server rebuild better-sqlite3
npm run server:build
```

### AI characters reply with mock responses

The backend falls back to mock mode when no LLM API key is configured. To enable real AI responses, set `OPENROUTER_API_KEY` or `OPENAI_API_KEY` in `server/.env.local`.

## Environment variable reference

### Frontend (root `.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `TIMD_BACKEND_BASE_URL` | Backend API URL | `http://127.0.0.1:8787` |
| `TIMD_SOCKET_BASE_URL` | Socket.IO server URL | Same as backend |
| `TIMD_JITSI_DOMAIN` | Jitsi server domain | Disabled on localhost |
| `TIMD_JITSI_MUC` | Jitsi MUC domain | `conference.<jitsi_domain>` |
| `TIMD_JITSI_SERVICE_URL` | Jitsi BOSH/WebSocket URL | `<protocol>//<jitsi_domain>/http-bind` |
| `TIMD_JITSI_CLIENT_NODE` | Jitsi client node | `<protocol>//<jitsi_domain>/jitsimeet` |

### Backend (`server/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Bind address | `127.0.0.1` |
| `PORT` | Listen port | `8787` |
| `TIMD_FRONTEND_BASE_URL` | Frontend URL for redirects | `http://127.0.0.1:8000/` |
| `SERVER_STATE_DB_FILE` | SQLite database path | `data/state.sqlite` |
| `AUTH_ALLOW_INSECURE_DEV_HANDOFF` | Allow unsigned login form | `true` |
| `AUTH_SESSION_TTL_SECONDS` | Session lifetime | `28800` (8 hours) |
| `TIMD_AGENT_LLM_PROVIDER` | Force LLM provider | Auto-detect |
| `OPENROUTER_API_KEY` | OpenRouter API key | Not set |
| `OPENAI_API_KEY` | OpenAI API key | Not set |

See [server/.env.local.example](../server/.env.local.example) and [server/.env.production.example](../server/.env.production.example) for the full list.

## Next steps

* [doc/auth-integration.md](auth-integration.md) -- connect a real login system
* [doc/hosting.md](hosting.md) -- deploy to a server with Nginx and TLS
* [doc/current-status.md](current-status.md) -- understand what is and isn't finished
