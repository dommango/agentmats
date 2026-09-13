<!-- Bot sync PRs use a `claude/<agent>-update-vX.Y.Z` branch prefix — human PRs
     should use any other branch name. -->

## What this changes

<!-- One or two sentences. Link any related issue. -->

## Type

- [ ] Bug fix (broken layout, link, behavior)
- [ ] Content correction (wrong/outdated/missing entry)
- [ ] Design / CSS / accessibility
- [ ] Style guide or structural change
- [ ] New agent placemat
- [ ] Docs (README / AGENTS.md / CONTRIBUTING)
- [ ] CI / tooling

## Checklist

- [ ] I read [AGENTS.md](../AGENTS.md)'s Style Guide and Content Rules
- [ ] `node tests/placemat.test.js` passes locally
- [ ] `node scripts/build-changes.js --all --check` passes locally (generated files are fresh)
- [ ] No `versions/*.html` files were edited (they're frozen snapshots — no exceptions)
- [ ] No hand-edited `changes.json` or `feed.xml` — both are generator output
- [ ] Every new/changed row is sourced from that agent's own vendor docs, changelog, or
      `--help` output (link below) — never copied or inferred from a sibling placemat
- [ ] Anything I could only infer, rather than confirm, carries `class="unverified"`
- [ ] New rows have an `id="i-<slug>"` and a matching `.row-link` permalink
- [ ] Only one agent directory is touched (required for sync/content PRs; a shared-template
      or hub change may legitimately touch more)

## Source

<!-- For content changes: link the official changelog entry, docs page, or --help output that confirms this. -->
