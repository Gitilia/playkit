# Ops checklist (playkit)

Living ops/status after releases. Update when an item closes.

## Done

| Item | Status |
|------|--------|
| Pushgateway + `live-playkit` Grafana board | Applied (`10.0.10.x:9091`) |
| Tag release workflow + `RELEASE_TOKEN` | Working (`v0.3.1`, `v0.4.0` Gitea releases) |
| Selftest CI | Green (Playwright image pinned to package version) |
| Outline **QA & Dev → Playkit** @ v0.4.0 | Synced via API 2026-07-15 → https://notes.levkin.ca/doc/playkit-CrPJq5x2qQ |
| Playkit sync probe cleanup | Deleted via API 2026-07-15 |
| Outline API key (`documents.update` / `delete`) | Vault + `.env` updated (`vault_outline_api_key`) |
| Gitea npm publish (`write:package`) | `@levkin/playkit@0.4.0` on registry; Actions secret `NPM_PUBLISH_TOKEN` set; vault `vault_playkit_npm_token` |
| v0.4 CLI / retry presets / registry wiring | Shipped on `main` |

## Outstanding

### Adoption soak

Keep **no new consumer repos** until punimtag e2e + kit CI + metrics stay green
for a few days. Then prefer `screening` as the next adopter.

## Recurring (after each release)

```bash
# Outline living page
cd /path/to/ansible && make vault-export-env
set -a && source .env && set +a
cd /path/to/playkit
python3 scripts/outline-sync-playkit.py

# Manual publish (CI also publishes on tag when NPM_PUBLISH_TOKEN is set)
./scripts/publish-gitea-npm.sh
```
