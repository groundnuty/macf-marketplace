# Changelog

All notable changes to the `macf-agent` plugin will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Tags follow the plugin version (`v<major>.<minor>.<patch>` + floating `v<major>.<minor>` + `v<major>`).

## [0.1.2] — 2026-04-21

### Security

- **`dist/registry/` rebuilt against macf source at `68b42f3`** — picks up the `toVariableSegment` sanitizer (macf#46) that converts project and agent names to valid GitHub Actions variable names (uppercase + hyphen→underscore). The v0.1.1 dist shipped a pre-fix `registry.js` where `createRegistry` used `project.toUpperCase()` without the hyphen-stripping or agent-name transform, producing illegal variable names like `ACADEMIC-RESUME_AGENT_cv-architect` that 403'd every registry write at agent startup. Consumers on v0.1.1 had silent failure-to-register; v0.1.2 restores correct registration.
- Also picks up the DR-010 challenge-response fix (macf#87 — `certs/challenge-store.js`) and recent mTLS refactors (`mtls-health-ping.js`, `notify-formatter.js`) that landed on macf main after the v0.1.1 cut.

### Fixed

- **`plugin.json` mcpServers config now sets `NODE_PATH` to `${CLAUDE_PLUGIN_DATA}/node_modules`.** The SessionStart hook in v0.1.1 already copied `package.json` to the plugin data dir + ran `npm install` there, but the spawned Node process had no `NODE_PATH` override, so it couldn't resolve the installed deps at runtime (`Cannot find package '@modelcontextprotocol/sdk'`). This is the second half of the official Claude Code plugin-deps pattern — v0.1.1 had the first half (the hook) but not the second. Plugin now works as documented.

### Consumer action

None required beyond pulling the new tag. Existing consumers pinned to `@v0.1` auto-pick up `v0.1.2` on next `macf update` / `macf init`. The SessionStart hook re-runs `npm install` automatically because `package.json` diffs vs the cached copy in `CLAUDE_PLUGIN_DATA`, so existing workspaces need no manual intervention.

## [0.1.1] — 2026-04-21

### Changed

- Rewrote 7 agent templates to resolve `macf-gh-token.sh` / `check-gh-token.sh` via `$MACF_WORKSPACE_DIR` absolute paths instead of relative `./.claude/scripts/`. Closes the cross-repo-cwd variant of the attribution trap (macf#161, #140 recurrence-6).
- Bumped `@modelcontextprotocol/sdk` pin from `^1.12.1` → `~1.29.0` so minor bumps are deliberate, not floating.

### Known issues (fixed in 0.1.2)

- Shipped dist predates macf#46's `toVariableSegment` sanitizer — agents crash on first registry write with a 403 on illegal variable names. See 0.1.2 notes.
- Plugin `mcpServers` missing `NODE_PATH` — Node can't find installed deps at runtime. See 0.1.2 notes.

## [0.1.0] — 2026-04-15

Initial marketplace release. First cut of the `macf-agent` plugin (7 agent templates, 4 skills, hooks, dist built from macf main).
