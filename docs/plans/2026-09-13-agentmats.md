# agentmats — unify the placemats into one open-source project

**Date:** 2026-09-13 · **Owner:** Dom Mango · **Status:** approved design, ready to execute

## Goal

One public repo, `dommango/agentmats`, live at `https://dommango.github.io/agentmats/`,
holding every placemat — Claude Code, Codex CLI, Kimi Code, Hermes Agent, Antigravity —
on the shared template, with both source repos' full commit histories preserved,
ready to be promoted as an open-source project.

Sources being unified:

- `dommango/claude-code-placemat` — the original (first commit 2026-03-27, ~170 commits,
  385 rows, daily sync since spring). Root-level layout, inline JS, own generator/tests.
- `dommango/agent-placemats` — the multi-agent monorepo (2026-09-12, 13 PRs): hub,
  `shared/placemat.{css,js}`, per-agent dirs, generic generator + 563-line test suite
  with the vendor-inventory gate. Its layout is the target layout.
- branch `agent-placemats:feat/antigravity` — closed PR #11; 111 rows, 35 wrong + 20
  unsourced per the audit recorded in that PR's comments. Re-armed 2026-09-13 with a
  real 44-command inventory; fails exactly 4 tests today (list in Task 4).

## Decisions (locked; U = unification, extending D1–D8 in `docs/plans/2026-09-12-agent-placemats.md`)

| # | Decision | Why | Rejected |
|---|---|---|---|
| U1 | New repo `dommango/agentmats`, public, MIT. Both histories imported with `git filter-repo --to-subdirectory-filter` (CC → `claude-code/`; agent-placemats at root) and merged with `--allow-unrelated-histories`. Old repos archived, never deleted. | Full authorship/date/message history for every line; `git log`/`blame` on `claude-code/…` trace to 2026-03-27 without a seam. Archived originals keep the original SHAs, PRs and discussions; GitHub keeps redirecting. | `git subtree add` (keeps SHAs, loses path traceability); squash import (loses history). |
| U2 | agent-placemats' layout is the target. Claude Code becomes `claude-code/` — a peer of the other agents, nothing special. | One template, one generator, one suite, one CI. | Keeping CC at root. |
| U3 | CC moves onto `shared/placemat.{css,js}`; its 453-line inline script is deleted; the CC-only **Builder** widget is **dropped** (D8 already excluded it from every other agent). Recorded as a Template/Structure `DEL` entry in the CC changelog; "per-agent builder" is noted as follow-up work. | One JS file; the suite requires exactly one inline script per page. | Carrying a second per-page script for CC alone. |
| U4 | localStorage: CC's unprefixed `placemat-seen-version` / `placemat-collapsed` become `pm-claude-code-seen-version` / `pm-claude-code-collapsed`. `shared/placemat.js` performs a one-time migration (copy old → new, then remove old) when `data-agent="claude-code"`. Theme/density keys stay shared (D6). | Same origin, so existing visitors keep their seen-state. | Silent key change (every CC visitor sees "385 new"). |
| U5 | Changelog ids unify on `rel-<version-with-dashes>`; CC's 110 `cc-v2-1-269`-style ids are rewritten once. | One generator, one heading contract. Old permalinks only ever lived on the old domain, which becomes a redirect stub. | Per-agent id schemes. |
| U6 | Antigravity ships at launch, rebuilt on `feat/antigravity` against the inventory gate. PR #11's two audit comments are the correction spec. | Five agents incl. Google's is the launch story; the gate makes the rebuild bounded. | Launch with four. |
| U7 | Vendor inventories are backfilled for codex, kimi-code, hermes, claude-code; `INVENTORY_REQUIRED` becomes every agent. | "Verified" is currently enforced only for the one agent that isn't live. Promoting a "verified" reference with 80% of rows unenforced is a credibility risk. | Leaving the three launch placemats hand-verified. |
| U8 | Branding: wordmark **agentmats**, tagline *one page per coding agent*. Every header — CC included — leads with *Unofficial*. No vendor logos anywhere; the CC README's "Claude Code" typographic logo asset is dropped. | D5 applied uniformly; CC was the most exposed on trademark. | CC keeping its own look. |
| U9 | Five daily cloud routines repointed to agentmats: claude-code 09:00, codex 09:15, kimi-code 09:30, hermes 09:45, antigravity 10:00 UTC. Done by Dom + firstmate in an interactive session via `/schedule` (account-level, not repo-level). | D4 unchanged. | One sweep routine. |
| U10 | Old sites become meta-refresh stubs, path-for-path, with `rel=canonical` to the new URL; each old `feed.xml` gets one final entry announcing the new feed URL. | Pages has no server redirects; feed readers don't follow meta refresh. | Deleting the old Pages sites. |

## Target layout

```
index.html                  hub: five cards, combined what's-new, Rosetta (five columns)
shared/placemat.css         one stylesheet, per-agent accent slots
shared/placemat.js          one script; derives storage keys from data-agent; U4 migration
claude-code/                index.html changelog.html changes.json feed.xml sources.json PIPELINE.md versions/{v0.0,v1.0,v1.1}.html
codex/  kimi-code/  hermes/  antigravity/   same shape
scripts/build-changes.js    generator (per-agent or --all)
tests/placemat.test.js      structural suite + inventory gate, all five agents
.github/workflows/ci.yml    html5validator + suite + staleness (SHA-pinned actions)
.github/{ISSUE_TEMPLATE,PULL_REQUEST_TEMPLATE.md,dependabot.yml}
docs/plans/                 this plan + the 2026-09-12 plan
AGENTS.md CLAUDE.md README.md CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md LICENSE
```

## Execution model

- Task 0 is firstmate's own captain-approved project operation (repo creation + history
  import + first push). Everything after is a worker PR to `main`, one worker per task,
  on the cheaper model; CI is the gate; firstmate merges green PRs under the project's
  yolo posture. Task 7 (cut-over/archive) and Task 8 (routines) are captain-gated.
- Dependencies: T0 → T1 → T2 → {T4, T5a–d} → T6 → T7 → T8. T3 needs only T0 and runs
  alongside T1/T2. T9 (launch post) needs T6.
- Every PR runs `node tests/placemat.test.js && node scripts/build-changes.js --all --check`
  locally before push; CI must be green before merge.
- Never touch `versions/` snapshots (one named exception in Task 4 and Risk 3). Never hand-edit `changes.json`/`feed.xml`.

---

## Task 0 — Bootstrap `agentmats` (firstmate, captain-approved)

**Files:** new repo; `docs/plans/2026-09-13-agentmats.md` (this file); `docs/plans/2026-09-12-agent-placemats.md` arrives with the agent-placemats history.

**Steps:**
1. `gh-axi repo create dommango/agentmats --public` — description
   "Unofficial one-page placemat references for CLI coding agents — Claude Code, Codex, Kimi Code, Hermes, Antigravity — kept current daily",
   MIT, squash-merge only, `delete_branch_on_merge`. Do **not** initialise with a README.
2. In a scratch dir (not under `projects/`): clone `agent-placemats` (all refs) and
   `claude-code-placemat` (`main` only). Run `git filter-repo --to-subdirectory-filter claude-code`
   on the CC clone. In the agent-placemats clone: `git remote add cc <cc-clone> && git fetch cc &&
   git merge --allow-unrelated-histories cc/main -m "feat: import claude-code-placemat history under claude-code/"`.
   Keep `feat/antigravity` as a branch (Task 4 consumes it).
3. Copy this plan to `docs/plans/`, commit `docs: add the agentmats unification plan`.
4. Push `main` and `feat/antigravity` to `dommango/agentmats`. Enable Pages from `main` / root.
5. Clone into `projects/agentmats`; register in `data/projects.md`.

**Acceptance:** `git log --oneline -- claude-code/index.html | tail -1` is the CC first commit
(2026-03-27); `git log --oneline -- codex/index.html | tail -1` is agent-placemats' Codex content commit;
`node tests/placemat.test.js` passes for codex/kimi-code/hermes (claude-code not yet in `AGENTS`);
Pages serves `https://dommango.github.io/agentmats/`.

## Task 1 — Rebrand agent-placemats → agentmats (PR)

**Files:** `index.html`, `*/index.html`, `*/changelog.html`, `tests/placemat.test.js` (`SITE`),
`scripts/build-changes.js` (feed URLs), `README.md`, `AGENTS.md`, `CLAUDE.md`.

- `SITE` and every canonical / `og:url` / `og:image` / feed `<link>` → `https://dommango.github.io/agentmats/…`.
- Wordmark: header mark reads **agentmats** (keep the neutral 8-bit prompt glyph; same style as today's "Agent PLACEMATS"); `<title>` "agentmats — one page per coding agent"; hub intro keeps the current copy.
- Hub Claude Code card: URL `claude-code/`, `changes: 'claude-code/changes.json'` — same-origin now. Remove the README's cross-origin caveat.
- `AGENTS.md`/`README.md`: repo name, live URL, the "Claude Code lives in its own repo" paragraph → it is `claude-code/` here (Task 2 lands it).
- Regenerate all `changes.json`/`feed.xml`.

**Acceptance:** `grep -r "agent-placemats" --include=*.html --include=*.js --include=*.md .` returns only the plan docs and historical changelog prose; suite + staleness check green; CI green.

## Task 2 — Migrate the Claude Code placemat onto the shared template (PR)

**Files:** `claude-code/index.html`, `claude-code/changelog.html`, `claude-code/sources.json` (new),
`claude-code/PIPELINE.md` (new), `shared/placemat.js` (U4 migration), `tests/placemat.test.js` (`AGENTS` += `'claude-code'`),
`scripts/build-changes.js` (only if CC's changelog needs a construct the generator lacks — extend, don't fork).
Delete from `claude-code/`: `.github/`, `docs/`, `scripts/`, `tests/`, `placemat.css`, `README.md`, `CONTRIBUTING.md`,
`SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `CLAUDE.md`, `.gitignore` (Task 3 lifts what it needs from git history).

- `<html lang="en" data-agent="claude-code">`; stylesheet → `../shared/placemat.css` plus the accent `<style>` override (evocative, not Anthropic's palette; must override both `:root` and `:root[data-theme="light"]`).
- Delete the inline behaviour script; keep only the FOUC theme-init script, byte-identical to the other pages; add `<script src="../shared/placemat.js" defer>`.
- Drop the Builder block (U3). Changelog gets a Template/Structure entry: `DEL` Builder, `CHG` migrated into agentmats, ids renamed.
- Header: "Unofficial · auto-updated reference" tagline + the standard disclaimer (U8).
- Changelog: 110 `<h3 id="cc-v…">` → `id="rel-…"` (U5); month-group / Template-vs-Content structure to match the house format.
- `shared/placemat.js`: if `AGENT === 'claude-code'` and `localStorage['placemat-seen-version']` exists and the prefixed key does not, copy `placemat-seen-version` and `placemat-collapsed` to the prefixed keys, then remove the unprefixed ones (U4).
- `sources.json`: `version_poll` = the npm registry `@anthropic-ai/claude-code` dist-tags + the official changelog; `docs` list; `gotchas` lifted from CC's README/CONTRIBUTING. `PIPELINE.md` in the house shape (copy `codex/PIPELINE.md`, adapt).
- Row ids (`i-…`) and row count (385) are unchanged.
- Regenerate `claude-code/changes.json` + `feed.xml`.

**Acceptance:** suite passes with `claude-code` in `AGENTS` (incl. "versions/*.html self-contained", "one inline script", "canonical card titles"); hub CC card hydrates from the local `changes.json`; `git log --follow -- claude-code/index.html | tail -1` is still 2026-03-27.

## Task 3 — Contributor pack + CI hardening (PR; parallel with T1/T2)

**Files (root):** `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/PULL_REQUEST_TEMPLATE.md`,
`.github/ISSUE_TEMPLATE/{bug,content-correction,new-agent-request,config}.yml`, `.github/dependabot.yml`, `.github/workflows/ci.yml`.

- Seed from `claude-code/{CONTRIBUTING,SECURITY,CODE_OF_CONDUCT}.md` and `claude-code/.github/` (read them from the working tree, or from git history if Task 2 has already removed them).
- CONTRIBUTING: the bot/human split; "Adding an agent" pointing at AGENTS.md's inventory-first rule; the checks a PR must pass.
- `new-agent-request.yml`: asks for the vendor's published command reference URL up front (the inventory source).
- PR template: checklist — suite run, staleness check, no `versions/` edits, no hand-edited generated files, rows sourced from the vendor (not a sibling).
- `dependabot.yml` for `github-actions`; pin the three actions in `ci.yml` by SHA with a version comment.

**Acceptance:** files present; CI green; `actionlint` clean if available.

## Task 4 — Antigravity rebuild (PR from `feat/antigravity`, after T2)

**Spec:** the audit in PR #11's two comments (`gh pr view 11 -R dommango/agent-placemats --comments`) is the row-by-row correction list; `antigravity/sources.json` `inventory` (44 slash, 16 settings, 5 hooks; source `https://antigravity.google/docs/cli/reference`) is the allowlist. The vendor reference is the only source; never a sibling placemat; nothing from the local machine.

The four failing tests today and what closes them:
1. **inventory gate** — delete the 12 phantom commands; rename `/plan` → `/planning`; rewrite settings to the camelCase keys; hooks to `PreToolUse`/`PostToolUse`/`PreInvocation`/`PostInvocation`/`Stop`; fix the 4 keybindings and the inverted `/clear`, `/undo` rows per the audit; add the real commands the audit lists as missing, each with a description condensed from the reference. Anything real but not on the reference → `class="unverified"`.
2. **canonical card titles** — `'Slash (Core)'` → `'Slash Commands (Core)'`.
3. **undefined classes** — remove or define `hub-disclaimer`, `scope-note`, `since-drawer-tools`.
4. **absolute internal link** — make `https://dommango.github.io/agent-placemats/` relative.

Also: rebase onto `main` (post-T2); hub fifth card + fifth Rosetta column (Plan mode row reads `/planning`; cells with no equivalent get `—`); `AGENTS` += `'antigravity'`; `PIPELINE.md` + `sources.json.version_poll` for the daily routine; snapshot `versions/v1.0.html` regenerated from the corrected page (the existing v1.0 was never published, so replacing it is allowed **this once** — note it in the changelog).

**Acceptance:** `node tests/placemat.test.js antigravity` all green; every `card-cli` row still matches `agy --help` (1.2.2); hub shows five cards.

## Task 5a–d — Inventory backfill: codex, kimi-code, hermes, claude-code (4 PRs, parallel, after T2)

Per agent: extract slash commands, settings keys and hook events from the vendor's published reference (the `docs` URLs in `sources.json`; for CC the official docs at `code.claude.com/docs`) into `sources.json.inventory` with `source` + `fetched`; add the agent to `INVENTORY_REQUIRED`; run the suite; for each offender either correct the row from the reference or mark it `unverified`. Record corrections as changelog `FIX`/`DEL` entries. Do not touch other agents' directories.

**Acceptance:** suite green with the agent in `INVENTORY_REQUIRED`; PR body lists the offenders found and how each was resolved.

## Task 6 — README overhaul + repo metadata (PR + `gh api`, after T4)

- README: hero screenshot of the hub (five cards + Rosetta) at 1600px, captured from the live site; one-paragraph "why" (every agent has the same eight jobs; here they are side by side); the five-agent table with live "as of" versions; the Rosetta pitch above the fold; "Add an agent" (inventory first) and "How it stays current"; badges (live, CI, MIT). No vendor logos.
- `og-image.png` refreshed to the new wordmark.
- Repo metadata via `gh api`: description, `homepage` = live URL, topics `coding-agents claude-code codex kimi-code hermes-agent antigravity cli cheatsheet reference developer-tools`.
- The social-preview image can only be set in the GitHub UI: the PR body names the file and asks Dom to upload it.

**Acceptance:** README renders with the screenshot on GitHub; `gh repo view dommango/agentmats --json topics,homepage,description` shows the values.

## Task 7 — Cut-over: redirect stubs + archive (captain-gated)

Two PRs, one per old repo, opened by workers; merged and archived only on Dom's explicit word.

- claude-code-placemat: `index.html` → `<meta http-equiv="refresh" content="0; url=https://dommango.github.io/agentmats/claude-code/">` + `<link rel="canonical">` + a visible link; `changelog.html` → `…/claude-code/changelog.html`; `feed.xml` keeps its entries and gains one final entry "Moved: subscribe at https://dommango.github.io/agentmats/claude-code/feed.xml". README: one line pointing across. Remove the CI workflow (nothing left to validate).
- agent-placemats: same, path-for-path (`/`, `codex/`, `kimi-code/`, `hermes/`, each `changelog.html`, each `feed.xml`).
- Then `gh repo archive` both — **only after Dom says so**. Never delete.

**Acceptance:** every old URL lands on its new equivalent within one hop; old feeds validate; both repos show "archived".

## Task 8 — Routines (Dom + firstmate, interactive)

Via `/schedule`: repoint the four existing routines' prompts to `github.com/dommango/agentmats` and the per-agent directory; add `antigravity-placemat-sync` at 10:00 UTC using the Task 15 prompt template from the 2026-09-12 plan. Silent-exit rule stands. Capture the routine listing as evidence.

## Task 9 — Launch post draft (firstmate)

Draft in Dom's voice to firstmate `data/launch/2026-09-agentmats-post.md`: why placemats, the Rosetta idea, the "sourced from the vendor, enforced by tests" story (the antigravity failure is the honest anecdote), the five agents, the link. Draft only — Dom publishes.

---

## Risks

1. **filter-repo rewrites SHAs** — accepted (U1); the archived original keeps them.
2. **CC changelog constructs the generic generator can't parse** — extend the generator in T2 rather than special-casing CC; the 122-line divergence between the two generators is the map.
3. **Snapshot self-containment** — CC's `versions/v0.0.html` may reference `../placemat.css`; the suite's self-containment test will say. If so, that snapshot is inlined **once** and the change recorded — the only other permitted snapshot edit.
4. **Inventory extraction quality (T5)** — a sloppy inventory marks true rows unverified (visible, recoverable) rather than passing false ones (the failure mode being fixed). Prefer that direction.
5. **Routine cut-over window** — between the T7 merge and T8, the old routines would open PRs against archived repos and fail; do T8 the same day as T7.
