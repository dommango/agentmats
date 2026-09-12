# Antigravity CLI daily sync — pipeline rules

Machine-readable sources live in `sources.json`; this file is the procedure.

## Procedure

1. Read the current version from `index.html`'s `.release-tag`.
2. Poll `sources.json → version_poll` (apply its filter and transform), then confirm against `cross_check` (`agy --version`).
3. **Not newer → exit silently: no branch, no commits, no PR, no output.**
   A routine that opens empty PRs trains everyone to ignore the queue.
4. Collect release notes for EVERY release between the current and newest version, following the `release_notes` rule.
5. Cross-reference against the placemat cards and apply row edits per the Content rules in `AGENTS.md`:
   - verified-only; anything you can only infer gets `class="unverified"`
   - re-check every existing `class="unverified"` item against the newly fetched sources and strip the class from any that are now confirmed
   - a changed item gets a note, not a longer summary
   - never write `class="new"` — the page computes that per reader from `changes.json`
   - never change an existing `i-` row id; they are permalinks
6. Update `changelog.html` (one section per release, or one ranged heading using the LAST version for the id when batching), the `.release-tag` and `.print-head` pair, and the footer `Content synced` date. All three must agree.
7. Run `node scripts/build-changes.js <agent>` then `node tests/placemat.test.js <agent>`. Both must pass before you go further.
8. Self-review: technical accuracy against the sources, changelog entry quality, consistency with the other cards.
9. Branch `claude/<agent>-update-v<newest>`, commit `feat(<agent>): update placemat for <Name> v<newest>`, push, and open a PR with a change summary and your checklist results. Never push to `main`. Never touch another agent's directory.

## Antigravity-specific traps

- **Binary name is `agy`.** Top-level invocations use `agy`, never `antigravity`.
- **Progressive disclosure.** Rules and skills only expose YAML frontmatter by default; do not confuse declared configurations with active context.
- **Hierarchical rules.** `AGENTS.md` and `GEMINI.md` are loaded by traversing up from the CWD to the repository root.
- **Model flags.** Antigravity defaults to `gemini-3.8-flash-high` with customizable reasoning effort (`low`, `medium`, `high`) via `--effort`.
