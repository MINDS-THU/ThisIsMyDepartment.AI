# Hosting Guide

This guide covers deploying ThisIsMyDepartment.AI for a department, lab, or organization. For local development, start with [getting-started.md](getting-started.md) instead.

## Deployment Architecture

```text
                    +-----------------------+
 Browser  -------> |    Reverse Proxy       |   (Nginx, Caddy, etc.)
                    |  - TLS termination    |
                    |  - Static assets      |
                    |  - Auth header inject  |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    |      Backend          |   (Node.js, port 8787)
                    |  - Auth / sessions    |
                    |  - Profile storage    |
                    |  - AI chat routing    |
                    |  - Socket.IO server   |
                    |  - SQLite persistence |
                    +-----------------------+
```

Recommended approach: serve the frontend assets and proxy all backend traffic through a single domain. This avoids cross-origin cookie and redirect issues.

## Build for Production

### Frontend

```sh
npm install
npm run compile
npm run dist
```

The `dist/` folder contains the bundled frontend assets ready to be served by a web server.

When building for production, set the frontend environment variables in `.env` before running `npm run dist`:

```sh
TIMD_BACKEND_BASE_URL=https://department.example.edu
TIMD_SOCKET_BASE_URL=https://department.example.edu/
TIMD_JITSI_DOMAIN=meet.example.edu
TIMD_JITSI_MUC=conference.meet.example.edu
TIMD_JITSI_SERVICE_URL=https://meet.example.edu/http-bind
TIMD_JITSI_CLIENT_NODE=https://meet.example.edu/jitsimeet
```

If the frontend and backend are on the same domain (recommended), the backend URL variables can be left unset -- the frontend defaults to the current origin. Jitsi variables always need to be set explicitly (see [Jitsi Integration](#jitsi-integration) below).

### Backend

```sh
npm run server:build
```

The compiled backend lives in `server/dist/`. Run it with:

```sh
NODE_ENV=production node server/dist/server/src/app.js
```

Or use the wrapper script:

```sh
NODE_ENV=production npm run server:start
```

## Backend Configuration

Copy the production template:

```sh
cp server/.env.production.example server/.env.production
```

The backend loads `server/.env.production` automatically when `NODE_ENV=production`.

### Example production environment

```sh
HOST=127.0.0.1
PORT=8787
TIMD_FRONTEND_BASE_URL=https://department.example.edu/
SERVER_STATE_DB_FILE=/var/lib/thisismydepartment/state.sqlite

AUTH_SESSION_COOKIE_NAME=timd_session
AUTH_SESSION_TTL_SECONDS=28800
AUTH_ALLOW_INSECURE_DEV_HANDOFF=false

TIMD_DEFAULT_ORGANIZATION=Example University
TIMD_DEFAULT_DEPARTMENT=Industrial Engineering
TIMD_DEFAULT_ROOM_ID=industrial-engineering-main
TIMD_DEFAULT_ROOM_DISPLAY_NAME=Industrial Engineering Department

# Auth -- pick one mode (see doc/auth-integration.md)
AUTH_PROXY_PROVIDER=campus-sso
AUTH_PROXY_EXTERNAL_ID_HEADER=x-user-id
AUTH_PROXY_DISPLAY_NAME_HEADER=x-display-name
AUTH_PROXY_EMAIL_HEADER=x-user-email
AUTH_PROXY_AUTHENTICATED_HEADER=x-authenticated
AUTH_PROXY_AUTHENTICATED_VALUE=true

# LLM provider
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

Shell environment variables override file values, so container platforms and service managers work as expected.

### Key variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Bind address | `127.0.0.1` |
| `PORT` | Listen port | `8787` |
| `TIMD_FRONTEND_BASE_URL` | Where to redirect after login | `http://127.0.0.1:8000/` |
| `SERVER_STATE_DB_FILE` | SQLite database path | `data/state.sqlite` |
| `AUTH_ALLOW_INSECURE_DEV_HANDOFF` | Allow unsigned login form | `true` (**set to `false` in production**) |
| `AUTH_SESSION_TTL_SECONDS` | Session cookie lifetime | `28800` (8 hours) |

See [server/.env.production.example](../server/.env.production.example) for the full list.

## Nginx Configuration

### Single-domain setup (recommended)

Serve frontend assets and proxy backend traffic through the same domain:

```nginx
server {
    listen 443 ssl http2;
    server_name department.example.edu;

    ssl_certificate     /etc/ssl/certs/department.example.edu.pem;
    ssl_certificate_key /etc/ssl/private/department.example.edu.key;

    # Frontend static assets
    root /srv/thisismydepartment/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Auth endpoints
    location /auth/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Socket.IO (real-time multiplayer)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health check
    location = /health {
        proxy_pass http://127.0.0.1:8787;
    }
}
```

### Reverse-proxy auth headers

If using the reverse-proxy auth mode, inject identity headers from your SSO gateway:

```nginx
location = /auth/proxy-login {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Strip client-supplied headers to prevent spoofing
    proxy_set_header x-authenticated "";
    proxy_set_header x-user-id "";
    proxy_set_header x-display-name "";

    # Inject values from your SSO layer
    proxy_set_header x-authenticated true;
    proxy_set_header x-user-id $upstream_http_x_user_id;
    proxy_set_header x-display-name $upstream_http_x_display_name;
    proxy_set_header x-user-email $upstream_http_x_user_email;
}
```

Replace the `$upstream_http_*` variables with values from your actual SSO gateway. See [auth-integration.md](auth-integration.md) for all supported auth modes.

## Persistence and Backups

Backend state is stored in a single SQLite file:

```text
server/data/state.sqlite    (default)
/var/lib/thisismydepartment/state.sqlite    (production example)
```

To back up the database, copy the file while the backend is idle or use SQLite's `.backup` command:

```sh
sqlite3 /var/lib/thisismydepartment/state.sqlite ".backup /backups/state-$(date +%Y%m%d).sqlite"
```

Persisted data includes: users, profiles, sessions, activities, conversations, and external identity mappings.

Legacy JSON state from `server/data/state.json` is imported automatically the first time an empty SQLite database starts.

## Jitsi Integration

Proximity-based voice/video chat and screensharing require a [Jitsi Meet](https://jitsi.org/jitsi-meet/) server. Without Jitsi, users can still navigate the environment, text chat, and talk to AI characters, but they will not have audio or video when walking near other users.

### Getting a Jitsi server

You have three options:

1. **Public instance** -- Use `meet.jit.si` (free, no setup). Suitable for testing but not recommended for production due to privacy and reliability.
2. **Self-hosted** -- Deploy Jitsi Meet on your own infrastructure. See the [Jitsi self-hosting guide](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart).
3. **Same-domain** -- If you run Jitsi on the same domain as the app, the frontend falls back to same-host paths (`/http-bind`, etc.) and no explicit configuration is needed.

### Frontend configuration

On localhost, Jitsi is disabled by default to avoid `/http-bind` errors when no Jitsi server is running. For production deployments, set these variables in the frontend `.env` before running `npm run dist`:

| Variable | Example |
|----------|---------|
| `TIMD_JITSI_DOMAIN` | `meet.example.edu` |
| `TIMD_JITSI_MUC` | `conference.meet.example.edu` |
| `TIMD_JITSI_SERVICE_URL` | `https://meet.example.edu/http-bind` |
| `TIMD_JITSI_CLIENT_NODE` | `https://meet.example.edu/jitsimeet` |

For a public Jitsi instance, use:

```sh
TIMD_JITSI_DOMAIN=meet.jit.si
TIMD_JITSI_MUC=conference.meet.jit.si
TIMD_JITSI_SERVICE_URL=https://meet.jit.si/http-bind
TIMD_JITSI_CLIENT_NODE=https://meet.jit.si/jitsimeet
```

> **Note:** Without these variables set on a non-localhost deployment, video/voice will silently fail unless Jitsi is running on the same domain.

## Electron Desktop App

The repo includes Electron Forge configuration for packaging as a desktop application:

```sh
npm run dist        # build frontend bundle
npm run package     # create Electron app
npm run make        # create distributable
```

The Electron app still connects to a remote backend. Keep auth and LLM credentials on the server side.

## Security Checklist

Before exposing the app to users:

- [ ] Set `AUTH_ALLOW_INSECURE_DEV_HANDOFF=false`
- [ ] Configure a real auth mode (shared-secret, JWT, reverse-proxy, or postMessage)
- [ ] Terminate TLS at the reverse proxy
- [ ] Keep LLM API keys on the backend only
- [ ] Set `AUTH_POSTMESSAGE_ALLOWED_ORIGINS` explicitly if using the embedded auth bridge
- [ ] Strip auth-sensitive request headers from direct client traffic in the reverse proxy
- [ ] Use `Secure` and `HttpOnly` cookie attributes (default for `SameSite=Lax`)
- [ ] Rotate shared secrets and JWT signing keys periodically

## Current Limitations

- Socket.IO uses the legacy v2 protocol; upgrading requires coordinated client and server changes
- The backend is single-process with SQLite -- suitable for small-to-medium deployments but not horizontally scalable
- No built-in health monitoring or metrics endpoint beyond `/health`
- Frontend toolchain requires Node 16 for building; backend requires Node 20+ at runtime

## Embedded auth example

Example parent page flow for the `postMessage` bridge:

```html
<iframe
    id="timd-auth"
    src="https://timd.example.edu/auth/postmessage-bridge?returnTo=https%3A%2F%2Ftimd.example.edu%2F&redirect=0"
    hidden
></iframe>
<script>
    const frame = document.getElementById("timd-auth");
    window.addEventListener("message", (event) => {
        if (event.origin !== "https://timd.example.edu") {
            return;
        }
        if (event.data?.type === "thisismydepartment-auth-ready") {
            frame.contentWindow.postMessage({
                type: "thisismydepartment-auth-handoff",
                payload: {
                    token: window.sessionStorage.getItem("campusJwt")
                }
            }, event.origin);
        }
        if (event.data?.type === "thisismydepartment-auth-result" && event.data.ok) {
            window.location.assign(event.data.returnTo || "/");
        }
    });
</script>
```

See [auth-integration.md](auth-integration.md) for all supported auth modes and the full postMessage protocol.
