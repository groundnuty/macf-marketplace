# Changelog

All notable changes to the `macf-agent` plugin will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Tags follow the plugin version (`v<major>.<minor>.<patch>` + floating `v<major>.<minor>` + `v<major>`).

## [0.1.8] — 2026-04-22

### Fixed

- **Plugin MCP server no longer crashes at startup** on workspaces missing `@opentelemetry/sdk-*` packages. v0.1.7 introduced OTEL instrumentation (macf#194) but `dist/otel.js` had top-level static imports of 5 SDK packages that weren't declared in `plugin/package.json` — every consumer workspace hit `ERR_MODULE_NOT_FOUND` at `node dist/server.js` start, regardless of whether `OTEL_EXPORTER_OTLP_ENDPOINT` was set. MCP died, channel server never started, cv-project-archaeologist went offline. Closes [`groundnuty/macf-marketplace#6`](https://github.com/groundnuty/macf-marketplace/issues/6) / [`groundnuty/macf#196`](https://github.com/groundnuty/macf/issues/196).

### Changed

- **`dist/otel.js` rebuilt** from macf source at `0335a48`. Now uses dynamic `await import()` for the SDK packages inside an async `bootstrapOtel()` function, gated on the env check. Node only resolves the packages when the operator opts in. The zero-cost doctrine is now preserved structurally, not just in the docblock.
- **6 OTEL packages added to `macf-agent/package.json` dependencies** (exact pins per the upstream 0.x version churn):
  - `@opentelemetry/api@1.9.1`
  - `@opentelemetry/exporter-trace-otlp-proto@0.215.0`
  - `@opentelemetry/resources@2.7.0`
  - `@opentelemetry/sdk-trace-base@2.7.0`
  - `@opentelemetry/sdk-trace-node@2.7.0`
  - `@opentelemetry/semantic-conventions@1.40.0`
- SessionStart npm-install hook pulls these into `CLAUDE_PLUGIN_DATA/node_modules` on next launch. Consumers opting into observability (endpoint set) get recording tracers; consumers without the env set see zero module-resolution cost.

### Consumer action

None beyond the standard refresh. Rollout sequence:

1. `macf update` in the workspace → pulls v0.1.8 plugin tarball.
2. Agent relaunch → SessionStart hook runs `npm install`, pulls the 6 OTEL packages into the data dir + symlinks node_modules (per v0.1.3 hook design).
3. Channel server starts cleanly. If `OTEL_EXPORTER_OTLP_ENDPOINT` is unset, traces are zero-cost no-ops. If set, bootstrap dynamic-imports the packages + registers the provider.

### Related

- `groundnuty/macf#194` (original OTEL integration — introduced the bug)
- `groundnuty/macf#196` (diagnosis + dynamic-import fix)
- `groundnuty/macf#197` (companion — claude.sh template gets Claude Code telemetry gates so traces actually emit when the stack is up)

## [0.1.7] — 2026-04-21

### Changed

- **SessionStart auto-pickup hook is now smart + multi-repo.** v0.1.6 shipped the dumb-minimal fix: unconditional "run /macf-status + /macf-issues" instruction on every fresh launch, even when the queue was empty (~330-550 token burn per launch with nothing pending). v0.1.7 replaces that with a live `gh api /installation/repositories` enumeration + per-repo issue count. The hook emits `additionalContext` ONLY when there are actually pending issues; empty queue → silent (0 tokens). Closes [`groundnuty/macf-marketplace#13`](https://github.com/groundnuty/macf-marketplace/issues/13).
- **Multi-repo coverage via App installation set** (not a static config field). Agents now automatically watch every repo their GitHub App is installed on — matches how multi-repo scope actually emerges in MACF (dynamic, operator-managed via App install state) rather than a declarative `watched_repos` list we considered and rejected.

### Design rationale

Initial design proposed `watched_repos: string[]` in `macf-agent.json` + `macf init --watched-repos <csv>` flag + `MACF_WATCHED_REPOS` env var (spanning macf CLI + plugin). Science-agent's refinement replaced that with a single live `/installation/repositories` API call: no config surface, no CLI flag, no env export. Operator grants/revokes scope purely via App-install state. Net scope dropped from 2 PRs across 2 repos to 1 PR in this repo.

### Implementation notes

- New `hooks/session-start-pickup.sh` (executable). Replaces v0.1.6's giant escaped-JSON printf one-liner. `hooks.json` now references the script via `${CLAUDE_PLUGIN_ROOT}/hooks/session-start-pickup.sh`.
- **Fail-silent on any error** — missing env, missing token, API failure, non-numeric output all exit 0 with no output. Matches v0.1.6's fail-silent philosophy.
- **Timeout bumped 5s → 20s** to accommodate N API calls (typical agents: 2-6 repos installed, well under 20s total).
- **Output shape preserved**: same `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}` schema. No `continue` field — same shape that v0.1.6 verified-working on live consumers.

### Consumer action

None. `@v0.1` floating picks up v0.1.7 on next `macf update` + restart. Operators who previously saw auto-pickup on every launch now see it ONLY when there's actual pending work. Token savings accrue silently.

### Related

- macf#185 (running-session wake via tmux-send-to-claude sidecar) — complementary: this hook handles fresh-launch auto-pickup; #185 handles notification-wake on running sessions. Both paths now cover all their intended cases; different abstractions.

## [0.1.6] — 2026-04-21

### Added

- **Re-added SessionStart auto-pickup hook** with corrected JSON shape that matches the working pattern (as used by the `superpowers` plugin). Drops the `continue: true` field that v0.1.4 erroneously included — that field is a PostToolUse response-schema field; emitting it at SessionStart routed the hook output through the tool-use-hook handler, which requires a `ToolUseContext` that isn't initialized at SessionStart lifecycle (hence v0.1.3/v0.1.4's `ToolUseContext is required for prompt hooks. This is a bug.` error). Closes [`groundnuty/macf-marketplace#10`](https://github.com/groundnuty/macf-marketplace/issues/10).
- Hook now emits:
  ```json
  { "hookSpecificOutput": { "hookEventName": "SessionStart", "additionalContext": "Session started. Please run /macf-status ..." } }
  ```
  Identical shape to `superpowers`' session-start hook (verified working in production). `once: true` still applies so resumes don't re-inject.

### Rationale vs v0.1.5 (over-correction)

v0.1.5 removed the hook entirely because at that point we believed the whole `additionalContext` pattern was broken upstream. It wasn't — only our emission had the extra `continue` field. v0.1.6 is the minimal correct fix; the auto-pickup UX is reinstated.

### Credit

Diagnosis corrected after `@groundnuty` pushed back with "I use superpowers all the time and never saw this error" — which forced a JSON-shape diff rather than extrapolating from "both emit additionalContext."

### Consumer action

None. Consumers on `@v0.1` floating pick up v0.1.6 on next `macf update` + restart. Auto-pickup of pending GitHub work fires on fresh-launch sessions.

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
