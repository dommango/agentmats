# Kimi Code daily sync — pipeline rules

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

## Kimi-specific traps

- **Only use `/en/` pages.** The docs are bilingual and `llms.txt` interleaves `/zh/`
  entries. Any page is fetchable as raw markdown by appending `.md`.
- **`version_poll.fallbacks` is the same content, mirrored into the repo.** When
  `moonshotai.github.io` is unreachable, use the declared
  `raw.githubusercontent.com/MoonshotAI/kimi-code/main/docs/en/release-notes/changelog.md`
  mirror instead — never an undeclared substitute, even though other docs pages are
  also fetchable that way.
- **Exclude `web:` entries from the changelog.** They describe the web UI, not the CLI.
  Features like `/tower` and selection annotation belong to the web app and must not
  appear on this placemat.
- **Strip the tag prefix** `@moonshot-ai/kimi-code@` when cross-checking GitHub releases.
- **The binary is `kimi`, not `kimi-code`.** Local `--help` output is excellent ground
  truth, but check the installed version against the release you are syncing and diff
  the gap against the changelog before trusting it.
- **Experimental flags churn within about two releases.** When a feature becomes
  always-on its `KIMI_CODE_EXPERIMENTAL_*` flag is removed — that is a `DEL` entry, and
  the corresponding row needs updating, not deleting. 0.42.0 did this to
  `KIMI_CODE_EXPERIMENTAL_REMOTE_CONTROL` and `KIMI_CODE_EXPERIMENTAL_SECONDARY_MODEL`,
  and replaced the minidb flags with a `[database]` config section.
- **Ignore anything about "kimi-cli"** — that is the stale predecessor product.
