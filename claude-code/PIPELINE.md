# Claude Code daily sync — pipeline rules

Machine-readable sources live in `sources.json`; this file is the procedure.

## Procedure

1. Read the current version from `index.html`'s `.release-tag`.
2. Poll `sources.json → version_poll` (the npm registry `dist-tags.latest` for
   `@anthropic-ai/claude-code`), then confirm against `cross_check` (the
   official changelog page).
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
   - JSON settings that only apply in managed/enterprise policy files go in the
     `Managed & Enterprise` group of the Settings (JSON) card
6. Update `changelog.html` (one section per release, or one ranged heading using the
   LAST version for the id when batching), the `.release-tag` and `.print-head` pair,
   and the footer `Content synced` date. All three must agree.
7. Run `node scripts/build-changes.js claude-code` then `node tests/placemat.test.js claude-code`.
   Both must pass before you go further.
8. Self-review: technical accuracy against the sources, changelog entry quality,
   consistency with the other cards.
9. Branch `claude/claude-code-update-v<newest>`, commit
   `feat(claude-code): update placemat for Claude Code v<newest>`, push, and open
   a PR with a change summary and your checklist results. Never push to `main`.
   Never touch another agent's directory.
10. **Merge gate.** Spawn a `code-reviewer` subagent (via `Task`) against the PR's
    diff — independent of your Step 8 self-review. No CRITICAL/HIGH finding →
    merge immediately: `gh pr merge --squash --delete-branch`. Any CRITICAL/HIGH
    finding → fix it and request exactly one re-review; if a CRITICAL/HIGH finding
    still stands after that, stop — leave the PR open, post the findings as a PR
    comment, and do not merge.

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
