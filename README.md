# macf-marketplace

Claude Code plugin marketplace distributing the [macf-agent](./macf-agent/) plugin for the [Multi-Agent Coordination Framework (MACF)](https://github.com/groundnuty/macf).

## Installation

```
/plugin marketplace add groundnuty/macf-marketplace
/plugin install macf-agent@macf-marketplace
```

## What it distributes

**macf-agent** — runtime component of MACF:

- **Channel server** — MCP server over HTTPS with mTLS, exposing `POST /notify`, `GET /health`, and `POST /sign`
- **Four skills** — `/macf-status`, `/macf-peers`, `/macf-ping`, `/macf-issues`
- **Seven agent identity templates** — code-agent, science-agent, writing-agent, and four experimental variants
- **SessionStart hooks** — dependency installer + initial status/work check

## Versioning

Floating major tags + immutable semver:

| Tag | Moves? | Recommended for |
|---|---|---|
| `v0` | Floats to latest `v0.x.x` | Pre-release testing |
| `v0.1` | Floats to latest `v0.1.x` | Patch-level stability |
| `v0.1.0` | Immutable | Maximum reproducibility |

Breaking changes = new major. Pre-1.0 (v0.x) is unstable — minor versions may break.

## Related

- Framework source: [groundnuty/macf](https://github.com/groundnuty/macf)
- Reusable routing workflows: [groundnuty/macf-actions](https://github.com/groundnuty/macf-actions)
- Setup CLI: `@macf/cli` (installs from `groundnuty/macf` repo)
