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
10. **Merge gate.** Spawn a `code-reviewer` subagent (via `Task`) against the PR's diff — independent of your Step 8 self-review. No CRITICAL/HIGH finding → merge immediately: `gh pr merge --squash --delete-branch`. Any CRITICAL/HIGH finding → fix it and request exactly one re-review; if a CRITICAL/HIGH finding still stands after that, stop — leave the PR open, post the findings as a PR comment, and do not merge.

## Antigravity-specific traps

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
