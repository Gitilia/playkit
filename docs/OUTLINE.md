# Outline live docs checklist

Canonical prose stays in git (`README.md`, `docs/*`, `ROADMAP.md`).
Browsable front door: **Outline** → collection **QA & Dev** → doc **Playkit**
(`https://notes.levkin.ca`).

## When to update Outline

Update the Outline Playkit page **whenever playkit ships a release** (after the
tag / Gitea release is green), or whenever you merge a docs-only change that
changes consumer behavior:

1. Tag / release finished (or main docs PR merged)
2. Open Outline → QA & Dev → Playkit
3. Sync at least: current version pin, “what’s in the box”, install snippet,
   link to CHANGELOG / ROADMAP / NETWORK.md
4. Optional: `make outline-setup` from ansible only if you maintain seed notes there —
   prefer editing the living page by hand so it stays readable

Paste template (adjust version):

```markdown
# @levkin/playkit

Shared Playwright + API e2e kit. **Source of truth is the git repo.**

- Repo: https://git.levkin.ca/ilia/playkit
- Current: vX.Y.Z
- Consumers: punimtag (e2e/) — *pause further adoption until soak completes*

## Quick links
- README · CONSUMER.md · NETWORK.md · IDEAS.md · ROADMAP · CHANGELOG
- Metrics: dash.levkin.ca → Live — Playkit e2e
```
