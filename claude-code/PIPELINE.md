# Claude Code daily sync — pipeline rules

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
   - JSON settings that only apply in managed/enterprise policy files go in the
     `Managed & Enterprise` group of the Settings (JSON) card
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

## Sync-blocked reporting

If Step 2 cannot reach the primary source and every declared fallback, in
addition to the usual push notification: open a GitHub issue titled
`sync blocked: <agent>` (or comment on the existing open one with that exact
title) via the GitHub MCP, describing what was tried and why it failed. Close
that issue the next time this agent's sync succeeds. This keeps a genuine
block distinguishable from the correct silent no-op in Step 3 — a routine
`status = SUCCEEDED` does not by itself mean content shipped.

## Claude Code-specific traps

- **npm `dist-tags.latest` can land ahead of the official changelog page** by a
  few hours. Cross-check the changelog before syncing content, not just the
  version number.
- **Two independent version numbers live on this placemat.** The template
  version (this page's own structure, bumped only on structural/visual
  redesigns) is separate from the CC release version (content, updated on
  every sync). Only the CC release version drives the header's "As of
  release" tag and the changelog's Content/Release sections — never bump the
  template version for a content-only sync.
- **`class="new"` is retired.** The standalone predecessor of this placemat
  wrote `class="new"` and an `<!-- added:vX.Y.Z -->` comment directly into
  `index.html`. This template computes "new since your last visit" per reader
  at runtime from `changes.json` — never write `class="new"` into `index.html`.
- **Settings scope matters.** A JSON setting that only applies under managed
  or enterprise policy files goes in the `Managed & Enterprise` group of the
  Settings (JSON) card, not the general settings groups.
- **No declared fallback exists for this agent.** `registry.npmjs.org` and
  `code.claude.com` both work end-to-end from the routine sandbox, so none was
  added — do not invent one.
