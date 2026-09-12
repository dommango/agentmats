# Codex CLI daily sync — pipeline rules

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

## Codex-specific traps

- **Filter releases to `rust-v` tags** that are neither prerelease nor draft, then strip
  the prefix. `/releases/latest` is useless here — `python-v*` and `voice-*` tags
  interleave with the CLI's.
- **Only read the release body above the `## Changelog` heading.** Everything below it
  is auto-generated PR spam.
- **Always pin `?surface=cli`** on docs URLs. The wrong surface silently serves
  desktop-app content that looks plausible and is wrong.
- **`developers.openai.com/codex/*` 308-redirects to `learn.chatgpt.com`.** Follow
  redirects and expect more URL churn; when a fetch 404s, re-derive the path from
  `llms.txt` and update `sources.json` in the same PR.
- **The global-flags table does not survive the `.md` export** — it renders as a
  `<ConfigTable client:load>` stub. Use `codex --help` (and each subcommand's
  `--help`) for flags. `npm i -g @openai/codex` if it is not installed.
- **The config reference is a JS array, not a markdown table.** Parse the
  `key` / `type` / `description` entries out of `<ConfigTable options={[...]}>`.
- **Trust the binary over the docs for what exists.** In 0.154.0 the docs carry a
  `codex app` section for a subcommand that does not exist, while the real
  `codex execpolicy` is hidden from top-level `--help`.
- **Patch bursts are normal.** Several stable releases in a day batch into one ranged
  changelog heading, whose id uses the last version.
