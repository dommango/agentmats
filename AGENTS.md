# AGENTS.md — agentmats

Unofficial single-page placemat references for CLI coding agents, one per
directory: `claude-code/` (Anthropic Claude Code), `codex/` (OpenAI Codex CLI),
`kimi-code/` (Moonshot Kimi Code), `hermes/` (Nous Research Hermes Agent),
`antigravity/` (Google DeepMind Antigravity CLI). The hub page at the repo root
links them all, each a peer directory in this repo.

**Live:** https://dommango.github.io/agentmats/ — GitHub Pages deploys
from `main`.

The full implementation plan, including the locked design decisions D1-D8 that
this file summarises, is in `docs/plans/2026-09-12-agent-placemats.md`.

## Structure

```
index.html                — hub (agent cards, combined what's-new, Rosetta table)
shared/
  placemat.css            — the one stylesheet, with per-agent accent slots
  placemat.js             — the one page script (search, theme, copy, notes, since)
codex/
  index.html  changelog.html  changes.json  feed.xml
  sources.json  PIPELINE.md
  versions/v1.0.html
kimi-code/                — same shape as codex/
hermes/                   — same shape as codex/
antigravity/              — same shape as codex/
scripts/build-changes.js  — generator (per-agent arg, or --all)
tests/placemat.test.js    — structural suite (per-agent arg, or all built agents)
.github/workflows/ci.yml
docs/plans/               — the implementation plan + task state
AGENTS.md  CLAUDE.md  README.md  LICENSE
```

`changes.json` and `feed.xml` are **generated** — never hand-edit them.
`versions/*.html` snapshots are immutable archives and are deliberately
self-contained (their own inline `<style>` and `<script>`, no reference to
`shared/`), so that moving or changing shared assets can never alter how a past
version renders. Never refactor a snapshot onto the shared files.

## Canonical cards

Identical ids, in this order, in every agent's `index.html` (D2):

`card-keys`, `card-slash-core`, `card-slash-tools`, `card-cli`,
`card-settings`, `card-env`, `card-skills`, `card-hooks`

Titles may vary per agent — Hermes's `card-hooks` is "Automation & MCP",
because Hermes has no feature called hooks. **Never invent new card ids**, and
never reorder them: the section nav, the test suite and the muscle memory of
multi-agent readers all depend on this set.

## Commands

```bash
node scripts/build-changes.js <agent>      # regenerate <agent>/changes.json + feed.xml
node scripts/build-changes.js --all --check # CI staleness gate
node tests/placemat.test.js [<agent>]      # structural suite
python3 -m http.server 8000                # local preview → http://localhost:8000
```

`--all` and the no-argument test run skip agent directories that do not exist
yet, so both work mid-build. Naming an agent explicitly still fails if its
directory is missing.

## Style guide

- OS-preference theme detection with `localStorage` persistence
- Per-agent accents are set by a small `<style>` block in each page's `<head>`,
  overriding `--accent-1` / `--accent-1-2` / `--accent-2` / `--accent-2-2`.
  It must override **both** `:root` and `:root[data-theme="light"]` — a bare
  `:root` rule loses to the light-theme block in `shared/placemat.css`
- Accents are evocative, never a vendor's brand palette; no vendor logos or
  wordmarks anywhere (D5). The header mark is a neutral 8-bit terminal prompt
- All content is searchable via the global search (Ctrl+K or `/`); search
  ignores separators, so `ctrl+r` finds `Ctrl R`
- Tables use `12px` font, `4px 6px 3px` cell padding, fixed first-column width at 44%
- Every `<code>` element is click-to-copy
- Item status is shown via shaded code backgrounds, not badges:
  - Default: verified
  - Accent-tinted (`code.new`): changed since this reader's last visit —
    applied at runtime from `changes.json`, never written into the HTML
  - Yellow-tinted (`code.unverified`): unverified
- A legend at the top of each placemat explains the shading
- Card headings are uppercase with letter-spacing
- Code elements use `word-break: break-word` — never truncate with `...`
- Groups are `<details class="search-group" open data-group="<Title>">` with
  `<summary><h3>…</h3><span class="group-count"></span></summary>`; row counts
  are filled by JS at load — never hand-write them
- Each page has exactly **one** inline `<script>` (the blocking theme-init FOUC
  guard, byte-identical between a page and its changelog) plus
  `<script src="../shared/placemat.js" defer></script>`
- Printable: the `@media print` block at the end of `shared/placemat.css`
  renders A4 landscape, four columns, summaries only; keep new chrome (bars,
  drawers, buttons) in that block's hide list
- No external dependencies — everything self-hosted, no build step, no `npm install`

## localStorage keys (D6)

Every placemat on `dommango.github.io` shares one origin, so keys are chosen
deliberately:

| Key | Scope | Why |
|---|---|---|
| `placemat-theme` | shared across **all** placemats, CC included | one theme choice everywhere is a feature |
| `placemat-density` | shared | same |
| `pm-<agent>-seen-version` | per agent | a shared key would clobber another placemat's seen-state |
| `pm-<agent>-collapsed` | per agent | JSON array of folded group titles |

`<agent>` comes from `<html data-agent="…">`; `shared/placemat.js` derives the
key names, so a page gets the right keys just by declaring its agent.

**The Claude Code placemat owns the unprefixed `placemat-seen-version` and
`placemat-collapsed` — never read or write those from this repo.** The hub
never writes any seen-marker at all (D7): only a placemat page marks itself
seen, so "N new since your last visit" stays true until you actually visit.

## Adding a new agent

A new placemat gets built next to finished ones, and the cheapest way to fill a
card is to copy the neighbour's. That is how the first Antigravity attempt went
wrong: 12 of its 21 slash commands did not exist, and 8 of those 12 were sitting
in a sibling placemat. Its settings card was snake_case because its neighbours'
TOML keys are, while the real schema is camelCase. Nothing in CI noticed,
because every check tested structure rather than truth.

So, when building a new agent:

- **Source each card from the vendor, never from another placemat.** The other
  placemats tell you what a card is *for*, never what belongs in it. If a fact
  arrives because a sibling has it, it is not sourced.
- **Watch for near-misses.** `/plan` for `/planning` is the signature of a row
  derived by analogy. So is a whole card in the wrong naming convention.
- **The Rosetta table is the highest-risk surface**, because its shape invites
  filling every cell. An agent that lacks an equivalent gets `—`.
- **Nothing outside the vendor's docs is vendor surface.** The local machine's
  skills, this repo's tooling, and the CLI you are running in are all off-limits
  as sources. One row in that attempt documented a skill from the author's own
  `~/.agents/skills/` as a built-in.
- **A card with no verified content stays short.** The eight cards are a fixed
  set of headings, not eight quotas to fill.
- **Extract an inventory first, build the page second.** `sources.json` carries
  an `inventory` block — the command, settings-key and hook-event names lifted
  from the vendor reference, with `source` and `fetched`. The test suite checks
  every row against it, so a fabricated command fails CI rather than review.
  Anything genuinely real but absent from the reference gets `unverified`.
- A binary's `--help` verifies the CLI card only. Keybindings, slash commands,
  settings keys and env vars are most of the page and need their own sources.

## Content rules

- Only include features verified against that agent's official docs, its
  changelog, or its own `--help` output
- Mark anything you could only infer with the `unverified` class on the
  `<code>` element
- **Promote** unverified items by removing the class once the official docs or
  changelog confirm them. Every sync run must re-check existing
  `class="unverified"` items against the newly fetched sources and strip the
  class from any that now have confirmation
- **Do not** write `class="new"` or `<!-- added:vX.Y.Z -->` into `index.html`;
  the page computes what is new for each visitor from `changes.json`
- Never truncate code text with `...` — always show the full command/flag/path
- Every row carries `id="i-<slug>"`: the first `<code>` text, lower-cased,
  non-alphanumerics collapsed to `-`, trimmed (`--permission-mode manual` →
  `i-permission-mode-manual`); duplicates get `-2`, `-3`. Ids are permalinks —
  never change an existing one when editing a row
- Every row's first cell starts with
  `<a class="row-link" href="#<row id>" tabindex="-1" title="Copy link to this entry (or press l on the row)" aria-label="Copy link to this entry">#</a>`
- New rows go inside the `<table>` of the matching `<details class="search-group">`;
  when adding a group, copy an existing `<details>` block including its `<summary>`
- Every description is either one short sentence (≤ 90 characters, present
  tense, what it does) or a two-tier cell:
  `<span class="summary">…</span> <button type="button" class="notes-btn" aria-expanded="false">+N</button><ul class="notes" hidden><li>…</li></ul>`
  where N equals the number of `<li>`
- When a release changes an existing item, add or edit a **note**; never append
  to the summary. If the change alters what the item fundamentally does,
  rewrite the summary instead of extending it
- Never write "now", "also", "no longer", or a version number into a summary;
  those belong in notes
- `tests/placemat.test.js` fails any description over 160 visible characters
  outside its notes
- Descriptions are original condensed wording, not copied vendor prose. Codex's
  docs site carries no explicit content licence; Kimi Code and Hermes Agent are
  MIT. Condensing in our own words, with a link to the official page, is the
  house style everywhere

## Changelog format

- Entries use tags `ADD`, `CHG`, `FIX`, `DEL`, shaped
  `<li><span class="tag tag-add">ADD</span><span class="entry">…</span></li>`
- Release headings are
  `<h3 id="rel-<version-with-dashes>">&lt;Name&gt; v&lt;version&gt; <span class="version-date">YYYY-MM-DD</span></h3>`
  — e.g. `<h3 id="rel-0-154-0">Codex CLI v0.154.0 …`. Ranged headings
  (`v0.153.0–v0.154.0`) use the **last** version for the id; Hermes uses its
  semver for the id and shows the date tag in the label
- Only the newest month `<details class="month-group">` is `open`
- Each page separates **Template/Structure** changes from **Content/Release** changes
- After editing a changelog, run `node scripts/build-changes.js <agent>`; CI
  fails if the generated files are stale

## Per-page parity

Three values must agree, or the suite fails:

1. the header `.release-tag` ("As of release: vX.Y.Z"),
2. the `.print-head` release line,
3. the footer "Content synced YYYY-MM-DD" date, which must equal the newest
   changelog release's date.

The release tag may run at most 3 versions ahead of the newest changelog entry
(releases with nothing placemat-relevant get no entry).

## Update pipeline

One scheduled routine per agent, staggered after the Claude Code placemat's
09:00 UTC run: codex 09:15, kimi-code 09:30, hermes 09:45, antigravity 10:00.
Each run follows
`<agent>/PIPELINE.md` and `<agent>/sources.json` — the rules live in this repo,
versioned, not in the routine prompt, so fixing a pipeline is a normal PR.

Branch `claude/<agent>-update-v<version>`, commit
`feat(<agent>): update placemat for <Name> v<version>`, PR to `main`.

**Merge gate:** the routine runs the `code-review` skill against its own diff —
independent of the pipeline's Step 8 self-review, and posted as a PR comment
before merging either way, clean or not — and only merges on a clean result
with both CI checks green. No CRITICAL/HIGH finding → merge via the GitHub MCP
and delete the branch explicitly, no human involved. Any CRITICAL/HIGH finding
→ one fix-and-re-review pass; if the finding still stands, the PR stays open
with the findings posted as a comment and nothing merges. This formalizes the
review pass that caught three runtime-breaking defects in the Antigravity
rebuild (PR #11) before they reached `main` — the same check now runs on every
sync instead of depending on someone doing it by hand. (The routine sandbox
has neither the `Task`/Agent tool nor `gh`, which is why this is a skill
invocation and an MCP merge rather than a spawned subagent and `gh pr merge`.)

**If there is no release newer than the placemat's current "As of release"
version, the run exits silently — no commits, no PR, no output.** A routine
that opens empty PRs trains everyone to ignore the queue.

The cost of that rule is that a correct no-op and a routine that never ran look
identical from the outside: both produce nothing. Do not "fix" this by making
the routine chatty. The signal belongs in the scheduler's own run record — if a
sync looks overdue, check that the routine ran at all before assuming the poll
was wrong.

**A run that cannot reach its declared sources is a third outcome, distinct
from both of the above:** it fails loudly rather than reporting "nothing
newer", and — on top of the usual push notification — opens or comments on a
GitHub issue titled `sync blocked: <agent>` so the block survives and is
queryable instead of only existing in an ephemeral push. Each agent's
`sources.json → version_poll.fallbacks` declares, in order, the only sources a
run may fall back to when the primary is unreachable; an undeclared substitute
is never acceptable, even one that has worked before. `api.github.com` in
particular is gated in the routine sandbox regardless of which agent is
running. See each `<agent>/PIPELINE.md` for the exact mechanics.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the bot/human ownership split, the
checks a PR must pass, and the workflow. [SECURITY.md](SECURITY.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) apply too.

## Branch and commit conventions

- Feature branches only; never commit directly to `main`
- Conventional commits (`feat:`, `fix:`, `test:`, `ci:`, `docs:`, `chore:`),
  scoped per agent where it helps (`feat(codex): …`)
- Never amend, never `--no-verify`
- Squash-merge PRs; `delete_branch_on_merge` is on

## Do not

- Touch another agent's directory in a sync PR
- Edit `versions/` snapshots, ever
- Hand-edit `changes.json` or `feed.xml`
- Use vendor logos or imply endorsement — text wordmarks and a disclaimer only
- Write `class="new"` into any `index.html`
- Read or write the Claude Code placemat's unprefixed localStorage keys
- Poll PyPI for Hermes, `/releases/latest` for Codex, or `/zh/` docs for Kimi
