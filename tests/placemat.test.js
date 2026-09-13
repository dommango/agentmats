#!/usr/bin/env node
// Zero-dependency structural/regression tests for the agent placemats.
// No build step, no npm install.
//
//   node tests/placemat.test.js            # every agent directory that exists
//   node tests/placemat.test.js codex      # one agent
//
// These aren't full browser tests; they're fast, dependency-free guards against
// the specific regressions this template has actually hit.

'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SITE = 'https://dommango.github.io/agentmats/';

// The eight canonical cards, identical ids and order in every agent's index.html (D2).
const CANONICAL_CARDS = [
  'card-keys', 'card-slash-core', 'card-slash-tools', 'card-cli',
  'card-settings', 'card-env', 'card-skills', 'card-hooks',
];

const AGENTS = ['codex', 'kimi-code', 'hermes', 'claude-code'];

// Agents whose sources.json MUST carry a vendor-extracted inventory. The three
// launch placemats were verified by hand before this existed; every agent added
// from here on declares one. Remove an entry only by backfilling its inventory.
const INVENTORY_REQUIRED = ['antigravity', 'kimi-code'];
const arg = process.argv[2];
const targets = arg ? [arg] : AGENTS.filter((a) => {
  if (fs.existsSync(path.join(ROOT, a, 'index.html'))) return true;
  console.warn(`skip ${a}: not built yet`);
  return false;
});

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL - ${name}`);
    console.log(`    ${err.message}`);
  }
}

function extractScripts(html) {
  const scripts = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) scripts.push(m[1]);
  return scripts;
}

// --- shared assets (checked once, not per agent) ---
{
  const css = read('shared/placemat.css');
  const js = read('shared/placemat.js');

  test('shared/placemat.js: is syntactically valid', () => {
    new vm.Script(js);
  });

  test('shared/placemat.js: derives per-agent storage keys, shares theme and density', () => {
    assert.ok(/dataset\.agent/.test(js), 'AGENT must come from <html data-agent>');
    assert.ok(js.includes("'pm-' + AGENT + '-seen-version'"), 'seen key must be per agent');
    assert.ok(js.includes("'pm-' + AGENT + '-collapsed'"), 'collapsed key must be per agent');
    assert.ok(js.includes("'placemat-theme'"), 'theme key stays shared origin-wide');
    assert.ok(js.includes("'placemat-density'"), 'density key stays shared origin-wide');
    // The Claude Code placemat owns the unprefixed seen key — never touch it (D6).
    assert.ok(!/'placemat-seen-version'/.test(js), "must not use CC's unprefixed seen key");
    assert.ok(!/'placemat-collapsed'/.test(js), "must not use CC's unprefixed collapsed key");
  });

  test('shared/placemat.js: the command builder is gone (D8)', () => {
    ['labPrompt', 'generatedCmd', 'shellSingleQuote'].forEach((needle) => {
      assert.ok(!js.includes(needle), `builder leftover: ${needle}`);
    });
  });

  test('shared/placemat.js: search normaliser strips separators so "ctrl+r" matches "Ctrl R"', () => {
    const fn = js.match(/const normaliseSearch = \(s\) => (.*?);\n/);
    assert.ok(fn, 'normaliseSearch not found');
    const norm = new Function('return (s) => ' + fn[1])();
    assert.strictEqual(norm('Ctrl R'), norm('ctrl+r'));
    assert.strictEqual(norm('--permission-mode manual'), 'permissionmodemanual');
    assert.strictEqual(norm('~/.codex/config.toml'), 'codexconfigtoml');
  });

  test('shared/placemat.js: version comparison orders v2.1.9 < v2.1.10 < v2.2.0', () => {
    const fn = js.match(/const versionNumber = \(v\) => (.*?);\n/);
    assert.ok(fn, 'versionNumber not found');
    const num = new Function('return (v) => ' + fn[1])();
    assert.ok(num('v2.1.9') < num('v2.1.10'));
    assert.ok(num('v2.1.263') < num('v2.2.0'));
    assert.ok(num('v0.153.0') < num('v0.154.0'));
  });

  // Regression guard for a real bug: loading index.html?q=hook runs performSearch and
  // revealNoteHits during script execution. revealNoteHits closes over `const noteButtons`,
  // so if the two-tier block is declared after the search block, that load throws
  // "Cannot access 'noteButtons' before initialization" and every later block —
  // including the since-your-last-visit feed — silently never runs.
  test('shared/placemat.js: bindings used by the ?q= load path are declared before it', () => {
    const declaration = js.indexOf('const noteButtons =');
    const initialLoad = js.indexOf('revealNoteHits(initialQuery)');
    assert.ok(declaration !== -1 && initialLoad !== -1, 'expected markers not found');
    assert.ok(declaration < initialLoad, 'noteButtons must be declared before the initial-query search runs');
    const groups = js.indexOf('const groupEls =');
    assert.ok(groups < initialLoad, 'groupEls must be declared before the initial-query search runs');
  });

  test('shared/placemat.js: makeCopyable keeps code chips out of the tab order', () => {
    assert.ok(/el\.tabIndex = -1;/.test(js), 'roving focus owns the tab order');
  });

  test('shared/placemat.css: has an A4 landscape @page rule and a print block that hides the chrome', () => {
    assert.ok(/@page\s*\{\s*size: A4 landscape;/.test(css), '@page A4 landscape missing');
    const print = css.match(/@media print \{([\s\S]*)\}\s*$/);
    assert.ok(print, '@media print block missing (it must be the last block in the file)');
    ['.global-header', '.legend-strip', '.print-head', 'column-count: 4', 'break-inside: avoid', 'print-color-adjust: exact'].forEach((needle) => {
      assert.ok(print[1].includes(needle), `print block missing ${needle}`);
    });
  });

  test('shared/placemat.css: exposes per-agent accent slots in both themes', () => {
    assert.ok(!/--coral|--teal/.test(css), 'CC brand variable names must be gone');
    ['--accent-1:', '--accent-2:'].forEach((v) => {
      assert.ok((css.match(new RegExp(v.replace('-', '\\-'), 'g')) || []).length >= 2,
        `${v} must be defined for the dark and light themes`);
    });
  });

  ['.sr-only', '.no-results', '.legend-strip', '.legend-strip-row'].forEach((selector) => {
    test(`shared/placemat.css: defines ${selector}`, () => {
      assert.ok(css.includes(selector), `${selector} not found`);
    });
  });
}

// --- per-agent pages ---
for (const agent of targets) {
  const INDEX = `${agent}/index.html`;
  const CHANGELOG = `${agent}/changelog.html`;
  const CHANGES = `${agent}/changes.json`;
  const FEED = `${agent}/feed.xml`;

  const html = read(INDEX);
  const changelog = read(CHANGELOG);
  const scripts = extractScripts(html);

  // ---- index.html ----

  test(`${agent}: index.html has exactly 1 inline script (theme init) + 1 shared script src`, () => {
    assert.strictEqual(scripts.length, 1, `${scripts.length} bare <script> blocks, expected 1`);
    assert.ok(/localStorage\.getItem\('placemat-theme'\)/.test(scripts[0]),
      'the one inline script must be the blocking theme-init FOUC guard');
    const srcs = html.match(/<script src="[^"]*"[^>]*><\/script>/g) || [];
    assert.deepStrictEqual(srcs, ['<script src="../shared/placemat.js" defer></script>']);
  });

  test(`${agent}: index.html inline script is syntactically valid`, () => {
    scripts.forEach((s) => new vm.Script(s));
  });

  test(`${agent}: index.html declares its agent and links the shared stylesheet`, () => {
    assert.ok(new RegExp(`<html lang="en" data-agent="${agent}">`).test(html), 'data-agent missing or wrong');
    assert.ok(/<link rel="stylesheet" href="\.\.\/shared\/placemat\.css">/.test(html), 'shared stylesheet not linked');
    assert.ok(/<style>[\s\S]*?--accent-1:[\s\S]*?<\/style>/.test(html), 'per-agent accent override missing');
  });

  test(`${agent}: index.html every <table> has a matching <thead> with sr-only <th scope="col">`, () => {
    const tableCount = (html.match(/<table>/g) || []).length;
    const theadCount = (html.match(/<thead><tr><th scope="col" class="sr-only">/g) || []).length;
    assert.ok(tableCount > 0, 'no tables found — selector may be stale');
    assert.strictEqual(theadCount, tableCount, `${theadCount} sr-only theads for ${tableCount} tables`);
  });

  test(`${agent}: index.html has no leftover inline style="" attributes`, () => {
    assert.strictEqual(/style="/.test(html), false);
  });

  test(`${agent}: index.html has the eight canonical cards, in order`, () => {
    const cardIds = Array.from(html.matchAll(/<div class="card" id="(card-[a-z-]+)">/g), (m) => m[1]);
    assert.deepStrictEqual(cardIds, CANONICAL_CARDS, 'card ids must match the canonical set and order (D2)');
  });

  test(`${agent}: index.html every search-group is a <details> with a summary, h3 and count span`, () => {
    const groupCount = (html.match(/<details class="search-group" open data-group="[^"]+">/g) || []).length;
    const summaryCount = (html.match(/<summary><h3>[^<]+<\/h3><span class="group-count"><\/span><\/summary>/g) || []).length;
    assert.ok(groupCount > 0, 'no details.search-group found');
    assert.strictEqual(summaryCount, groupCount, `${summaryCount} well-formed summaries for ${groupCount} groups`);
    assert.strictEqual((html.match(/<div class="search-group">/g) || []).length, 0, 'old div.search-group still present');
  });

  // A group whose rows all got removed still renders — summary, heading and a
  // JS-filled count reading 0. A sync run only touches rows the release mentions,
  // so it will never notice, and nothing else in the suite looks at group contents.
  test(`${agent}: no search-group is empty`, () => {
    const empty = Array.from(
      html.matchAll(/<details class="search-group"[^>]*data-group="([^"]+)">([\s\S]*?)<\/details>/g))
      .filter((m) => !m[2].includes('<tr class="search-item"'))
      .map((m) => m[1]);
    assert.deepStrictEqual(empty, [], `empty groups render with a count of 0: ${empty.join(', ')}`);
  });

  test(`${agent}: index.html section nav has one chip per content card, in card order`, () => {
    const cardIds = Array.from(html.matchAll(/<div class="card" id="(card-[a-z-]+)">/g), (m) => m[1]);
    const nav = html.match(/<nav class="section-nav"[\s\S]*?<\/nav>/);
    assert.ok(nav, 'section-nav not found');
    const chipIds = Array.from(nav[0].matchAll(/href="#(card-[a-z-]+)"/g), (m) => m[1]);
    assert.deepStrictEqual(chipIds, cardIds, 'nav chips must match card ids and order');
    assert.ok(html.indexOf('<nav class="section-nav"') < html.indexOf('class="dashboard-grid"'), 'nav must precede the grid');
  });

  test(`${agent}: index.html every search-item row has a unique i- id and a matching permalink`, () => {
    const rows = html.match(/<tr class="search-item"[^>]*>/g) || [];
    assert.ok(rows.length > 0, 'no rows found');
    const ids = rows.map((r) => (r.match(/ id="(i-[a-z0-9-]+)"/) || [])[1]);
    assert.strictEqual(ids.filter((x) => !x).length, 0, 'rows without an i- id');
    assert.strictEqual(new Set(ids).size, ids.length, 'duplicate row ids');
    const links = Array.from(html.matchAll(/<tr class="search-item" id="(i-[a-z0-9-]+)"><td><a class="row-link" href="#(i-[a-z0-9-]+)"/g));
    assert.strictEqual(links.length, rows.length, `${links.length} permalinks for ${rows.length} rows`);
    links.forEach((m) => assert.strictEqual(m[1], m[2], 'permalink href must match the row id'));
  });

  test(`${agent}: index.html search box has a live result count and the grid is a main landmark`, () => {
    assert.ok(/<span class="search-count" id="searchCount" aria-live="polite"><\/span>/.test(html));
    assert.ok(html.includes('<main class="dashboard-grid">') && html.includes('</main>'));
    assert.ok(html.includes('<a class="skip-link" href="#card-keys">'));
  });

  test(`${agent}: index.html row links are outside the tab order (roving focus owns it)`, () => {
    const links = html.match(/<a class="row-link"[^>]*>/g) || [];
    assert.ok(links.length > 0 && links.every((l) => l.includes('tabindex="-1"')), 'row links must be tabindex=-1');
  });

  test(`${agent}: index.html no description exceeds 160 visible characters outside its notes`, () => {
    const strip = (s) => s.replace(/<ul class="notes"[\s\S]*?<\/ul>/g, '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, 'x');
    const cells = Array.from(html.matchAll(/<td class="desc">([\s\S]*?)<\/td><\/tr>/g), (m) => m[1]);
    const long = cells.map(strip).filter((t) => t.length > 160);
    assert.strictEqual(long.length, 0, `${long.length} descriptions over 160 chars, e.g. "${(long[0] || '').slice(0, 80)}…"`);
  });

  test(`${agent}: index.html every notes-btn is followed by a hidden ul.notes whose li count matches its +N label`, () => {
    const blocks = Array.from(html.matchAll(/<button type="button" class="notes-btn" aria-expanded="false">\+(\d+)<\/button><ul class="notes" hidden>([\s\S]*?)<\/ul>/g));
    const buttons = (html.match(/class="notes-btn"/g) || []).length;
    assert.strictEqual(blocks.length, buttons, `${blocks.length} well-formed notes blocks for ${buttons} buttons`);
    blocks.forEach((m) => {
      const items = (m[2].match(/<li>/g) || []).length;
      assert.strictEqual(items, Number(m[1]), `+${m[1]} label but ${items} notes`);
    });
  });

  test(`${agent}: index.html has the since-strip and drawer, and the drawer precedes the shared script`, () => {
    assert.ok(!html.includes('whatsNewData') && !html.includes('initWhatsNew'), 'old What\'s New modal still present');
    assert.ok(html.includes('id="sinceStrip"') && html.includes('id="sinceDrawer"'));
    assert.ok(/<link rel="alternate" type="application\/atom\+xml"[^>]*href="feed\.xml">/.test(html));
    assert.ok(html.indexOf('id="sinceDrawer"') < html.indexOf('<script src="../shared/placemat.js"'),
      'drawer markup must precede the script that uses it');
  });

  test(`${agent}: index.html print header release matches the header release tag`, () => {
    const tag = html.match(/<span class="release-tag">As of release: (v[\d.]+)/);
    const head = html.match(/<div class="print-head"[^>]*>[\s\S]*?As of release (v[\d.]+)[\s\S]*?<\/div>/);
    assert.ok(tag && head, 'release tag or print-head missing');
    assert.strictEqual(head[1], tag[1], 'print-head release differs from the header release tag');
  });

  // Scope guard (D3). Hermes is a general autonomous agent and the placemat covers
  // only its CLI/TUI coding surface, so the denylist in its sources.json is enforced
  // here rather than by eye.
  //
  // Two deliberate narrowings, both learned from false positives:
  //   - rows only, never the whole file — template class names like `dashboard-grid`
  //     and the scope note itself would otherwise trip it
  //   - <code> chips only, whole words — the denylist holds COMMAND names, and prose
  //     legitimately contains those letters ("sends the contents back", "API keys and
  //     secrets", the "subscription link" on the allowlisted `hermes portal`)
  test(`${agent}: no scope-denylisted command appears in any row`, () => {
    const manifest = path.join(ROOT, agent, 'sources.json');
    if (!fs.existsSync(manifest)) return;                       // agent has no scope limit
    const deny = JSON.parse(fs.readFileSync(manifest, 'utf8')).scope_denylist;
    if (!Array.isArray(deny) || !deny.length) return;
    const rows = html.match(/<tr class="search-item"[\s\S]*?<\/tr>/g) || [];
    assert.ok(rows.length > 0, 'no rows found');
    const chips = rows.flatMap((r) => Array.from(r.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g), (m) => m[1]));
    assert.ok(chips.length > 0, 'no code chips found');
    const offenders = new Set();
    deny.forEach((term) => {
      const re = new RegExp(`(^|[^a-z0-9-])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9-]|$)`, 'i');
      chips.forEach((c) => { if (re.test(c)) offenders.add(term); });
    });
    assert.deepStrictEqual([...offenders], [],
      `out-of-scope commands found in row chips: ${[...offenders].join(', ')}`);
  });

  // The positive counterpart to the denylist guard: every `<agent> <command>` row
  // subject must be on scope_allowlist. Only the row's FIRST chip counts — that is
  // what the row is about. Later chips legitimately name out-of-scope or deprecated
  // things in passing (`hermes login` appears in the allowlisted `hermes auth` row
  // as its deprecated alias). This is what catches a row drifting onto the page
  // without anyone updating the manifest.
  test(`${agent}: every command row subject is on the scope allowlist`, () => {
    const manifest = path.join(ROOT, agent, 'sources.json');
    if (!fs.existsSync(manifest)) return;
    const allow = JSON.parse(fs.readFileSync(manifest, 'utf8')).scope_allowlist;
    if (!Array.isArray(allow) || !allow.length) return;
    const binary = agent === 'kimi-code' ? 'kimi' : agent;
    const rows = html.match(/<tr class="search-item"[\s\S]*?<\/tr>/g) || [];
    const stray = [];
    rows.forEach((r) => {
      const first = (r.match(/<code[^>]*>([\s\S]*?)<\/code>/) || [])[1];
      if (!first) return;
      const m = first.match(new RegExp(`^${binary} ([a-z][a-z-]*)`));
      if (m && !allow.includes(m[1])) stray.push(m[1]);
    });
    assert.deepStrictEqual([...new Set(stray)], [],
      `row subjects missing from scope_allowlist: ${[...new Set(stray)].join(', ')}`);
  });

  test(`${agent}: index.html carries an unofficial-use disclaimer`, () => {
    assert.ok(/Unofficial community reference/.test(html), 'footer disclaimer missing');
    assert.ok(/not affiliated with or endorsed by/.test(html), 'non-affiliation wording missing');
  });

  // ---- changelog.html ----

  test(`${agent}: changelog.html inline scripts are syntactically valid`, () => {
    extractScripts(changelog).forEach((s) => new vm.Script(s));
  });

  test(`${agent}: changelog.html links the shared placemat.css (not a duplicated copy)`, () => {
    assert.ok(/<link rel="stylesheet" href="\.\.\/shared\/placemat\.css">/.test(changelog));
  });

  test(`${agent}: changelog.html has the same blocking theme-init as index.html (no FOUC, no dark lock-in)`, () => {
    const themeInit = (src) => (src.match(/<script>\s*\(function\(\) \{[\s\S]*?\}\)\(\);\s*<\/script>/) || [])[0];
    const a = themeInit(html);
    const b = themeInit(changelog);
    assert.ok(a && b, 'theme-init block missing from one of the pages');
    assert.strictEqual(b, a, 'theme-init blocks must be identical across the two pages');
    assert.ok(!/<body data-theme="dark">/.test(changelog), 'body should not hardcode a theme');
  });

  test(`${agent}: changelog.html theme toggle persists to localStorage`, () => {
    assert.ok(/localStorage\.setItem\('placemat-theme', next\)/.test(changelog));
  });

  test(`${agent}: changelog.html .change-list li is a two-column grid (tag | text)`, () => {
    // Regression guard: as a flex row, a long entry wrapped its second line under the
    // tag at the far left instead of under the text it belongs to.
    assert.ok(/\.change-list li \{[^}]*display:\s*grid/.test(changelog), 'change-list li must be a grid');
    assert.ok(/\.change-list li \{[^}]*grid-template-columns:\s*46px minmax\(0, 1fr\)/.test(changelog), 'tag | text columns missing');
    const entries = (changelog.match(/<li><span class="tag tag-\w+">\w+<\/span><span class="entry">/g) || []).length;
    const items = (changelog.match(/<li><span class="tag /g) || []).length;
    assert.strictEqual(entries, items, `${entries} wrapped entries for ${items} list items`);
  });

  test(`${agent}: changelog.html only the newest month group is open by default`, () => {
    const groups = changelog.match(/<details class="month-group"( open)?>/g) || [];
    assert.ok(groups.length >= 1, 'month groups not found');
    assert.strictEqual(groups[0], '<details class="month-group" open>', 'newest month must be open');
    assert.strictEqual(groups.slice(1).filter((g) => g.includes(' open')).length, 0, 'older months must start closed');
  });

  test(`${agent}: changelog.html every release heading has a unique rel- id`, () => {
    const heads = changelog.match(/<h3 id="rel-[\w.-]+">[^<]+ <span class="version-date">/g) || [];
    assert.ok(heads.length >= 1, `only ${heads.length} release headings found`);
    const ids = heads.map((h) => (h.match(/ id="(rel-[\w.-]+)"/) || [])[1]);
    assert.strictEqual(ids.filter((x) => !x).length, 0, 'release heading without id');
    assert.strictEqual(new Set(ids).size, ids.length, 'duplicate release ids');
  });

  // ---- generated files ----

  test(`${agent}: changes.json parses and matches the newest changelog release`, () => {
    const data = JSON.parse(read(CHANGES));
    assert.ok(Array.isArray(data.releases) && data.releases.length >= 1, 'no releases');
    const newest = changelog.match(/<h3 id="rel-([\w.-]+)">/)[1].replace(/-/g, '.');
    assert.strictEqual(data.releases[0].version.replace(/^v/, ''), newest,
      'changes.json is stale — run node scripts/build-changes.js ' + agent);
    assert.strictEqual(data.latest, data.releases[0].version);
    const versions = data.releases.map((r) => r.version);
    assert.strictEqual(new Set(versions).size, versions.length, 'duplicate versions');
    data.releases.forEach((r) => r.entries.forEach((e) => assert.ok(['ADD', 'CHG', 'DEL', 'FIX'].includes(e.tag), `bad tag ${e.tag}`)));
  });

  test(`${agent}: feed.xml is Atom with a self link and at least one entry`, () => {
    const xml = read(FEED);
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
    assert.ok(xml.includes('<feed xmlns="http://www.w3.org/2005/Atom">'));
    assert.ok(xml.includes(`<link rel="self" href="${SITE}${agent}/feed.xml"/>`), 'self link must point at this agent');
    assert.ok((xml.match(/<entry>/g) || []).length >= 1);
  });

  // ---- index.html <-> changelog.html consistency ----

  test(`${agent}: index.html release tag stays within 3 versions of the newest changelog release`, () => {
    const num = (v) => v.split('.').map(Number).reduce((a, b) => a * 1000 + b, 0);
    const tag = html.match(/As of release: v([\d.]+)/)[1];
    const newest = changelog.match(/<h3 id="rel-([\w.-]+)">/)[1].replace(/-/g, '.');
    assert.ok(num(tag) >= num(newest), `release tag ${tag} is older than changelog ${newest}`);
    // Releases with no placemat-relevant changes get no changelog entry, so a little slack is expected.
    assert.ok(num(tag) - num(newest) <= 3, `release tag ${tag} is more than 3 versions ahead of changelog ${newest}`);
  });

  test(`${agent}: index.html footer sync date matches the newest changelog release date`, () => {
    const footer = html.match(/Content synced (\d{4}-\d{2}-\d{2})/);
    assert.ok(footer, 'footer sync date missing');
    const newest = changelog.match(/<h3 id="rel-[\w.-]+">[^<]+<span class="version-date">(\d{4}-\d{2}-\d{2})<\/span>/);
    assert.ok(newest, 'newest changelog release date not found');
    assert.strictEqual(footer[1], newest[1], 'footer sync date is stale');
  });

  // shared/placemat.js does unguarded getElementById(...).something lookups. A page
  // missing one of those ids throws at load, and everything after the throw never
  // binds -- silently, since the rows still render and the HTML still validates.
  // Derive the list from the script itself so a newly-referenced id is covered.
  test(`${agent}: index.html has every element id shared/placemat.js looks up`, () => {
    const js = read('shared/placemat.js');
    const ids = [...new Set([...js.matchAll(/getElementById\('([A-Za-z]+)'\)/g)].map((m) => m[1]))];
    assert.ok(ids.length > 10, 'id extraction failed');
    const missing = ids.filter((id) => !html.includes(`id="${id}"`));
    assert.deepStrictEqual(missing, [], `index.html is missing ids: ${missing.join(', ')}`);
  });

  // Snapshots are immutable archives and must not depend on shared/, or a later
  // edit to the shared files would retroactively change how a past version renders.
  test(`${agent}: versions/v1.0.html is self-contained`, () => {
    const snap = read(`${agent}/versions/v1.0.html`);
    assert.ok(!snap.includes('shared/placemat'), 'snapshot references shared/ instead of inlining it');
    assert.ok(snap.includes('<style>') && snap.includes('<script>'), 'snapshot is missing inlined css/js');
  });

  // Build a snapshot with a JS string-replace and the $& in placemat.js's regex
  // escape expands to the matched text -- splicing a literal </script> into a string
  // literal, ending the block early and spilling the rest onto the page as text.
  test(`${agent}: versions/v1.0.html has balanced script tags and leaks no code`, () => {
    const snap = read(`${agent}/versions/v1.0.html`);
    const open = (snap.match(/<script[\s>]/g) || []).length;
    const close = (snap.match(/<\/script>/g) || []).length;
    assert.strictEqual(open, close, `unbalanced script tags (${open} open, ${close} close)`);
    const body = snap.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
    const leaked = body.match(/document\.(querySelector|getElementById|addEventListener)/g) || [];
    assert.deepStrictEqual(leaked, [], 'script content is rendering as page text');
  });

  // ---- cross-placemat alignment -------------------------------------------
  // A new agent's page is built next to three finished ones, and the cheapest
  // way to fill a card is to copy the neighbour's. These guards pin the parts
  // that genuinely are uniform, so divergence shows up as a failure rather
  // than as a page that merely looks a bit different.

  // Four card titles are identical across every placemat; settings varies only
  // by config filename. The keys/skills/hooks cards are legitimately per-agent.
  test(`${agent}: canonical card titles match the other placemats`, () => {
    const titleOf = (id) => {
      const card = html.split(`id="${id}"`)[1];
      assert.ok(card, `${id} not found`);
      const m = card.match(/<h2[^>]*>([^<]+)/);
      assert.ok(m, `${id} has no h2`);
      return m[1].trim();
    };
    assert.strictEqual(titleOf('card-slash-core'), 'Slash Commands (Core)');
    assert.strictEqual(titleOf('card-slash-tools'), 'Slash Commands (Tools)');
    assert.strictEqual(titleOf('card-cli'), 'CLI &amp; Subcommands');
    assert.strictEqual(titleOf('card-env'), 'Environment Variables');
    assert.ok(/^Settings \(\S+\)$/.test(titleOf('card-settings')),
      `settings title should read "Settings (<config file>)", got "${titleOf('card-settings')}"`);
  });

  // A class with no rule renders unstyled, which HTML validation never notices.
  // search-exclude is a JS hook; disclaimer is deliberately unstyled.
  test(`${agent}: every class used on the page has a CSS rule`, () => {
    const JS_HOOKS = new Set(['search-exclude', 'disclaimer']);
    const rules = new Set();
    const collect = (css) => { for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) rules.add(m[1]); };
    collect(read('shared/placemat.css'));
    for (const m of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) collect(m[1]);
    const used = new Set();
    for (const m of html.matchAll(/class="([^"]+)"/g)) m[1].split(/\s+/).forEach((c) => c && used.add(c));
    const undef = [...used].filter((c) => !rules.has(c) && !JS_HOOKS.has(c)).sort();
    assert.deepStrictEqual(undef, [], `classes used but never defined: ${undef.join(', ')}`);
  });

  // Internal links stay relative so the page works under a local preview server.
  // (canonical/og:url are absolute by design and are not <a href>.)
  test(`${agent}: internal links are relative, not absolute site URLs`, () => {
    const bad = [...html.matchAll(/<a[^>]+href="(https:\/\/dommango\.github\.io\/agentmats\/[^"]*)"/g)]
      .map((m) => m[1]);
    assert.deepStrictEqual(bad, [], `link to the live site instead of a relative path: ${bad.join(', ')}`);
  });

  // The content rule "verified against official docs" was unenforceable prose,
  // and a placemat built mostly from its neighbours passed every other check.
  // sources.json may carry an inventory extracted from the vendor reference;
  // any command or settings key not on it has to be marked unverified.
  test(`${agent}: command and settings rows are on the verified inventory`, () => {
    const manifest = JSON.parse(read(`${agent}/sources.json`));
    const inv = manifest.inventory;
    if (!inv) {
      assert.ok(!INVENTORY_REQUIRED.includes(agent),
        `${agent}/sources.json must declare an "inventory" block (see AGENTS.md)`);
      return;
    }
    assert.ok(inv.source && inv.fetched, 'inventory needs a source url and a fetched date');
    const cardRows = (id) => {
      const card = html.split(`id="${id}"`)[1];
      if (!card) return [];
      const end = card.indexOf('</div>');
      return [...(end === -1 ? card : card.slice(0, end))
        .matchAll(/id="(i-[a-z0-9-]*)"[\s\S]*?<\/a>(<code[^>]*>)([\s\S]*?)<\/code>/g)]
        .map((m) => ({ id: m[1], unverified: /class="[^"]*unverified/.test(m[2]),
                       chip: m[3].replace(/<[^>]+>/g, '').trim() }));
    };
    const offenders = [];
    if (Array.isArray(inv.slash)) {
      for (const card of ['card-slash-core', 'card-slash-tools']) {
        for (const row of cardRows(card)) {
          const cmd = row.chip.split(/\s+/)[0];
          if (!cmd.startsWith('/') || row.unverified) continue;
          if (!inv.slash.includes(cmd)) offenders.push(`${row.id} (${cmd})`);
        }
      }
    }
    if (Array.isArray(inv.settings)) {
      for (const row of cardRows('card-settings')) {
        const key = row.chip.trim();
        if (row.unverified || !/^[A-Za-z][\w.]*$/.test(key)) continue;
        if (!inv.settings.includes(key)) offenders.push(`${row.id} (${key})`);
      }
    }
    if (Array.isArray(inv.hooks)) {
      for (const row of cardRows('card-hooks')) {
        const ev = row.chip.trim();
        if (row.unverified || !/^[A-Za-z][\w]*$/.test(ev)) continue;
        if (!inv.hooks.includes(ev)) offenders.push(`${row.id} (${ev})`);
      }
    }
    assert.deepStrictEqual(offenders, [],
      `not on the vendor inventory and not marked unverified: ${offenders.join(', ')}`);
  });

  test(`${agent}: og:image, twitter card and canonical are present on both pages`, () => {
    [html, changelog].forEach((page) => {
      assert.ok(page.includes(`<meta property="og:image" content="${SITE}og-image.png">`), 'og:image missing or wrong');
      assert.ok(page.includes('<meta name="twitter:card" content="summary_large_image">'));
      assert.ok(new RegExp(`<link rel="canonical" href="${SITE}${agent}/`).test(page), 'canonical missing or wrong');
    });
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
