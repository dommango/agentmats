# Kimi Code daily sync — pipeline rules

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

## Kimi-specific traps

- **Only use `/en/` pages.** The docs are bilingual and `llms.txt` interleaves `/zh/`
  entries. Any page is fetchable as raw markdown by appending `.md`.
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
