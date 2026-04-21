# Changelog

All notable changes to the `macf-agent` plugin will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Tags follow the plugin version (`v<major>.<minor>.<patch>` + floating `v<major>.<minor>` + `v<major>`).

## [0.1.5] — 2026-04-21

### Removed

- **The SessionStart "auto-pickup" hook that was supposed to inject a prompt suggesting `/macf-status` + `/macf-issues`.** v0.1.3 shipped it as `type: "prompt"` (failed: `ToolUseContext is required for prompt hooks`). v0.1.4 rewrote it to `type: "command"` emitting `additionalContext` JSON (failed with the exact same error). The "prompt hooks" class in the error diagnostic is the lifecycle group, not the `type` field value — any SessionStart emit that routes through the context-injection path hits the same broken ToolUseContext code. Closes [`groundnuty/macf-marketplace#7`](https://github.com/groundnuty/macf-marketplace/issues/7) by source-removal rather than continued iteration against a framework ceiling.
- **UX impact:** operators type `/macf-issues` manually on session start. Same workflow as the last two days when the hook was silently failing. When [macf#185](https://github.com/groundnuty/macf/issues/185) (running-session wake via tmux-send) lands, the same mechanism subsumes this use case cleanly from a working abstraction.

### Kept

- SessionStart's `type: "command"` dependency-installer + node_modules adjacency symlink (from v0.1.3). That one works reliably — no JSON stdout, no context injection, just shell side-effects.

### Consumer action

None. Consumers on `@v0.1` floating pick up v0.1.5 on next `macf update` + restart. Zero-noise session start.

### Related

- macf#185 (running-session wake architecture) — when that lands, auto-pickup comes back properly
- Claude Code feature request [#37122](https://github.com/anthropics/claude-code/issues/37122) — upstream was closed as "not planned", locking us out of the original approach

## [0.1.4] — 2026-04-21

### Fixed

- **SessionStart hook no longer errors with `ToolUseContext is required for prompt hooks`.** v0.1.0–v0.1.3 shipped a `type: "prompt"` SessionStart hook to auto-suggest `/macf-status` + `/macf-issues` on agent launch. That hook type isn't implemented by current Claude Code for SessionStart (runtime requires a `ToolUseContext` that isn't initialized yet at that lifecycle point — per [Claude Code hooks docs](https://code.claude.com/docs/en/hooks) and [anthropics/claude-code#37122](https://github.com/anthropics/claude-code/issues/37122), which was closed as "not planned"). Error fired on every session resume. Closes [`groundnuty/macf-marketplace#7`](https://github.com/groundnuty/macf-marketplace/issues/7).
- **Fix:** replaced with a `type: "command"` hook that emits JSON with `additionalContext` — the framework-documented pattern for injecting startup context. Agent sees the suggestion as context and decides whether to run the slash commands. `once: true` still applies.

### Consumer action

None. Consumers on `@v0.1` floating tag auto-pick up v0.1.4 on the next `macf update` + restart.

### Known residual

Running-session wake (where a POST to a running agent's /notify triggers a new prompt in the live TUI) is the architecturally harder companion — tracked at [macf#185](https://github.com/groundnuty/macf/issues/185), not covered by this patch.

## [0.1.3] — 2026-04-21

### Fixed

- **Plugin's MCP server can now resolve ESM deps at startup.** v0.1.2 added `env.NODE_PATH = "${CLAUDE_PLUGIN_DATA}/node_modules"` to the `mcpServers` config, but Node v20+ `NODE_PATH` only works for CommonJS `require()`, not for ESM `import` — and this plugin is `"type": "module"` with `import` statements throughout `dist/*.js`. First `import '@modelcontextprotocol/sdk/...'` threw `ERR_MODULE_NOT_FOUND`. The channel server never reached the listening state; silent failure-to-start on every consumer. Closes [`groundnuty/macf-marketplace#5`](https://github.com/groundnuty/macf-marketplace/issues/5).
- **Fix:** the SessionStart hook now also runs `ln -sfn "${CLAUDE_PLUGIN_DATA}/node_modules" "${CLAUDE_PLUGIN_ROOT}/node_modules"` after `npm install`. ESM resolves via adjacency — Node walks up from the importing file looking for `node_modules/`, finds the symlink pointing at the real install dir under `CLAUDE_PLUGIN_DATA`. Also dropped the vestigial `env.NODE_PATH` from `plugin.json` (harmless, but pruning so no one thinks it's load-bearing).
- **Bonus hardening:** hook also now `mkdir -p "${CLAUDE_PLUGIN_DATA}"` before the `cd` — on a fresh workspace where the data dir hasn't been created yet, the `cd` would fail silently and the `npm install` never ran. Non-blocking today but closing the path for future clean installs.

### Security

- **`dist/registry/` + `dist/certs/` rebuilt** from macf source at `c1a987e`. Picks up:
  - serverAuth EKU on peer certs (macf#180) — agents are dual-role (server + client) on mTLS, but certs shipped with only clientAuth. Consumers trying to route `/notify` to an agent hit `curl (60): unsuitable certificate purpose` because OpenSSL server-role validation needs serverAuth. Server cert accepts still need clientAuth (enforced per #121); serverAuth is additive.
  - `hostToSan()` helper + `advertiseHost` parameter on `generateAgentCert` (macf#178 Gap 3) — agents routed across Tailscale need SAN entries matching their advertised host, not just 127.0.0.1/localhost. Operator rotates certs with `macf certs rotate` after setting `advertise_host` in `macf-agent.json`.
  - All the other post-0.1.2 improvements on macf main (registry env, CV phase 6 launcher gaps, etc.).

### Consumer action

- **Operator rollout on existing consumers:**
  1. `macf update` (picks up plugin 0.1.2 → 0.1.3).
  2. Restart the agent (kill + relaunch). The SessionStart hook runs on next launch, `npm install`s to `CLAUDE_PLUGIN_DATA`, creates the adjacency symlink, `node dist/server.js` resolves ESM imports normally.
  3. If the consumer is off-box-routed (Tailscale / DNS), also run `macf certs rotate` after setting `advertise_host` in `.macf/macf-agent.json`. Otherwise no cert change needed.
- **New consumers:** `macf init` → `./claude.sh` just works (no manual `npm install` in plugin dir, no `ln -sfn` tribal knowledge).

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
