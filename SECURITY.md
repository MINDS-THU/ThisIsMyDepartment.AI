# Security Policy

## Scope

ThisIsMyDepartment.AI is intended to be self-hosted. Security issues can affect both the application code and the way a deployment is configured, especially around authentication handoff, session cookies, reverse-proxy headers, and LLM provider credentials.

## Supported Versions

Security fixes are provided for the latest state of the default branch and the latest tagged release.

Older forks or locally modified deployments may need to be patched manually by their maintainers.

## Reporting a Vulnerability

Please do **not** open a public issue for a suspected vulnerability.

Instead, report it privately via email to **security@thisismydepartment.ai** with:

- a description of the issue
- affected components or deployment mode
- reproduction steps or a proof of concept if available
- any suggested mitigation

We aim to acknowledge reports within 48 hours and provide an initial assessment within 7 days.

## Deployment Security Checklist

When hosting ThisIsMyDepartment.AI in production:

- [ ] Set `AUTH_ALLOW_INSECURE_DEV_HANDOFF=false`
- [ ] Configure a real auth mode (shared-secret, JWT, reverse-proxy, or postMessage)
- [ ] Keep LLM provider API keys on the backend only
- [ ] Terminate TLS at the reverse proxy
- [ ] Restrict reverse-proxy auth headers so they can only be injected by trusted infrastructure
- [ ] Set an explicit origin allowlist for the `postMessage` auth bridge
- [ ] Rotate shared-secret and JWT signing keys periodically
- [ ] Back up the SQLite database regularly

See [doc/auth-integration.md](doc/auth-integration.md) and [doc/hosting.md](doc/hosting.md) for deployment-specific details.
