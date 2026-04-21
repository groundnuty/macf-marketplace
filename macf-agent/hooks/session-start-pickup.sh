#!/usr/bin/env bash
# SessionStart auto-pickup hook (v0.1.7+).
#
# Queries GitHub for issues labeled with this agent's name across every
# repo the agent's App is installed on (discovered live via
# `/installation/repositories`). If the total is >0, emits an
# `additionalContext` payload telling Claude how many issues are
# pending and where. Empty queue → emits nothing (silent, ~0 tokens).
#
# Design rationale (macf-marketplace#13):
#   - "App install = agent watches this repo" matches how multi-repo
#     scope actually emerges in MACF (dynamic, operator-managed via
#     App install state), not a static config list.
#   - No `watched_repos` config or `MACF_WATCHED_REPOS` env var needed.
#   - Single API call (`/installation/repositories`) replaces an
#     N-repo-config surface in macf-agent.json.
#   - Fail-silent on any error path (missing token, API failure,
#     missing env). Better to skip the nicety than emit broken JSON
#     and trip the ToolUseContext class of bug (see #7/#10 history).
#
# Expected env (set by claude.sh):
#   MACF_WORKSPACE_DIR — workspace root (for token helper path)
#   MACF_AGENT_NAME    — agent name, matched against issue labels
#   APP_ID, INSTALL_ID, KEY_PATH — for macf-gh-token.sh

set -eu

# Fail-silent if any required env is missing.
: "${MACF_WORKSPACE_DIR:=}"
: "${MACF_AGENT_NAME:=}"
[ -z "$MACF_WORKSPACE_DIR" ] && exit 0
[ -z "$MACF_AGENT_NAME" ] && exit 0

TOKEN_HELPER="$MACF_WORKSPACE_DIR/.claude/scripts/macf-gh-token.sh"
[ -x "$TOKEN_HELPER" ] || exit 0

GH_TOKEN=$("$TOKEN_HELPER" --app-id "${APP_ID:-}" --install-id "${INSTALL_ID:-}" --key "${KEY_PATH:-}" 2>/dev/null) || exit 0
[ -z "$GH_TOKEN" ] && exit 0
export GH_TOKEN

# Enumerate the repos this App installation covers.
REPOS=$(gh api /installation/repositories --paginate --jq '.repositories[].full_name' 2>/dev/null) || exit 0
[ -z "$REPOS" ] && exit 0

total=0
details=""
while IFS= read -r repo; do
  [ -z "$repo" ] && continue
  count=$(gh issue list --repo "$repo" --label "$MACF_AGENT_NAME" --state open --json number --jq 'length' 2>/dev/null || echo 0)
  # Guard against non-numeric output (some gh error paths emit text).
  case "$count" in
    *[!0-9]*) count=0 ;;
  esac
  total=$((total + count))
  [ "$count" -gt 0 ] && details="${details}${repo}:${count} "
done <<EOF
$REPOS
EOF

if [ "$total" -gt 0 ]; then
  # Escape the details for JSON — trim trailing space, no special chars
  # expected (repo names are [A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+ and count
  # is numeric).
  details_trimmed="${details% }"
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"You have %d pending issue(s) labeled %s across your installed repos: %s. Run /macf-issues to pick them up."}}' \
    "$total" "$MACF_AGENT_NAME" "$details_trimmed"
fi
