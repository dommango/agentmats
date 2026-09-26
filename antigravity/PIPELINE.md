# Antigravity CLI daily sync — pipeline rules

Machine-readable sources live in `sources.json`; this file is the procedure.

## Procedure

1. Read the current version from `index.html`'s `.release-tag`.
2. Poll `sources.json → version_poll` (apply its filter and transform). If the
   primary URL is unreachable, try each of `version_poll.fallbacks` (when
   declared) in the given order — an undeclared source is never acceptable,
   so a primary failure with no working declared fallback is a hard failure,
   not permission to improvise a mirror. Then confirm against `cross_check`.
   **Gotcha:** `api.github.com` is gated in the routine sandbox — it returns
   "GitHub access to this repository is not enabled for this session" even
   though it is reachable from other contexts — so treat it as unreachable
   there, never as evidence that nothing is newer. A run that cannot reach
   the primary source and every declared fallback fails loudly (see
   "Sync-blocked reporting" below); it must never report "nothing newer".
3. **Not newer → exit silently: no branch, no commits, no PR, no output.**
   A routine that opens empty PRs trains everyone to ignore the queue.
4. Collect release notes for EVERY release between the current and newest version,
   following the `release_notes` rule.
5. Cross-reference against the placemat cards and apply row edits per the Content
   rules in `AGENTS.md`:
   - verified-only; anything you can only infer gets `class="unverified"`
   - re-check every existing `class="unverified"` item against the newly fetched
     sources and strip the class from any that are now confirmed
   - a changed item gets a note, not a longer summary
   - never write `class="new"` — the page computes that per reader from `changes.json`
   - never change an existing `i-` row id; they are permalinks
   - when this sync adds new rows, re-extract `sources.json → inventory` from the
     vendor sources and bump `inventory.fetched` to today's date in the same PR
6. Update `changelog.html` (one section per release, or one ranged heading using the
   LAST version for the id when batching), the `.release-tag` and `.print-head` pair,
   and the footer `Content synced` date. All three must agree.
7. Run `node scripts/build-changes.js <agent>` then `node tests/placemat.test.js <agent>`.
   Both must pass before you go further.
8. Self-review: technical accuracy against the sources, changelog entry quality,
   consistency with the other cards.
9. Branch `claude/<agent>-update-v<newest>`, commit
   `feat(<agent>): update placemat for <Name> v<newest>`, push, and open a PR with a
   change summary and your checklist results. Never push to `main`. Never touch
   another agent's directory.
10. **Merge gate.** Run the `code-review` skill against the PR's diff — independent
    of your Step 8 self-review; the `Task`/Agent tool is not available in the
    routine sandbox, so this replaces spawning a `code-reviewer` subagent. Post
    the review verdict as a PR comment before merging, whether clean or not — the
    verdict must not live only in the run log. No CRITICAL/HIGH finding → confirm
    both CI checks are green (`get_check_runs`), then merge via the GitHub MCP
    `merge_pull_request` (`gh` is not available in the sandbox) and delete the
    branch explicitly afterward, since the MCP merge has no `--delete-branch`
    equivalent. Any CRITICAL/HIGH finding → fix it and request exactly one
    re-review; if a CRITICAL/HIGH finding still stands after that, stop — leave
    the PR open with the findings already posted as a comment, and do not merge.
11. **Close-on-success.** Once Step 2 has reached a source (primary or a
    declared fallback) this run, check whether a GitHub issue titled
    `sync blocked: <agent>` is open (via the GitHub MCP) and, if so, close it
    with a comment explaining why: cite this PR when Steps 4-10 shipped one,
    or note that the source is reachable again with nothing newer when Step 3
    exited silently instead. Run this check on every run that reaches a
    source, not only ones that ship a PR — the block can clear before the
    next new release does, so Step 3's silent no-op must not silently leave a
    resolved issue open too.

## Sync-blocked reporting

If Step 2 cannot reach the primary source and every declared fallback, in
addition to the usual push notification: open a GitHub issue titled
`sync blocked: <agent>` (or comment on the existing open one with that exact
title) via the GitHub MCP, describing what was tried and why it failed. This
keeps a genuine block distinguishable from the correct silent no-op in
Step 3 — a routine `status = SUCCEEDED` does not by itself mean content
shipped. Step 11 closes this issue once a later run reaches a source again.

## Antigravity-specific traps

- **No declared fallback exists for this agent.** `antigravity.google` has no known
  working mirror — do not invent one. A blocked run here always ends in
  "Sync-blocked reporting" above until the environment's network allowlist is fixed.
- **The changelog page has tabs, and the CLI is not the default one.** All four
  products (hub, IDE, SDK, CLI) are in one HTML page as `data-list-panel` panels;
  the hub panel is visible by default and carries 2.15.x-style versions, the CLI
  panel is `display: none` and carries 1.2.x. Reading the first version on the page
  gives 2.x and silently skips every CLI release. There is no markdown heading to
  match and no separate CLI URL — parse the raw HTML for `data-list-panel="cli"`.
  This is how 1.2.3–1.2.5 went unsynced.
- **Binary name is `agy`.** Top-level invocations use `agy`, never `antigravity`.
- **Progressive disclosure.** Skills expose only name + description until the agent
  decides one is relevant, then loads the full `SKILL.md`.
- **Two-tier rules, not a walked hierarchy.** Global rules live in `~/.gemini/GEMINI.md`;
  workspace rules live in `.agents/rules/*.md` (12,000 chars each). Do not assume an
  AGENTS.md-style walk-up-to-root unless a fresh vendor fetch confirms it.
- **`cli/reference` is the only source for slash commands, settings keys, hook events,
  and keybindings** — never a sibling placemat, never this machine's `~/.agents/skills`,
  never the CLI you are running in. Settings keys are camelCase (`toolPermission`, not
  `tool_permission`); hook events are `PreToolUse`/`PostToolUse`/`PreInvocation`/
  `PostInvocation`/`Stop` — nothing else.
- **CLI flags/subcommands come from `agy --help`, not the docs site** — the reference
  page has no flags/subcommands section. Re-run `agy --help` and diff against the
  `card-cli` rows on every sync.
- **Environment variables are thin.** Only `GEMINI_API_KEY` and
  `GOOGLE_GEMINI_BASE_URL` are vendor-confirmed (from the install/auth docs, not
  `cli/reference`). Do not add `ANTIGRAVITY_*`/`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/
  `NO_COLOR`/proxy vars without a fresh citation — the first build invented all of them.
