# Outline live docs checklist

Canonical prose stays in git (`README.md`, `docs/*`, `ROADMAP.md`).
Browsable front door: **Outline** → collection **QA & Dev** → doc **Playkit**
(`https://notes.levkin.ca`).

## Sync script (preferred)

From this repo, with Outline credentials loaded:

```bash
# from ansible: make vault-export-env && set -a && source .env && set +a
python3 scripts/outline-sync-playkit.py
python3 scripts/outline-sync-playkit.py --dry-run
```

Creates or updates **QA & Dev → Playkit** with the current `package.json`
version, install pin, what’s-in-the-box digest, and links to repo docs.

**Required API scopes** (Outline → Settings → API & Access): at least
`collections.list`, `documents.list`, `documents.info`, `documents.create`,
`documents.update`. Without `documents.update` the script can create a first
doc but cannot refresh an existing Playkit page (HTTP 403).

## When to update Outline

Update the Outline Playkit page **whenever playkit ships a release** (after the
tag / Gitea release is green), or whenever you merge a docs-only change that
changes consumer behavior:

1. Tag / release finished (or main docs PR merged)
2. Run `python3 scripts/outline-sync-playkit.py`
3. Spot-check in Outline (search “Playkit” under QA & Dev)
4. Optional: `make outline-setup` from ansible only if collections are missing —
   prefer the sync script for the living Playkit page

Paste template (if editing by hand — adjust version):

```markdown
# @levkin/playkit

Shared Playwright + API e2e kit. **Source of truth is the git repo.**

- Repo: https://git.levkin.ca/ilia/playkit
- Current: vX.Y.Z
- Consumers: punimtag (e2e/) — *pause further adoption until soak completes*

## Quick links
- README · CONSUMER.md · NETWORK.md · IDEAS.md · SELFTEST.md · ROADMAP · CHANGELOG
- Metrics: dash.levkin.ca → Live — Playkit e2e
```
