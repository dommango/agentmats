# Agent Placemats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Task state lives in the co-located `.tasks.json`.

**Goal:** Build and host auto-updating single-page "placemat" references — modeled on the Claude Code placemat — for three more CLI coding agents (OpenAI Codex CLI, Moonshot Kimi Code, Nous Research Hermes Agent), plus a hub page for people who use several agents.

**Architecture:** One new public monorepo `dommango/agent-placemats`, served by GitHub Pages at `https://dommango.github.io/agent-placemats/`. Per-agent subdirectories (`codex/`, `kimi-code/`, `hermes/`) each hold an `index.html` + `changelog.html` + generated `changes.json`/`feed.xml`, all sharing one stylesheet and one JS file. A hub `index.html` at the repo root aggregates "what changed since your last visit" across all placemats — including the existing Claude Code placemat, which stays in its own repo (same `dommango.github.io` origin, so the hub can fetch its `changes.json` directly). One scheduled cloud routine per agent keeps content synced daily via PRs.

**Tech Stack:** Static HTML/CSS/vanilla JS, zero dependencies, no build step (Node used only for the generator/tests scripts). GitHub Pages hosting, GitHub Actions CI, Claude scheduled cloud routines for the daily sync.

**Executor notes (read first):**
- This plan is written for a smaller model executing without the author. Every fact in the per-agent tasks was verified against primary sources on 2026-09-12; re-verify anything marked *(unverified)* before publishing it.
- Run tasks **in order**; dependencies are recorded in `.tasks.json`. Do content tasks (7, 9, 10) **sequentially in one session each** — do NOT fan them out to parallel subagents editing tracked files (Dom's Stop-hook auto-commit sweeps peer agents' uncommitted work into stray commits; see `~/.claude/rules/learned.md`). If you must parallelize, use `isolation: worktree` and merge back explicitly.
- Commit after every task (feature branches, conventional messages, no attribution lines — disabled globally in Dom's settings).
- After Task 0, the canonical copy of this plan + `.tasks.json` lives in `agent-placemats/docs/plans/`; run later sessions from `~/projects/agent-placemats`.
- Dom's rules apply: no `--no-verify`, never amend, tests must actually run before claiming done, no `console.log` left in page JS.

---

## Prerequisites (Dom, or first executor session)

1. **Template source.** The template is Claude Code placemat **v1.2** (post-audit). If `feat/placemat-v1.2` has merged into `claude-code-placemat` main, copy template files from `~/projects/claude-code-placemat` (main checkout). If not yet merged, copy from the worktree `~/projects/claude-code-placemat/.worktrees/audit/` — same files, unmerged branch. Task 1 handles the copy; this is just the decision of which path to read from.
2. **GitHub auth** as `dommango-sys` with repo-create rights (`gh auth status`).
3. **Scheduled routines** (Task 17) are account-level; Dom may need to run that task himself in an interactive session.

---

## Design Decisions (locked; alternatives noted so a reviewer can veto)

| # | Decision | Why | Rejected alternative |
|---|----------|-----|----------------------|
| D1 | **One monorepo** `agent-placemats` for the 3 new placemats + hub; Claude Code placemat stays in its own repo, linked from the hub | Shared CSS/JS/scripts/tests evolve once, one Pages deploy, one CI; same-origin lets the hub read CC's `changes.json` with no backend | One repo per agent (3-4× duplication of template fixes); migrating CC in too (breaks existing URLs/inbound links) |
| D2 | **Uniform eight-card taxonomy** across agents, same ids as CC (`card-keys`, `card-slash-core`, `card-slash-tools`, `card-cli`, `card-settings`, `card-env`, `card-skills`, `card-hooks`); titles vary per agent | Muscle memory transfers for multi-agent users; the test suite stays generic | Per-agent bespoke card sets (untestable generically, disorienting) |
| D3 | **Hermes is scoped to its CLI/TUI coding surface only** (it's a general autonomous agent with 80+ commands, messaging, voice) | A placemat must fit a page; the audience here is CLI coding | Full-surface Hermes placemat (unbounded, unmaintainable) |
| D4 | **One scheduled routine per agent**, staggered (09:15 / 09:30 / 09:45 UTC; CC's existing routine keeps 09:00), each driven by in-repo `PIPELINE.md` + `sources.json` | Failure isolation (a broken Codex source can't block Kimi); small context per run; rules are versioned in the repo, not in the routine prompt | One sweep routine for all agents (one bad source stalls everything; giant context) |
| D5 | **Unofficial branding, no logos**: text wordmarks, per-page disclaimer, links to official docs; per-agent accent colors are evocative, not brand palettes | Avoid impersonating OpenAI/Moonshot/Nous; licenses: Codex repo Apache-2.0 (docs-site license unverified), Kimi MIT, Hermes MIT — condensed original wording + attribution is the safe pattern everywhere | Copying vendor branding/wordmarks (trademark risk, looks official) |
| D6 | **localStorage:** shared `placemat-theme` + `placemat-density` across the whole origin (including CC placemat — one theme choice everywhere); per-agent `pm-<agent>-seen-version` + `pm-<agent>-collapsed` | Same-origin sites share localStorage; theme sharing is a feature, seen-version collisions are a bug. CC already owns the unprefixed `placemat-seen-version` — never touch it from this repo | Unprefixed keys (CC's seen-state would be clobbered) |
| D7 | **The hub never writes seen-markers.** Only each placemat page updates its own `pm-<agent>-seen-version` | "3 new since your last visit" stays true until you actually visit that placemat | Hub marking everything seen (defeats the count) |
| D8 | **Strip the CC "command builder"** feature from the template | It builds `claude` CLI invocations — CC-specific; rebuilding per agent is future work, not launch scope | Porting it 3× now (YAGNI) |

**New repo file structure (target state):**

```
agent-placemats/
├── index.html                  — hub (agent cards, combined what's-new, Rosetta table)
├── shared/
│   ├── placemat.css            — generalized template stylesheet (accent slots)
│   └── placemat.js             — extracted page JS (search, theme, copy, notes, changes)
├── codex/
│   ├── index.html  changelog.html  changes.json  feed.xml
│   ├── sources.json  PIPELINE.md
│   └── versions/v1.0.html
├── kimi-code/                  — same shape as codex/
├── hermes/                     — same shape as codex/
├── scripts/build-changes.js    — generalized generator (per-agent arg)
├── tests/placemat.test.js      — generalized suite (per-agent arg / --all)
├── .github/workflows/ci.yml
├── docs/plans/                 — this plan + .tasks.json (copied in Task 0)
├── AGENTS.md  CLAUDE.md  README.md  LICENSE
```

---

## Per-agent fact sheets (verified 2026-09-12 — the content tasks consume these)

### Codex CLI (OpenAI)

- **Current stable:** `rust-v0.154.0` → display **v0.154.0** (2026-09-09). Repo `https://github.com/openai/codex`, Apache-2.0. ~1-2 stable releases/week with patch bursts; alpha prereleases several/day.
- **Version poll:** `https://api.github.com/repos/openai/codex/releases?per_page=30`, keep only `tag_name` starting `rust-v` AND `prerelease == false` AND `draft == false`; strip the `rust-v` prefix. Never use `/releases/latest` naively (python-v*, voice-* junk tags interleave). Cross-check: `https://registry.npmjs.org/@openai/codex` → `dist-tags.latest`.
- **Release notes:** curated sections (New Features / Bug Fixes / …, PR refs) **above** the `## Changelog` heading; everything below is auto-generated PR spam — never parse below it.
- **Docs:** `https://developers.openai.com/codex/*` 308-redirects to `https://learn.chatgpt.com/docs/*` — always follow redirects; expect further URL churn. Append `.md` to any docs URL for raw markdown. Docs index: `https://learn.chatgpt.com/docs/llms.txt`. **Pin `?surface=cli`** where offered — wrong surface silently serves desktop-app content.
- **Key pages:** consolidated CLI reference (commands + global flags + interactive shortcuts + 50-row slash table): `https://learn.chatgpt.com/docs/developer-commands?surface=cli` (917 lines of markdown; 27 subcommands, ~9 shortcut bindings). Config reference (~180 keys): `/docs/config-file/config-reference`; also `config-basic`, `config-advanced`, `environment-variables`, `cli-customization`, `hooks`, `build-skills`, `custom-prompts` (deprecated → skills), `plugins`, `extend/mcp`, `mcp-server`, `agent-configuration/agents-md`, `agent-configuration/subagents`, `auth`, `models`, `sandbox`-related pages.
- **`.md` export gaps:** the Global-flags table renders as a `<ConfigTable client:load/>` stub in markdown, and `/docs/changelog.md` 404s — fill flag gaps from `codex --help` (installable: `npm i -g @openai/codex`).
- **Freshness traps:** custom prompts (`~/.codex/prompts`) deprecated in favor of skills; `codex mcp-server` entry point removed in 0.154.0.
- **Config:** `~/.codex/config.toml` (TOML; `$CODEX_HOME`), project `.codex/config.toml`, managed `requirements.toml`.

### Kimi Code (Moonshot AI)

- **Current:** **0.42.0** (2026-09-09). Repo `https://github.com/MoonshotAI/kimi-code`, MIT. ~2 releases/week. **Binary is `kimi`, not `kimi-code`** — installed locally at `~/.kimi-code/bin/kimi` (v0.41.0), so `kimi --help` and subcommand `--help`s are available on this machine as primary sources.
- **Version poll (best):** curated docs changelog as raw markdown: `https://moonshotai.github.io/kimi-code/en/release-notes/changelog.md` — per-version blocks `## 0.42.0 (2026-09-09)` with Features/Polish/Bug Fixes. Cross-check: `https://api.github.com/repos/MoonshotAI/kimi-code/releases` (strip tag prefix `@moonshot-ai/kimi-code@`) and `https://registry.npmjs.org/@moonshot-ai/kimi-code`.
- **Docs:** `https://moonshotai.github.io/kimi-code/` — bilingual; **filter to `/en/` pages**. Any page raw: append `.md`. Index: `/llms.txt` (60 pages en+zh).
- **Key pages:** `/en/reference/kimi-command.md` (14 top-level flags, 12 subcommands: export, fork, provider, session, acp, web, server(deprecated), login, doctor, vis, migrate, upgrade), `/en/reference/slash-commands.md` (~45 commands + aliases, categorized), `/en/reference/keyboard.md` (dedicated shortcuts page, 7 sections), `/en/reference/tools.md`, `/en/configuration/{config-files,overrides,env-vars,data-locations,providers}.md`, `/en/customization/{mcp,skills,hooks,agents,plugins}.md`.
- **Config:** TOML — `~/.kimi-code/config.toml` + `tui.toml` (relocatable via `KIMI_CODE_HOME`), project `.kimi-code/local.toml`; validated by `kimi doctor`. AGENTS.md support: `./AGENTS.md`, `.kimi-code/AGENTS.md`, `~/.kimi-code/AGENTS.md`, cross-tool `~/.agents/AGENTS.md`.
- **Traps:** changelog mixes web-UI entries (`web:` prefix) — exclude for the CLI placemat; `KIMI_CODE_EXPERIMENTAL_*` env flags churn within ~2 releases; predecessor "kimi-cli" content online is stale.

### Hermes Agent (Nous Research)

- **Current:** app **v0.21.2**, tag **v2026.9.11** (2026-09-11). Repo `https://github.com/NousResearch/hermes-agent`, MIT. Releases every ~3-7 days.
- **Version poll:** `https://api.github.com/repos/NousResearch/hermes-agent/releases`. **Dual versioning:** date tag `vYYYY.M.D(.N)` + semver in the release title ("Hermes Agent v0.21.2 (v2026.9.11)") — parse both, display both. Tag date ≠ publish date sometimes. **Never poll PyPI** (`hermes-agent` lags badly).
- **Release notes are huge narrative essays** (hundreds of commits per release) — the pipeline must LLM-summarize and extract only items touching the scoped surface; there is no curated changelog file.
- **Docs:** `https://hermes-agent.nousresearch.com/docs/` (canonical; `hermes-agent.org` mirrors it). Indexes: `/llms.txt` (~17 KB curated) and `/docs/llms.txt` (per-page). Docs markdown in-repo under `website/docs/` via `raw.githubusercontent.com/NousResearch/hermes-agent/main/website/docs/<path>.md`. `llms-full.txt` is ~3.7 MB — never ingest whole.
- **Key pages:** `/docs/reference/cli-commands` (~80+ commands — apply scope cut below), `/docs/user-guide/cli` (global flags: `-V -p -r -c --in -w --yolo --ignore-user-config --ignore-rules --tui --cli --safe-mode`; `hermes chat` flags; `hermes -z` one-shot), `/docs/reference/slash-commands`, `/docs/reference/profile-commands`, `/docs/user-guide/configuration` (YAML `~/.hermes/config.yaml` + `.env` + `auth.json`), `/docs/reference/environment-variables`, `/docs/user-guide/features/mcp` + `/docs/reference/mcp-config-reference`, skills catalogs (`/docs/reference/skills-catalog`, `optional-skills-catalog` — agentskills.io standard, ~90 bundled + ~60 optional), `/docs/user-guide/features/context-files` (AGENTS.md, CLAUDE.md, .cursorrules, .hermes.md, SOUL.md, MEMORY.md, USER.md), `/docs/user-guide/tui`, `/docs/reference/cli-symbols`.
- **No dedicated keyboard-shortcuts reference exists** — build `card-keys` from the TUI guide + CLI symbols glossary; mark inferred rows `unverified`. No feature named "hooks" — `card-hooks` becomes **"Automation & MCP"** (cron, recurring loops, heartbeats, kanban lanes, blueprints, MCP).
- **SCOPE ALLOWLIST (D3)** — include only: core chat/TUI, coding workflow (worktrees `-w`, checkpoints/rollback, LSP, Codex delegation), sessions, config/env keys for CLI+models+MCP+skills+memory, `cron`, `project`, `doctor`, `update`, `logs`, `backup`, `skills`, `plugins`, `mcp`, `memory`, `tools`, `auth`, `profile`, `model`, `gateway`, `acp`, `setup`, `config`, `debug`, `security`. **Exclude:** messaging platforms (whatsapp, slack, send, peer, webhook…), voice, pets, dashboard, computer-use, curator, journey, proxy, egress.

---

## Task 0: Preflight & repo bootstrap

**Goal:** The `agent-placemats` GitHub repo exists, is cloned to `~/projects/agent-placemats`, has Pages + repo hygiene configured, and carries this plan.

**Files:**
- Create: `~/projects/agent-placemats/` (clone), `docs/plans/2026-09-12-agent-placemats.md` (+ `.tasks.json`) copied from `~/projects/claude-code-placemat/docs/superpowers/plans/`
- Create: `LICENSE` (MIT, `Copyright (c) 2026 Dom Mango` — copy from `~/projects/claude-code-placemat/LICENSE`), `.gitignore` (contents: `.worktrees/`)

**Acceptance Criteria:**
- [ ] `gh repo view dommango/agent-placemats` succeeds; repo is public with description "Unofficial single-page placemat references for CLI coding agents — Codex, Kimi Code, Hermes"
- [ ] `delete_branch_on_merge` is true (avoid CC repo's 109-stale-branch problem)
- [ ] Plan + tasks.json + LICENSE + .gitignore committed to main; project code registered

**Verify:** `gh api repos/dommango/agent-placemats --jq '.delete_branch_on_merge'` → `true`; `ls ~/projects/agent-placemats/docs/plans/` shows both files.

**Steps:**

- [ ] **Step 1:** `cd ~/projects && gh repo create agent-placemats --public --description "Unofficial single-page placemat references for CLI coding agents — Codex, Kimi Code, Hermes" --clone` (prefer `gh-axi repo create` if it supports create; plain `gh` otherwise)
- [ ] **Step 2:** `gh api -X PATCH repos/dommango/agent-placemats -f delete_branch_on_merge=true`
- [ ] **Step 3:** Copy LICENSE from the CC placemat repo; write `.gitignore`; `mkdir -p docs/plans` and copy this plan + `.tasks.json` in.
- [ ] **Step 4:** `~/.claude/scripts/project-code.sh set agent-placemats APM`
- [ ] **Step 5:** Commit on main (bootstrap only — later tasks use feature branches): `git add -A && git commit -m "chore: bootstrap agent-placemats repo with plan"` and `git push -u origin main`
- [ ] **Step 6:** Enable Pages from main root: `gh api -X POST repos/dommango/agent-placemats/pages -f "source[branch]=main" -f "source[path]=/"` (requires the push from Step 5 to exist; if it errors saying Pages already exists, that's fine)

---

## Task 1: Import the v1.2 template

**Goal:** Template files from the CC placemat v1.2 land in the new repo's layout, unmodified (parameterization is Task 2 — keep the import diff-clean).

**Files:**
- Create: `shared/placemat.css` (copy of template `placemat.css`), `codex/index.html` + `codex/changelog.html` (copies of template `index.html`/`changelog.html`), `scripts/build-changes.js`, `tests/placemat.test.js`, `.github/workflows/ci.yml` (copies — generalized in Tasks 3-5)

**Acceptance Criteria:**
- [ ] All files byte-identical to the template source (v1.2: main if `feat/placemat-v1.2` merged, else `~/projects/claude-code-placemat/.worktrees/audit/`)
- [ ] Committed on branch `feat/scaffold` as an import-only commit

**Verify:** `diff <template>/placemat.css shared/placemat.css` → empty for each copied file.

**Steps:**

- [ ] **Step 1:** `cd ~/projects/agent-placemats && git checkout -b feat/scaffold`
- [ ] **Step 2:** Set `SRC=~/projects/claude-code-placemat/.worktrees/audit` (or the main checkout if v1.2 merged — see Prerequisites). Then:
```bash
mkdir -p shared codex scripts tests .github/workflows
cp $SRC/placemat.css shared/placemat.css
cp $SRC/index.html codex/index.html
cp $SRC/changelog.html codex/changelog.html
cp $SRC/scripts/build-changes.js scripts/
cp $SRC/tests/placemat.test.js tests/
cp $SRC/.github/workflows/html-validate.yml .github/workflows/ci.yml
```
- [ ] **Step 3:** `git add -A && git commit -m "feat: import claude-code-placemat v1.2 template files"`

---

## Task 2: Parameterize the template

**Goal:** `codex/index.html` becomes an agent-neutral template instance: shared CSS/JS paths, per-agent accent slots, per-agent localStorage keys, disclaimer, no CC content assumptions in the chrome (the CC *table rows* stay for now — they're replaced in Task 7; this task only converts the shell).

**Files:**
- Modify: `shared/placemat.css`, `codex/index.html`, `codex/changelog.html`
- Create: `shared/placemat.js`

**Acceptance Criteria:**
- [ ] `shared/placemat.css` uses `--accent-1`/`--accent-2` (renamed from `--coral`/`--teal`); no other CSS changes
- [ ] `codex/index.html`: `<html lang="en" data-agent="codex">`; links `../shared/placemat.css`; a small `:root{--accent-1:#10a37f;--accent-2:#6e7681}` override style after the link; `<title>Codex CLI Placemat (Unofficial)</title>`; header release tag reads `As of release: v0.154.0`; header/footer carry the disclaimer (exact text in Step 6); the CC "command builder" block and its script section are removed (D8)
- [ ] The big page script is extracted to `shared/placemat.js` loaded with `<script src="../shared/placemat.js" defer></script>`; the blocking theme-init script stays inline and unmodified (FOUC guard)
- [ ] `shared/placemat.js` derives storage keys from `document.documentElement.dataset.agent`: seen `pm-<agent>-seen-version`, collapsed `pm-<agent>-collapsed`; theme/density keys stay literal `placemat-theme`/`placemat-density` (D6)
- [ ] `codex/changelog.html` links `../shared/placemat.css`, same accent override, agent-neutral heading, and its release sections are replaced by ONE placeholder section (real seed in Task 8) using the new heading shape: `<h3 id="rel-0-154-0">Codex CLI v0.154.0 <span class="version-date">2026-09-09</span></h3>`
- [ ] Page renders and functions in a real browser (search, theme toggle, group fold, notes buttons, copy-on-click)

**Verify:** `node --check shared/placemat.js` → ok; `python3 -m http.server 8000` then `chrome-devtools-axi open http://localhost:8000/codex/` — page renders, no console errors, search finds a known row, theme toggles. `grep -c 'coral' shared/placemat.css` → 0.

**Steps:**

- [ ] **Step 1:** Accent rename (names only, values unchanged for now):
```bash
sed -i 's/--coral/--accent-1/g; s/--teal/--accent-2/g' shared/placemat.css codex/index.html codex/changelog.html
```
- [ ] **Step 2:** In `codex/index.html`, update the stylesheet link to `../shared/placemat.css` and add immediately after it: `<style>:root{--accent-1:#10a37f;--accent-2:#6e7681}</style>` (evocative palette, not OpenAI brand — D5). Same in `codex/changelog.html`.
- [ ] **Step 3:** Extract JS. `codex/index.html` has exactly 2 `<script>` blocks (a test enforces this): the short blocking theme-init near the top **stays inline**. Cut the entire second (large) block's contents into `shared/placemat.js` and replace the block with `<script src="../shared/placemat.js" defer></script>`. At the top of `shared/placemat.js` insert:
```js
const AGENT = document.documentElement.dataset.agent || 'agent';
const LS_SEEN = 'pm-' + AGENT + '-seen-version';
const LS_COLLAPSED = 'pm-' + AGENT + '-collapsed';
```
then replace every literal `'placemat-seen-version'` with `LS_SEEN` and `'placemat-collapsed'` with `LS_COLLAPSED`. Leave `'placemat-theme'` and `'placemat-density'` literals untouched.
- [ ] **Step 4:** Point the page's `changes.json` fetch at `'changes.json'` (relative — already relative in the template; just confirm) so each agent dir reads its own.
- [ ] **Step 5:** Remove the command-builder `<details>`/card and any of its JS in `shared/placemat.js` (search `builder`); remove its nav chip if present.
- [ ] **Step 6:** Set `<html lang="en" data-agent="codex">`, `<title>`, `<h1>` ("Codex CLI Placemat"), `.release-tag` → `As of release: v0.154.0`, matching `.print-head` line, footer `Content synced: 2026-09-09`. Add disclaimer paragraph in the footer (and a short header variant): `Unofficial community reference — not affiliated with or endorsed by OpenAI. Condensed from the official docs; always confirm against <a href="https://developers.openai.com/codex">developers.openai.com/codex</a>.` Update `og:*`/`twitter:*`/canonical metas: title as above, url `https://dommango.github.io/agent-placemats/codex/`, image `https://dommango.github.io/agent-placemats/og-image.png` (file lands in Task 18).
- [ ] **Step 7:** In `codex/changelog.html`: agent-neutral title/h1 ("Codex CLI Placemat — Changelog"), delete all CC release sections and month groups, insert one open month group containing the placeholder `<h3 id="rel-0-154-0">…` section shown in the AC with an empty `<ul class="change-list"></ul>`.
- [ ] **Step 8:** Browser-verify per **Verify**, then `git add -A && git commit -m "feat: parameterize template (shared assets, accent slots, per-agent storage keys)"`

---

## Task 3: Generalize `scripts/build-changes.js`

**Goal:** The generator takes an agent directory argument and derives that agent's `changes.json` + `feed.xml`.

**Files:**
- Modify: `scripts/build-changes.js` (full replacement below)

**Acceptance Criteria:**
- [ ] `node scripts/build-changes.js codex` writes `codex/changes.json` + `codex/feed.xml`; `--check` mode exits 1 on staleness; `--all` iterates every agent
- [ ] Handles version labels `Codex CLI v0.154.0`, ranged `Codex CLI v0.153.0–v0.154.0` (takes the last version), and Hermes dual `Hermes Agent v0.21.2 (2026.9.11)` (takes the semver)

**Verify:** `node scripts/build-changes.js codex && node scripts/build-changes.js codex --check` → "up to date"; `node -e "const c=require('./codex/changes.json');if(c.latest!=='v0.154.0')process.exit(1)"` after Task 8's seed.

**Steps:**

- [ ] **Step 1:** Replace the file with:
```js
#!/usr/bin/env node
// Derive <agent>/changes.json and <agent>/feed.xml from <agent>/changelog.html. Zero dependencies.
// Usage: node scripts/build-changes.js <agent> [--check]   |   node scripts/build-changes.js --all [--check]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://dommango.github.io/agent-placemats/';
const AGENTS = { codex: 'Codex CLI', 'kimi-code': 'Kimi Code', hermes: 'Hermes Agent' };
const TAGS = { 'tag-add': 'ADD', 'tag-change': 'CHG', 'tag-remove': 'DEL', 'tag-fix': 'FIX' };

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function parseChangelog(html) {
  const releases = [];
  const sectionRe = /<h3 id="(rel-[\w.-]+)">([^<]+?) <span class="version-date">([^<]+)<\/span><\/h3>\s*<ul class="change-list">([\s\S]*?)<\/ul>/g;
  let section;
  while ((section = sectionRe.exec(html))) {
    const [, id, rawLabel, date, body] = section;
    const label = rawLabel.trim();
    const entries = [];
    const liRe = /<li><span class="tag (tag-\w+)">\w+<\/span>([\s\S]*?)<\/li>/g;
    let li;
    while ((li = liRe.exec(body))) {
      const inner = li[2].replace(/<span class="entry">([\s\S]*)<\/span>/, '$1').trim();
      const code = (inner.match(/<code>(.*?)<\/code>/) || [])[1];
      entries.push({ tag: TAGS[li[1]] || 'ADD', item: code ? decode(code) : null, html: inner });
    }
    const versions = label.match(/v\d[\w.]*/g);
    const version = versions ? versions[versions.length - 1] : label.split(/\s+/).pop();
    releases.push({ version, label, date: date.trim(), id, entries });
  }
  return releases;
}

const buildJson = (releases) =>
  JSON.stringify({ generated: releases[0].date, latest: releases[0].version, releases }, null, 1) + '\n';

function buildFeed(agent, name, releases) {
  const site = `${SITE}${agent}/`;
  const entries = releases.slice(0, 20).map((rel) => `  <entry>
    <title>${escapeXml(rel.label)} — ${rel.entries.length} placemat change${rel.entries.length === 1 ? '' : 's'}</title>
    <id>${site}changelog.html#${rel.id}</id>
    <link href="${site}changelog.html#${rel.id}"/>
    <updated>${rel.date}T09:00:00Z</updated>
    <content type="html">${escapeXml('<ul>' + rel.entries.map((e) => `<li><b>${e.tag}</b> ${e.html}</li>`).join('') + '</ul>')}</content>
  </entry>`).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(name)} Placemat — changes</title>
  <link href="${site}"/>
  <link rel="self" href="${site}feed.xml"/>
  <id>${site}</id>
  <updated>${releases[0].date}T09:00:00Z</updated>
${entries}
</feed>
`;
}

function run(agent, check) {
  const name = AGENTS[agent];
  const html = fs.readFileSync(path.join(ROOT, agent, 'changelog.html'), 'utf8');
  const releases = parseChangelog(html);
  if (!releases.length) {
    console.error(`${agent}: no release sections found — are the <h3 id="rel-…"> anchors present?`);
    process.exit(1);
  }
  const outputs = { 'changes.json': buildJson(releases), 'feed.xml': buildFeed(agent, name, releases) };
  let stale = false;
  for (const [file, content] of Object.entries(outputs)) {
    const target = path.join(ROOT, agent, file);
    if (check) {
      const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
      if (current !== content) {
        stale = true;
        console.error(`${agent}/${file} is stale — run: node scripts/build-changes.js ${agent}`);
      }
    } else {
      fs.writeFileSync(target, content);
      console.log(`wrote ${agent}/${file}`);
    }
  }
  if (!check) console.log(`${agent}: ${releases.length} releases, ${releases.reduce((a, r) => a + r.entries.length, 0)} entries, latest ${releases[0].version}`);
  return !stale;
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const target = args.find((a) => !a.startsWith('--'));
  const agents = args.includes('--all') ? Object.keys(AGENTS) : [target];
  if (!agents[0] || agents.some((a) => !AGENTS[a])) {
    console.error(`Usage: build-changes.js <${Object.keys(AGENTS).join('|')}> [--check] | --all [--check]`);
    process.exit(2);
  }
  const ok = agents.map((a) => run(a, check)).every(Boolean);
  if (check) {
    if (!ok) process.exit(1);
    console.log('changes.json and feed.xml are up to date');
  }
}

main();
```
- [ ] **Step 2:** Red check: `node scripts/build-changes.js codex` — expect it to run against Task 2's placeholder changelog (1 release, 0 entries) and write both files.
- [ ] **Step 3:** `git add -A && git commit -m "feat: generalize build-changes.js to per-agent dirs"`

---

## Task 4: Generalize the test suite

**Goal:** `tests/placemat.test.js` runs the full structural suite against any agent dir (`node tests/placemat.test.js codex`, or all agents with no arg), with CC-specific assertions removed or generalized.

**Files:**
- Modify: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] Paths are computed from an agent-dir argument; CSS path resolves to `shared/placemat.css`; no-arg mode loops `['codex','kimi-code','hermes']`, skipping dirs that don't exist yet (warn, don't fail) so the suite works mid-build
- [ ] **Adapted for the extracted JS:** the "exactly 2 bare script blocks" test becomes: exactly 1 inline script (theme-init) + exactly 1 `src="../shared/placemat.js"` script; inline-script validity checks parse the inline block AND `shared/placemat.js` (via `node --check` semantics: `new Function(src)`)
- [ ] **Dropped (CC-specific):** "Config card is split into Settings (JSON) and Environment Variables" (keep card ids instead), "command builder single-quote escaping", "command builder effort options do not name models"
- [ ] **Generalized:** card-id test asserts the eight canonical ids (D2) exist in order; changelog heading test expects `id="rel-…"`; release-tag/footer-date tests read the agent's own changelog; theme-init parity test compares the agent's two HTML files
- [ ] All remaining tests pass against `codex/` in its Task-2 state (placeholder changelog, CC rows still present is fine — rows are structurally valid)

**Verify:** `node tests/placemat.test.js codex` → all tests pass, names printed; `node tests/placemat.test.js` → runs codex, warns kimi-code/hermes missing.

**Steps:**

- [ ] **Step 1:** At the top of the file replace the hardcoded root/file constants with:
```js
const AGENTS = ['codex', 'kimi-code', 'hermes'];
const arg = process.argv[2];
const targets = arg ? [arg] : AGENTS.filter((a) => fs.existsSync(path.join(ROOT, a, 'index.html')) ||
  (console.warn(`skip ${a}: not built yet`), false));
```
and wrap the existing test definitions in `for (const agent of targets) { … }` with `INDEX = path.join(ROOT, agent, 'index.html')`, `CHANGELOG = path.join(ROOT, agent, 'changelog.html')`, `CSS = path.join(ROOT, 'shared', 'placemat.css')`, `CHANGES = path.join(ROOT, agent, 'changes.json')`, `FEED = path.join(ROOT, agent, 'feed.xml')`. Prefix each test name with `${agent}: `.
- [ ] **Step 2:** Apply the AC's drop/adapt/generalize list test by test. Keep everything else byte-compatible (tables/thead, details groups, nav chips, unique `i-` ids + permalinks, search normalizer, 160-char description cap, notes-btn pairing, version-compare, print-head parity, changes.json freshness vs changelog, Atom feed shape, release-tag-within-3-versions, footer sync date, og/canonical presence).
- [ ] **Step 3:** Run `node tests/placemat.test.js codex`; fix failures until green. Expected initial failures: script-block count (fixed by the new assertion), `cc-` heading ids (now `rel-`), builder tests (deleted).
- [ ] **Step 4:** `git add -A && git commit -m "test: generalize placemat suite to per-agent dirs"`

---

## Task 5: CI workflow

**Goal:** One workflow validates HTML/CSS and runs the suite + staleness check for every agent on PRs and main pushes.

**Files:**
- Modify: `.github/workflows/ci.yml` (full replacement below)

**Acceptance Criteria:**
- [ ] Workflow passes on the `feat/scaffold` branch PR
- [ ] `versions/` dirs excluded from validation; generated files' staleness enforced

**Verify:** open PR for `feat/scaffold` → both jobs green in `gh pr checks`.

**Steps:**

- [ ] **Step 1:** Replace `.github/workflows/ci.yml` with:
```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    name: html5validator
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate HTML
        uses: Cyb3r-Jak3/html5validator-action@v7.2.0
        with:
          root: .
          blacklist: versions
          format: text
          css: true

  test:
    name: placemat tests (zero deps)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Structural tests (all agents)
        run: node tests/placemat.test.js
      - name: Generated files are fresh
        run: node scripts/build-changes.js --all --check
```
- [ ] **Step 2:** Commit: `git add -A && git commit -m "ci: multi-agent validation workflow"`. Push branch, open PR (`gh pr create --fill`), confirm green, **squash-merge** to main. (Dom's `require-tests-for-pr` hook needs test files present — they are, from Task 4.)

---

## Task 6: Repo docs (AGENTS.md / CLAUDE.md / README)

**Goal:** The new repo carries agent guidance so every future session (including the daily sync routines) knows the rules without this plan.

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md` (single line: `@AGENTS.md`), `README.md`

**Acceptance Criteria:**
- [ ] AGENTS.md covers: structure, the eight canonical card ids, content rules (inherited from CC placemat: verified-only, `unverified` class, no `...` truncation, ≤90-char summaries / two-tier notes, `i-` row ids as permalinks, no `class="new"` in HTML), localStorage key scheme (D6), per-agent "As of release" + `.print-head` + footer-sync parity, `build-changes.js <agent>` + `tests` commands, pipeline overview pointing at per-agent `PIPELINE.md`, branch/commit conventions
- [ ] README: what the site is, live URL, the four placemats (incl. CC's external one), unofficial disclaimer, local preview instructions

**Verify:** `node tests/placemat.test.js codex` still green; files render sensibly (`head -40 AGENTS.md`).

**Steps:**

- [ ] **Step 1:** Write `AGENTS.md` with this outline (adapt the CC placemat's AGENTS.md — copy its Content Rules nearly verbatim, they are battle-tested; replace CC-specific bits):

```markdown
# AGENTS.md — agent-placemats

Unofficial single-page placemat references for CLI coding agents, one per
directory: codex/ (OpenAI Codex CLI), kimi-code/ (Moonshot Kimi Code),
hermes/ (Nous Research Hermes Agent). Hub page at the repo root links them
plus the external Claude Code placemat (its own repo).

Live: https://dommango.github.io/agent-placemats/ — Pages deploys from main.

## Structure
[file tree — copy from repo state]

## Canonical cards (identical ids in every agent's index.html, in this order)
card-keys, card-slash-core, card-slash-tools, card-cli, card-settings,
card-env, card-skills, card-hooks — titles may vary per agent (e.g. hermes's
card-hooks is "Automation & MCP"). Never invent new card ids.

## Commands
node scripts/build-changes.js <agent>   # regenerate changes.json + feed.xml
node scripts/build-changes.js --all --check
node tests/placemat.test.js [<agent>]   # structural suite
python3 -m http.server 8000             # local preview

## Content rules
[copy the CC placemat AGENTS.md "Content Rules" + row/notes/changelog format
sections, with: cc-vNNN heading ids → rel-<version> ids; per-agent "official
docs" links; localStorage: shared placemat-theme/placemat-density, per-agent
pm-<agent>-seen-version / pm-<agent>-collapsed; never write class="new"]

## Update pipeline
One scheduled routine per agent (09:15/09:30/09:45 UTC). Each run follows
<agent>/PIPELINE.md + <agent>/sources.json. Branch claude/<agent>-update-vX,
commit "feat(<agent>): update placemat for <Name> vX", PR to main, human merges.

## Do not
- Touch another agent's directory in a sync PR
- Edit versions/ snapshots, ever
- Use vendor logos or imply endorsement (text wordmarks + disclaimer only)
- Poll PyPI for hermes, /releases/latest for codex, or /zh/ docs for kimi
```
- [ ] **Step 2:** `CLAUDE.md` containing exactly `@AGENTS.md`. README per AC.
- [ ] **Step 3:** Branch `feat/repo-docs`, commit `docs: add AGENTS.md, CLAUDE.md, README`, PR, merge.

---

## Task 7: Codex placemat content

**Goal:** `codex/index.html` carries real Codex CLI v0.154.0 content in all eight cards, replacing every CC row.

**Files:**
- Modify: `codex/index.html`

**Acceptance Criteria:**
- [ ] All eight cards populated from the fact sheet's sources; **every CC row is gone** (`grep -ci 'claude' codex/index.html` returns only hits inside the footer credit linking the CC placemat, if any)
- [ ] Card map: `card-keys` "Keyboard & TUI" (interactive shortcuts ~9 + `/keymap`, `tui.keymap.*`, Ctrl+G external editor, themes, completions — from `developer-commands` + `cli-customization`; ~12-18 rows). `card-slash-core` / `card-slash-tools` from the 50-row slash table — core session/workflow commands vs extensibility (`/mcp /plugins /hooks /skills /memories /import /experimental /agent /apps /worktree /archive /delete`…); ~25 rows each. `card-cli` global flags + all 27 subcommands (~35 rows; grouped `<details>` e.g. Sessions / Cloud / MCP & plugins / Diagnostics). `card-settings` curated ~40 of ~180 config keys in groups (Core: `model`, `approval_policy`, `sandbox_mode`, `profiles`; MCP: `mcp_servers.*`; Providers: `model_providers.*`; TUI; Hooks: `hooks.*`; Features: `features.*`; Managed: `requirements.toml` note) — deep detail goes in notes, not more rows. `card-env` (~10 rows incl. `CODEX_HOME`). `card-skills` "Skills, Plugins & AGENTS.md" (skills, deprecated custom-prompts note, plugins + marketplaces, AGENTS.md global/override/walk merge order, subagents; ~15 rows). `card-hooks` "Hooks, MCP & Sandbox" (hooks.json + lifecycle events + `/hooks`, `codex mcp` client, Codex-as-MCP-server incl. 0.154.0 removal of `codex mcp-server` entry point, sandbox modes + `codex sandbox` + execpolicy; ~15 rows)
- [ ] Total rows 150-220; every row verified against the cited page (or `codex --help` output — `npm i -g @openai/codex` if needed); anything only inferable marked `class="unverified"`
- [ ] Row format per AGENTS.md: `i-` ids, row-links, ≤90-char summaries or two-tier notes, no `...`

**Verify:** `node tests/placemat.test.js codex` green; browser check (`chrome-devtools-axi open http://localhost:8000/codex/`): search for `approval_policy`, `/permissions`, `codex exec` each finds a row; all nav chips scroll.

**Steps:**

- [ ] **Step 1:** Branch `feat/codex-content`. Fetch each source page as raw markdown (fact sheet URLs; remember `?surface=cli` and follow redirects). For the global-flags `.md` gap, install the CLI and capture `codex --help` + each subcommand's `--help`.
- [ ] **Step 2:** Populate cards one at a time in the AC's order; run `node tests/placemat.test.js codex` after each card to catch format drift early.
- [ ] **Step 3:** Update the "What's new" legend copy if it names Claude Code; keep wording agent-neutral.
- [ ] **Step 4:** Commit per card or at minimum `feat(codex): populate placemat content for v0.154.0`.

---

## Task 8: Codex changelog seed, generated files, snapshot

**Goal:** Codex placemat is a complete, deployable unit.

**Files:**
- Modify: `codex/changelog.html`; Create: `codex/changes.json`, `codex/feed.xml`, `codex/versions/v1.0.html`

**Acceptance Criteria:**
- [ ] `changelog.html` has a real seed section: `<h3 id="rel-0-154-0">Codex CLI v0.154.0 <span class="version-date">2026-09-09</span></h3>` with one ADD entry per card summarizing the initial coverage (8 entries, e.g. `<code>card-cli</code> — initial reference: 27 subcommands + global flags`), inside the current month group, plus a Template/Structure block noting "v1.0 — template derived from claude-code-placemat v1.2"
- [ ] Generated files fresh; `versions/v1.0.html` is a self-contained snapshot (inline the shared CSS + JS into the copy — versions must not depend on `shared/` moving)
- [ ] PR merged to main; Pages serves `https://dommango.github.io/agent-placemats/codex/`

**Verify:** `node scripts/build-changes.js codex --check` + `node tests/placemat.test.js codex` green; after merge `curl -s https://dommango.github.io/agent-placemats/codex/ | grep -c 'Codex CLI Placemat'` ≥ 1.

**Steps:**

- [ ] **Step 1:** Write the seed changelog section; run `node scripts/build-changes.js codex`.
- [ ] **Step 2:** Build the snapshot: copy `codex/index.html` to `codex/versions/v1.0.html`, replace the stylesheet link with an inline `<style>` containing `shared/placemat.css` + the accent override, and the `src=` script with the inline contents of `shared/placemat.js`.
- [ ] **Step 3:** Tests green → PR `feat(codex): seed changelog + v1.0 snapshot`, merge, verify live URL.

---

## Task 9: Kimi Code placemat content

**Goal:** `kimi-code/index.html` carries real Kimi Code 0.42.0 content.

**Files:**
- Create: `kimi-code/index.html`, `kimi-code/changelog.html` (start from the **codex/** files: copy, then swap identity + rows)

**Acceptance Criteria:**
- [ ] `data-agent="kimi-code"`, title "Kimi Code Placemat (Unofficial)", accents `:root{--accent-1:#4c6ef5;--accent-2:#845ef7}`, disclaimer names Moonshot AI and links `https://moonshotai.github.io/kimi-code/`, release tag `As of release: v0.42.0`, footer sync `2026-09-09`
- [ ] Card map: `card-keys` from `/en/reference/keyboard.md` (7 sections → grouped rows; ~20 rows). `card-slash-core` (~25: `/login /logout /model /secondary-model /settings /permission /theme /new /sessions /fork /compact /undo /reload /export-md /add-dir /usage /status /version /help /btw /exit`…) and `card-slash-tools` (~20: `/mcp /plugins /web /swarm /goal` family `/yolo /auto /plan` + built-in skill commands `/mcp-config /custom-theme /update-config /check-kimi-code-docs /import-from-cc-codex /sub-skill`). `card-cli` 14 top-level flags + 12 subcommands, `kimi web`'s flags condensed into notes (~30 rows) — cross-check against local `kimi --help` (binary `~/.kimi-code/bin/kimi`, note local is 0.41.0 vs content target 0.42.0: diff against the 0.42.0 changelog for anything renamed). `card-settings` config.toml/tui.toml/local.toml sections (`default_model`, `[loop_control]`, `[background]`, `[[hooks]]`, `[thinking]`, `[services.*]`, `[providers.*]`, `[models.*]`; `kimi doctor` validation; ~25 rows). `card-env` from env-vars page incl. `KIMI_CODE_HOME`; experimental `KIMI_CODE_EXPERIMENTAL_*` flags get a churn-warning note. `card-skills` skills + `--skills-dir`, agents (`.kimi-code/agents/`, `.agents/agents/`, `override: true` replaces the whole system prompt — security note), plugins, AGENTS.md's four locations, `/init`. `card-hooks` "Hooks & MCP" (`[[hooks]]`, MCP, datasource, `kimi acp`, server API pointer)
- [ ] Total 150-190 rows, all verified (docs `/en/` pages or local `--help`); web-UI-only items excluded
- [ ] Changelog seeded like Task 8 (`<h3 id="rel-0-42-0">Kimi Code v0.42.0 …`), generated files fresh, snapshot `kimi-code/versions/v1.0.html`

**Verify:** `node tests/placemat.test.js kimi-code` green; `node scripts/build-changes.js kimi-code --check` green; browser: search `--yolo`, `/swarm`, `config.toml` all hit.

**Steps:**

- [ ] **Step 1:** Branch `feat/kimi-content`; `cp codex/index.html kimi-code/index.html; cp codex/changelog.html kimi-code/changelog.html`; swap identity per AC before touching rows.
- [ ] **Step 2:** Capture local ground truth: `~/.kimi-code/bin/kimi --help` and each subcommand `--help`; fetch the `/en/` docs pages from the fact sheet.
- [ ] **Step 3:** Replace rows card by card, testing after each; seed changelog; `node scripts/build-changes.js kimi-code`; build snapshot (same inlining procedure as Task 8 Step 2).
- [ ] **Step 4:** PR `feat(kimi-code): initial Kimi Code placemat (0.42.0)`, merge, verify live URL.

---

## Task 10: Hermes Agent placemat content

**Goal:** `hermes/index.html` carries scoped Hermes Agent content (v0.21.2 / tag v2026.9.11).

**Files:**
- Create: `hermes/index.html`, `hermes/changelog.html`, `hermes/changes.json`, `hermes/feed.xml`, `hermes/versions/v1.0.html`

**Acceptance Criteria:**
- [ ] `data-agent="hermes"`, title "Hermes Agent Placemat (Unofficial)", accents `:root{--accent-1:#b8860b;--accent-2:#8b7355}`, disclaimer names Nous Research and links `https://hermes-agent.nousresearch.com/docs/`, release tag `As of release: v0.21.2 (2026.9.11)`, footer sync `2026-09-11`
- [ ] **Scope allowlist from the fact sheet is enforced** — a "Scope" note near the legend states the placemat covers the CLI/TUI coding surface only and links full docs for messaging/voice/etc.
- [ ] Card map: `card-keys` "TUI & Symbols" from `/docs/user-guide/tui` + `/docs/reference/cli-symbols` (transcript markers, status badges, approval prompts; inferred keybindings marked `unverified`; ~12-15 rows). `card-slash-core` interactive slash commands from `/docs/reference/slash-commands` (`/model /moa /rollback /skill /skills /bundles /kanban /stop /btw` + the rest of the reference page's interactive-CLI set). `card-slash-tools` profile commands + automation-relevant slash. `card-cli` global flags + `hermes chat` flags + `hermes -z` + allowlisted subcommands only (~35 rows, grouped Sessions & Coding / Config & Auth / Extensibility / Automation / Diagnostics). `card-settings` config.yaml sections (terminal backends local/docker/ssh/modal/daytona/vercel_sandbox/singularity, model, compression, database, skills, memory, agent, auxiliary, context, updates; `${VAR}` interpolation; `hermes config set`). `card-env` coding-relevant vars from `/docs/reference/environment-variables` + `~/.hermes/.env`. `card-skills` skills standard (agentskills.io; ~90 bundled + ~60 optional catalogs), plugins, context files (AGENTS.md CLAUDE.md .cursorrules .hermes.md SOUL.md MEMORY.md USER.md), subagents + Codex delegation. `card-hooks` titled **"Automation & MCP"**: cron, recurring loops, heartbeats, kanban worker lanes, automation blueprints, MCP config, model fallback chains + credential pools, Nous Portal
- [ ] Total 120-170 rows; excluded-surface commands appear nowhere
- [ ] Changelog seeded (`<h3 id="rel-0-21-2">Hermes Agent v0.21.2 (2026.9.11) …`), generated files fresh, snapshot built

**Verify:** `node tests/placemat.test.js hermes` + `node scripts/build-changes.js hermes --check` green; `grep -c 'whatsapp\|voice-call\|pets' hermes/index.html` → 0; browser search `--yolo`, `config.yaml`, `/rollback` all hit.

**Steps:**

- [ ] **Step 1:** Branch `feat/hermes-content`; copy from `codex/` as in Task 9 Step 1; swap identity.
- [ ] **Step 2:** Fetch `/docs/llms.txt` for current page paths, then the fact-sheet pages (raw markdown via the repo `website/docs/` mirror when the site export misbehaves).
- [ ] **Step 3:** Populate per AC with the allowlist beside you; test per card; seed changelog; generate; snapshot.
- [ ] **Step 4:** PR `feat(hermes): initial Hermes Agent placemat (v0.21.2)`, merge, verify live URL.

---

## Task 11: Hub page

**Goal:** Root `index.html` gives a multi-agent user one landing page: four placemat cards with live "N changes since your last visit" and links.

**Files:**
- Create: `index.html` (repo root)

**Acceptance Criteria:**
- [ ] Uses `shared/placemat.css` + the inline theme-init (same FOUC guard as the placemats); neutral accents (defaults, no override)
- [ ] Four cards: Claude Code (external, `https://dommango.github.io/claude-code-placemat/`), Codex CLI, Kimi Code, Hermes Agent — each with: name, "As of <version> · <date>" (live from its `changes.json`), "N changes since your last visit" badge (localStorage rules D6/D7 — read-only!), links to placemat / changelog / Atom feed / official docs, and the install one-liner as click-to-copy `<code>`
- [ ] Unofficial disclaimer covering all vendors; link to the GitHub repo
- [ ] Graceful degradation: if a `changes.json` fetch fails (e.g. local preview can't reach the CC origin), the card renders with "—" placeholders, no console errors

**Verify:** `chrome-devtools-axi open http://localhost:8000/` — three local cards show live versions, CC card degrades to "—" locally; deployed hub shows all four live. `node tests/placemat.test.js` still green (hub is not an agent page; suite ignores it).

**Steps:**

- [ ] **Step 1:** Branch `feat/hub`. Build the page: header (site title "Agent Placemats", theme toggle reusing the shared control markup), card grid, footer. Card data + fetch logic:
```html
<script>
const PLACEMATS = [
  { key: 'claude-code', name: 'Claude Code', vendor: 'Anthropic',
    url: 'https://dommango.github.io/claude-code-placemat/',
    changes: 'https://dommango.github.io/claude-code-placemat/changes.json',
    seenKey: 'placemat-seen-version', docs: 'https://code.claude.com/docs',
    install: 'npm install -g @anthropic-ai/claude-code' },
  { key: 'codex', name: 'Codex CLI', vendor: 'OpenAI',
    url: 'codex/', changes: 'codex/changes.json',
    seenKey: 'pm-codex-seen-version', docs: 'https://developers.openai.com/codex',
    install: 'npm install -g @openai/codex' },
  { key: 'kimi-code', name: 'Kimi Code', vendor: 'Moonshot AI',
    url: 'kimi-code/', changes: 'kimi-code/changes.json',
    seenKey: 'pm-kimi-code-seen-version', docs: 'https://moonshotai.github.io/kimi-code/',
    install: 'curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash' },
  { key: 'hermes', name: 'Hermes Agent', vendor: 'Nous Research',
    url: 'hermes/', changes: 'hermes/changes.json',
    seenKey: 'pm-hermes-seen-version', docs: 'https://hermes-agent.nousresearch.com/docs/',
    install: 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash' },
];
const cmp = (a, b) => {   // numeric-aware version compare, mirrors shared/placemat.js
  const na = String(a).replace(/^v/, '').split('.').map(Number);
  const nb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    const d = (na[i] || 0) - (nb[i] || 0);
    if (d) return d;
  }
  return 0;
};
async function hydrate(p) {
  const card = document.getElementById('pm-' + p.key);
  try {
    const data = await (await fetch(p.changes, { cache: 'no-store' })).json();
    card.querySelector('.pm-version').textContent = 'As of ' + data.latest + ' · ' + data.generated;
    let seen = null;
    try { seen = localStorage.getItem(p.seenKey); } catch {}
    if (seen) {
      const fresh = data.releases.filter((r) => cmp(r.version, seen) > 0)
        .reduce((n, r) => n + r.entries.length, 0);
      if (fresh > 0) card.querySelector('.pm-fresh').textContent = fresh + ' new since your last visit';
    }
  } catch { /* offline or cross-origin in local preview — leave the em-dash placeholders */ }
}
PLACEMATS.forEach(hydrate);   // NEVER write seenKey here (D7)
</script>
```
Card markup skeleton (one per placemat, `id="pm-<key>"`; elements `.pm-version` and `.pm-fresh` default to `—`/empty). Reuse the placemat card/table styling classes from `shared/placemat.css` so the hub inherits the design system.
- [ ] **Step 2:** `<title>Agent Placemats</title>`, metas (canonical `https://dommango.github.io/agent-placemats/`, og-image as in Task 2), disclaimer footer.
- [ ] **Step 3:** html5validator locally if available (`pip install html5validator` optional — CI covers it), browser-verify, commit `feat: hub page with cross-placemat what's-new`, PR, merge.

---

## Task 12: Rosetta card (cross-agent command equivalents)

**Goal:** The hub gains the multi-agent killer feature: one table mapping everyday concepts across all four agents.

**Files:**
- Modify: `index.html` (hub)

**Acceptance Criteria:**
- [ ] A `<details class="search-group" open>` table titled "Rosetta — the same job in each agent", columns Concept / Claude Code / Codex CLI / Kimi Code / Hermes Agent, seeded with the rows below; cells I couldn't verify carry `class="unverified"` on the `<code>`; absent features show —
- [ ] Every cell ≤ 1 short `<code>` (+ optional 3-4-word note)

**Verify:** browser render — table readable at 400px width (horizontal scroll container per house style); no cell truncated with `...`.

**Steps:**

- [ ] **Step 1:** Add the table with these rows (verified 2026-09-12 except where flagged):

| Concept | Claude Code | Codex CLI | Kimi Code | Hermes Agent |
|---|---|---|---|---|
| Launch TUI | `claude` | `codex` | `kimi` | `hermes` |
| Context file | `CLAUDE.md` / `AGENTS.md` | `AGENTS.md` (global + walk) | `AGENTS.md` (4 locations) | `AGENTS.md`+`CLAUDE.md`+`.cursorrules`+`.hermes.md` |
| Generate context file | `/init` | `/init` | `/init` | *(unverified)* |
| Continue last session | `claude --continue` | `codex resume` | `kimi -c` | `hermes -c` |
| One-shot / non-interactive | `claude -p` | `codex exec` | `kimi -p` | `hermes -z` |
| Full-auto mode | `--dangerously-skip-permissions` | `approval_policy` + `sandbox_mode` config | `--yolo` / `/yolo` | `--yolo` |
| Config file | `~/.claude/settings.json` | `~/.codex/config.toml` | `~/.kimi-code/config.toml` | `~/.hermes/config.yaml` |
| MCP servers | `claude mcp` / `.mcp.json` | `codex mcp` | `/mcp` + config | `hermes mcp` |
| Skills | `/skills`, `~/.claude/skills/` | `/skills` (prompts deprecated) | `--skills-dir` + skills docs | `hermes skills` (agentskills.io) |
| Hooks | `settings.json` hooks | `hooks.json` / `[hooks]` | `[[hooks]]` in config.toml | — |
| Subagents | `.claude/agents/` | subagents docs | `.kimi-code/agents/` | subagents + Codex delegation |
| Compact context | `/compact` | `/compact` | `/compact` | *(unverified)* |
| Plan mode | plan mode (Shift+Tab) | *(unverified)* | `--plan` / `/plan` | *(unverified)* |
| Switch model | `/model` | `/model` | `/model`, `/secondary-model` | `/model`, `/moa` |
| Migrate from another agent | — | `/import` (Claude Code, Cursor) | `/import-from-cc-codex` | — |
| Health check | `/doctor` | `codex doctor` | `kimi doctor` | `hermes doctor` |
| Update the CLI | native installer | `codex update` | `kimi upgrade` | `hermes update` |

- [ ] **Step 2:** Resolve the four *(unverified)* cells against current docs before publishing; keep `unverified` class on any still-unconfirmed cell. Commit `feat: Rosetta cross-agent table`, PR, merge.

---

## Task 13: Pipeline manifests (`sources.json` + `PIPELINE.md` × 3)

**Goal:** Each agent dir carries the machine-readable source manifest and the prose rules its daily routine follows — the routine prompt itself stays tiny.

**Files:**
- Create: `codex/sources.json`, `codex/PIPELINE.md`, `kimi-code/sources.json`, `kimi-code/PIPELINE.md`, `hermes/sources.json`, `hermes/PIPELINE.md`

**Acceptance Criteria:**
- [ ] Each `sources.json` parses (`node -e "require('./codex/sources.json')"`) and carries: `name`, `vendor`, `version_poll` (url + filter + transform), `cross_check` url, `release_notes` rules, `docs` url map (the fact-sheet pages), `gotchas` array
- [ ] Each `PIPELINE.md` states the full run procedure (steps below) plus the agent's traps from the fact sheet

**Verify:** JSON parse per file; `PIPELINE.md`s each mention their agent's specific traps (codex: `rust-v` filter + `## Changelog` cutoff; kimi: `/en/` + tag-prefix strip + `web:` exclusion; hermes: dual version + narrative summarization + PyPI ban + scope allowlist).

**Steps:**

- [ ] **Step 1:** Write `codex/sources.json`:
```json
{
  "name": "Codex CLI",
  "vendor": "OpenAI",
  "version_poll": {
    "url": "https://api.github.com/repos/openai/codex/releases?per_page=30",
    "filter": "tag_name starts with 'rust-v' AND prerelease == false AND draft == false",
    "transform": "version = tag_name without 'rust-v' prefix"
  },
  "cross_check": "https://registry.npmjs.org/@openai/codex (dist-tags.latest)",
  "release_notes": "Use the release body ABOVE the '## Changelog' heading only; below it is auto-generated PR spam.",
  "docs": {
    "index": "https://learn.chatgpt.com/docs/llms.txt",
    "cli_reference": "https://learn.chatgpt.com/docs/developer-commands?surface=cli",
    "config_reference": "https://learn.chatgpt.com/docs/config-file/config-reference",
    "env": "https://learn.chatgpt.com/docs/config-file/environment-variables",
    "hooks": "https://learn.chatgpt.com/docs/hooks",
    "skills": "https://learn.chatgpt.com/docs/build-skills",
    "plugins": "https://learn.chatgpt.com/docs/plugins",
    "mcp": "https://learn.chatgpt.com/docs/extend/mcp",
    "agents_md": "https://learn.chatgpt.com/docs/agent-configuration/agents-md",
    "changelog_page": "https://learn.chatgpt.com/docs/changelog"
  },
  "gotchas": [
    "developers.openai.com/codex/* 308-redirects to learn.chatgpt.com — follow redirects, expect URL churn",
    "Append .md for raw markdown; the global-flags table is a client-rendered stub in .md — use `codex --help` instead",
    "Pin ?surface=cli — wrong surface silently serves desktop-app content",
    "Patch bursts: batch multiple stable releases into one ranged changelog heading"
  ]
}
```
- [ ] **Step 2:** Write `kimi-code/sources.json`:
```json
{
  "name": "Kimi Code",
  "vendor": "Moonshot AI",
  "version_poll": {
    "url": "https://moonshotai.github.io/kimi-code/en/release-notes/changelog.md",
    "filter": "top '## X.Y.Z (YYYY-MM-DD)' heading",
    "transform": "version = heading version; sections Features/Polish/Bug Fixes are the release notes"
  },
  "cross_check": "https://api.github.com/repos/MoonshotAI/kimi-code/releases (strip tag prefix '@moonshot-ai/kimi-code@'); https://registry.npmjs.org/@moonshot-ai/kimi-code",
  "release_notes": "Use the curated docs changelog blocks; EXCLUDE entries prefixed 'web:' (web UI, not the CLI). Deep technical detail: https://raw.githubusercontent.com/MoonshotAI/kimi-code/main/apps/kimi-code/CHANGELOG.md",
  "docs": {
    "index": "https://moonshotai.github.io/kimi-code/llms.txt",
    "cli_reference": "https://moonshotai.github.io/kimi-code/en/reference/kimi-command.md",
    "slash_commands": "https://moonshotai.github.io/kimi-code/en/reference/slash-commands.md",
    "keyboard": "https://moonshotai.github.io/kimi-code/en/reference/keyboard.md",
    "tools": "https://moonshotai.github.io/kimi-code/en/reference/tools.md",
    "config": "https://moonshotai.github.io/kimi-code/en/configuration/config-files.md",
    "env": "https://moonshotai.github.io/kimi-code/en/configuration/env-vars.md",
    "providers": "https://moonshotai.github.io/kimi-code/en/configuration/providers.md",
    "mcp": "https://moonshotai.github.io/kimi-code/en/customization/mcp.md",
    "skills": "https://moonshotai.github.io/kimi-code/en/customization/skills.md",
    "hooks": "https://moonshotai.github.io/kimi-code/en/customization/hooks.md",
    "agents": "https://moonshotai.github.io/kimi-code/en/customization/agents.md",
    "plugins": "https://moonshotai.github.io/kimi-code/en/customization/plugins.md"
  },
  "gotchas": [
    "Docs are bilingual — only use /en/ pages; llms.txt interleaves /zh/ entries",
    "Binary is `kimi`, package/repo are kimi-code; ignore stale 'kimi-cli' content elsewhere",
    "KIMI_CODE_EXPERIMENTAL_* env flags churn within ~2 releases — expect DEL entries",
    "Any docs page is fetchable as raw markdown by appending .md"
  ]
}
```
- [ ] **Step 3:** Write `hermes/sources.json`:
```json
{
  "name": "Hermes Agent",
  "vendor": "Nous Research",
  "version_poll": {
    "url": "https://api.github.com/repos/NousResearch/hermes-agent/releases",
    "filter": "newest non-draft, non-prerelease release",
    "transform": "date tag vYYYY.M.D(.N) from tag_name; semver app version from the release title, e.g. 'Hermes Agent v0.21.2 (v2026.9.11)'; display 'vX.Y.Z (YYYY.M.D)'"
  },
  "cross_check": "release title vs tag; NEVER use PyPI hermes-agent (lags badly)",
  "release_notes": "Narrative essays covering hundreds of commits — summarize, extracting ONLY items touching the scope_allowlist surface; ignore everything else.",
  "docs": {
    "index": "https://hermes-agent.nousresearch.com/docs/llms.txt",
    "cli_commands": "https://hermes-agent.nousresearch.com/docs/reference/cli-commands",
    "cli_guide": "https://hermes-agent.nousresearch.com/docs/user-guide/cli",
    "slash_commands": "https://hermes-agent.nousresearch.com/docs/reference/slash-commands",
    "profile_commands": "https://hermes-agent.nousresearch.com/docs/reference/profile-commands",
    "tui": "https://hermes-agent.nousresearch.com/docs/user-guide/tui",
    "cli_symbols": "https://hermes-agent.nousresearch.com/docs/reference/cli-symbols",
    "config": "https://hermes-agent.nousresearch.com/docs/user-guide/configuration",
    "env": "https://hermes-agent.nousresearch.com/docs/reference/environment-variables",
    "mcp": "https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference",
    "skills_catalog": "https://hermes-agent.nousresearch.com/docs/reference/skills-catalog",
    "context_files": "https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files",
    "raw_mirror": "https://raw.githubusercontent.com/NousResearch/hermes-agent/main/website/docs/<path>.md"
  },
  "scope_allowlist": ["chat", "model", "gateway", "setup", "config", "auth", "profile", "skills", "plugins", "mcp", "memory", "tools", "sessions", "cron", "project", "doctor", "debug", "update", "logs", "backup", "lsp", "acp", "security"],
  "gotchas": [
    "General-purpose agent — placemat covers CLI/TUI coding surface ONLY (scope_allowlist); never add messaging/voice/pets/dashboard/computer-use/curator/journey/proxy/egress",
    "Dual versioning: date tag + semver title; tag date can differ from publish date; same-day .N patch tags",
    "llms-full.txt is ~3.7 MB — never ingest whole; use /docs/llms.txt to detect page churn",
    "Docs pages rename frequently — re-derive paths from llms.txt when a fetch 404s"
  ]
}
```
- [ ] **Step 4:** Write each `PIPELINE.md` with this common procedure + the agent's traps:
```markdown
# <Agent> daily sync — pipeline rules

1. Read the current version from index.html's `.release-tag`.
2. Poll `sources.json → version_poll` (apply filter + transform). Not newer → exit silently: no commits, no PR, no output.
3. Collect release notes for EVERY release between current and newest (per `release_notes` rules).
4. Cross-reference against the placemat cards. Apply row edits per AGENTS.md content rules
   (verified-only; new-to-docs items unverified until confirmed; notes not summary-extensions;
   also re-check existing `class="unverified"` items and strip the class once confirmed).
5. Update changelog.html (one section per release, or one ranged heading `rel-<last>` for a batch),
   the `.release-tag` + `.print-head` pair, and footer `Content synced` date.
6. Run `node scripts/build-changes.js <agent>` then `node tests/placemat.test.js <agent>` — both must pass.
7. Self-review: technical accuracy vs sources, changelog entry quality, card consistency.
8. Branch `claude/<agent>-update-v<newest>`, commit `feat(<agent>): update placemat for <Name> v<newest>`,
   push, open a PR (summary + checklist results). Never push to main. Never touch other agents' dirs.
```
- [ ] **Step 5:** Branch `feat/pipeline-manifests`, commit `feat: per-agent pipeline manifests`, PR, merge.

---

## Task 14: Pipeline dry-runs — GATE

**Goal:** Prove each pipeline works end-to-end **before** any schedule exists.

> **USER-ORDERED GATE — NON-SKIPPABLE.** This task was requested by the user in the current conversation. It MUST NOT be closed by walking around it, by declaring it "verified inline", or by substituting a cheaper check. Close only after every item in `acceptanceCriteria` has been re-validated independently, with output captured.

**Files:**
- No permanent files — produces three real PRs (or three recorded no-op runs)

**Acceptance Criteria:**
- [ ] For each agent, a fresh Claude session was given ONLY the routine prompt from Task 15 Step 1 (not this plan) and either (a) opened a correct update PR with green CI, or (b) correctly exited silently because no newer release existed — with the session transcript/output captured as evidence
- [ ] Any pipeline failure was fixed by amending `PIPELINE.md`/`sources.json`/AGENTS.md (rules live in the repo, not the prompt) and re-run to a pass
- [ ] If (a): PR reviewed and merged or closed deliberately; content spot-checked against the release notes it claims to apply

**Verify:** `gh pr list --repo dommango/agent-placemats --state all --search "update placemat"` shows the dry-run PRs (or captured no-op transcripts for all three).

**Steps:**

- [ ] **Step 1:** Codex is near-certain to have a newer release than v0.154.0 by execution time — run its prompt first in a fresh session, watch it produce the PR, review the diff row by row against the release notes.
- [ ] **Step 2:** Repeat for kimi-code and hermes.
- [ ] **Step 3:** Record evidence (PR links / no-op outputs) in the task close.

---

## Task 15: Scheduled routines

**Goal:** Three daily cloud routines keep the placemats synced without anyone remembering.

**Files:**
- None (account-level routines; prompt text mirrored in each `PIPELINE.md` header comment if desired)

**Acceptance Criteria:**
- [ ] Three routines exist: `codex-placemat-sync` (cron `15 9 * * *` UTC), `kimi-placemat-sync` (`30 9 * * *`), `hermes-placemat-sync` (`45 9 * * *`) — staggered after CC's 09:00 routine (D4)
- [ ] Each routine prompt is exactly the Step-1 template with its agent substituted
- [ ] Blocked by Task 14 (gate) passing

**Verify:** List routines via the `/schedule` skill (or ask Dom to confirm in /tasks) — three entries with the right crons.

**Steps:**

- [ ] **Step 1:** Routine prompt template (substitute `<agent>` = codex | kimi-code | hermes, `<Name>` accordingly):
```text
You are the daily placemat sync agent for <Name>.
Repo: github.com/dommango/agent-placemats (clone it), working directory <agent>/.
Read AGENTS.md, then <agent>/PIPELINE.md and <agent>/sources.json, and follow
them exactly. If there is no release newer than the placemat's current
"As of release" version, exit silently with no output and no commits.
Otherwise produce one PR per the pipeline rules and stop.
```
- [ ] **Step 2:** In an interactive session (Dom may need to authorize), invoke the `/schedule` skill three times: "create a routine named codex-placemat-sync running daily at 09:15 UTC with this prompt: …" etc. If `/schedule` is unavailable, use the RemoteTrigger tool directly (load via ToolSearch) mirroring how `claude-code-placemat`'s existing 09:00 routine is configured.
- [ ] **Step 3:** Confirm all three appear in the routine list; capture the listing as evidence.

---

## Task 16: Launch polish

**Goal:** The live site is complete, discoverable, and cross-linked.

**Files:**
- Create: `og-image.png` (repo root)
- Modify: `README.md` (badges/links), CC placemat repo footer (separate PR there)

**Acceptance Criteria:**
- [ ] `https://dommango.github.io/agent-placemats/` serves the hub; all three placemat URLs live; each page's feed link resolves
- [ ] `og-image.png` (1200×630) exists — screenshot of the hub via `chrome-devtools-axi` (open deployed hub, viewport 1200×630, screenshot, save). If the tool is unavailable, defer the image and note it — the metas already point at the path
- [ ] Separate small PR to `dommango/claude-code-placemat` adding a footer link "More agent placemats →" to the hub — following THAT repo's rules (changelog.html Template/Structure entry, `node scripts/build-changes.js`, tests, PR)
- [ ] A `project` memory written to the **agent-placemats silo** (`~/.claude/projects/-home-dom-projects-agent-placemats/memory/`, created on first session there) recording: what the repo is, the D-decisions table location, and the three routine names — plus MEMORY.md index line

**Verify:** `for u in "" codex/ kimi-code/ hermes/; do curl -so /dev/null -w "%{http_code} " "https://dommango.github.io/agent-placemats/$u"; done` → `200 200 200 200`; CC placemat PR merged; memory file exists.

**Steps:**

- [ ] **Step 1:** Verify all live URLs; fix Pages config if any 404 (Task 0 Step 6).
- [ ] **Step 2:** Produce and commit `og-image.png` per AC.
- [ ] **Step 3:** Open the CC placemat footer-link PR (branch `feat/link-agent-placemats` in that repo).
- [ ] **Step 4:** Write the memory + index line; final README pass (live badges optional — plain links fine, YAGNI).

---

## Risks & maintenance notes (for the reviewer; the pipeline rules already encode these)

1. **Codex docs churn** — the developers.openai.com → learn.chatgpt.com migration is fresh; if URLs break, re-derive from `llms.txt` and update `sources.json` (that's why URLs live there, not in routine prompts).
2. **Hermes velocity** — 300+ PRs per release window; the placemat tracks the *documented* surface, not the commit stream. If sync PRs balloon, tighten the scope allowlist rather than growing the page.
3. **Kimi experimental flags** churn within ~2 releases — the unverified/notes machinery absorbs this; expect DEL changelog entries.
4. **Licensing** — Kimi/Hermes MIT, Codex repo Apache-2.0; the Codex docs *site* has no explicit content license, so keep descriptions original condensed wording with attribution (already the house style). Revisit if any vendor objects; takedown = delete the dir + hub card.
5. **Schedule cost** — three more daily routines; no-op runs exit early by design. If cost bites, drop hermes to weekly (its narrative releases batch well).
6. **Silent-exit rule** discipline matters: a routine that "helpfully" opens empty PRs will train Dom to ignore the queue. `PIPELINE.md` step 2 is deliberate.

## Execution model recommendation

- Session 1 (any capable model): Tasks 0-6 (scaffold — mechanical).
- Sessions 2-4 (one per agent, Sonnet-class recommended; content extraction needs judgment): Tasks 7-8, 9, 10.
- Session 5: Tasks 11-13. Session 6 (interactive, with Dom): Tasks 14-15. Session 7: Task 16.
- Keep sessions single-purpose and short (Dom's session-hygiene rule); resume via `/superpowers-extended-cc:executing-plans docs/plans/2026-09-12-agent-placemats.md` from `~/projects/agent-placemats`.
