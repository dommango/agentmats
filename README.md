# Agent Placemats

Unofficial single-page reference "placemats" for CLI coding agents — every
command, flag, shortcut and config key you actually reach for, on one printable
page per agent, kept current by a daily sync.

**→ https://dommango.github.io/agent-placemats/**

## The placemats

| Placemat | Agent | Vendor | Official docs |
|---|---|---|---|
| [Codex CLI](https://dommango.github.io/agent-placemats/codex/) | Codex CLI | OpenAI | [developers.openai.com/codex](https://developers.openai.com/codex) |
| [Kimi Code](https://dommango.github.io/agent-placemats/kimi-code/) | Kimi Code | Moonshot AI | [moonshotai.github.io/kimi-code](https://moonshotai.github.io/kimi-code/) |
| [Hermes Agent](https://dommango.github.io/agent-placemats/hermes/) | Hermes Agent | Nous Research | [hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com/docs/) |
| [Claude Code](https://dommango.github.io/claude-code-placemat/) | Claude Code | Anthropic | [code.claude.com/docs](https://code.claude.com/docs) |

The Claude Code placemat lives in its own repo,
[dommango/claude-code-placemat](https://github.com/dommango/claude-code-placemat),
and is linked from the hub rather than duplicated here.

## What you get

- **One page per agent.** Eight cards with the same ids and order everywhere, so
  what you learn on one placemat transfers to the next.
- **A hub** that tells you what changed in each agent since *you* last looked at
  that agent's placemat, plus a Rosetta table mapping the same job across all four.
- **Search** (Ctrl+K) that ignores separators — `ctrl+r` finds `Ctrl R`.
- **Click-to-copy** on every code chip, and a `#` permalink on every row.
- **Print** (Ctrl+P) to an A4-landscape four-column sheet.
- **Atom feeds** per agent, plus a machine-readable `changes.json`.
- No trackers, no external dependencies, no build step.

## Unofficial

These are community references. They are **not affiliated with, endorsed by, or
produced by** OpenAI, Moonshot AI, Nous Research or Anthropic. No vendor logos
or wordmarks are used. Every entry is condensed in our own words from the
official documentation and links back to it — always confirm against the
official docs before relying on anything here. Spotted something wrong? Open an
issue.

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Cross-origin `changes.json` (the Claude Code card on the hub) will not load in
local preview; that card degrades to `—` placeholders by design.

## Development

```bash
node tests/placemat.test.js             # structural suite, all built agents
node tests/placemat.test.js codex       # one agent
node scripts/build-changes.js codex     # regenerate changes.json + feed.xml
node scripts/build-changes.js --all --check
```

Conventions, content rules and the update pipeline are in
[AGENTS.md](AGENTS.md). Zero dependencies — Node is used only for the generator
and the test suite.

## Licence

[MIT](LICENSE)
