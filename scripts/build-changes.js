#!/usr/bin/env node
// Derive <agent>/changes.json and <agent>/feed.xml from <agent>/changelog.html. Zero dependencies.
// Usage: node scripts/build-changes.js <agent> [--check]   |   node scripts/build-changes.js --all [--check]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://dommango.github.io/agentmats/';
const AGENTS = { codex: 'Codex CLI', 'kimi-code': 'Kimi Code', hermes: 'Hermes Agent', 'claude-code': 'Claude Code', antigravity: 'Antigravity CLI' };
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
  const all = args.includes('--all');
  let agents = all ? Object.keys(AGENTS) : [target];
  if (!agents[0] || agents.some((a) => !AGENTS[a])) {
    console.error(`Usage: build-changes.js <${Object.keys(AGENTS).join('|')}> [--check] | --all [--check]`);
    process.exit(2);
  }
  // --all works mid-build: an agent directory that does not exist yet is skipped
  // with a warning. Naming an agent explicitly still fails loudly if it is missing.
  if (all) {
    agents = agents.filter((a) => {
      if (fs.existsSync(path.join(ROOT, a, 'changelog.html'))) return true;
      console.warn(`skip ${a}: not built yet`);
      return false;
    });
    if (!agents.length) {
      console.error('no agent directories built yet');
      process.exit(1);
    }
  }
  const ok = agents.map((a) => run(a, check)).every(Boolean);
  if (check) {
    if (!ok) process.exit(1);
    console.log('changes.json and feed.xml are up to date');
  }
}

main();
