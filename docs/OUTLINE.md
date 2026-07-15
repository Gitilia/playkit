# Outline live docs checklist

Canonical prose stays in git (`README.md`, `docs/*`, `ROADMAP.md`).
Browsable front door: **Outline** → collection **QA & Dev** → doc **Playkit**
(`https://notes.levkin.ca/doc/playkit-CrPJq5x2qQ`).

Ops status for this page (scopes, last sync): **`docs/OPS.md`**.

## Sync script (preferred)

From this repo, with Outline credentials loaded:

```bash
# from ansible: make vault-export-env
# then export OUTLINE_URL / OUTLINE_API_KEY (safe parse — .env may contain shell-special chars)
python3 scripts/outline-sync-playkit.py
python3 scripts/outline-sync-playkit.py --dry-run
```

Creates or updates **QA & Dev → Playkit** with the current `package.json`
version, install pin, what’s-in-the-box digest, and links to repo docs.

**Required API scopes** (Outline → Settings → API & Access): at least
`collections.list`, `documents.list`, `documents.info`, `documents.create`,
`documents.update`, and preferably `documents.delete` / `documents.archive`.
Empty (unrestricted) scopes = full user access — fine for a personal kit-ops key.
Without `documents.update` the script can create a first doc but cannot refresh
an existing Playkit page (HTTP 403).

API sync to **v0.4.0** works as of 2026-07-15 (`vault_outline_api_key` has update/delete).

## When to update Outline

Update the Outline Playkit page **whenever playkit ships a release** (after the
tag / Gitea release is green), or whenever you merge a docs-only change that
changes consumer behavior:

1. Tag / release finished (or main docs PR merged)
2. Run `python3 scripts/outline-sync-playkit.py`
3. Spot-check in Outline (search “Playkit” under QA & Dev)
4. Optional: `make outline-setup` from ansible only if collections are missing —
   prefer the sync script for the living Playkit page
