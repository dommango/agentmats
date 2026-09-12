# Hermes Agent daily sync — pipeline rules

Machine-readable sources live in `sources.json`; this file is the procedure.

## Procedure

1. Read the current version from `index.html`'s `.release-tag`.
2. Poll `sources.json → version_poll` (apply its filter and transform), then confirm
   against `cross_check`.
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

## Hermes-specific traps

- **SCOPE IS THE WHOLE JOB.** Hermes is a general autonomous agent with 80+ commands.
  This placemat covers the CLI/TUI coding surface only. Add nothing that is not on
  `scope_allowlist`, and never anything on `scope_denylist`. If sync PRs start
  ballooning, tighten the allowlist rather than growing the page.
- **The scope note beside the legend must stay generic.** Do not list excluded feature
  names in `index.html` — the denylist grep that guards the scope would start matching
  the note itself. Record specifics in `changelog.html` instead.
- **Dual versioning.** The tag is a date (`vYYYY.M.D`, sometimes with a `.N` same-day
  patch) and the semver lives in the release title: `Hermes Agent v0.21.2 (v2026.9.11)`.
  Display both, and use the **semver** for the changelog id. The tag date and the
  publish date do not always agree.
- **NEVER poll PyPI.** The `hermes-agent` package lags badly behind the releases.
- **The docs site 404s on `.md`.** Fetch markdown from the in-repo mirror at
  `raw.githubusercontent.com/NousResearch/hermes-agent/main/website/docs/<path>.md`.
- **Release notes are narrative essays** covering hundreds of commits, with no curated
  changelog file. Summarize, and extract only what touches the scoped surface.
- **`llms-full.txt` is about 3.7 MB — never ingest it whole.** Use `/docs/llms.txt` to
  spot page renames, which happen often.
