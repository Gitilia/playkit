# Ops checklist (playkit)

Living ops/status after releases. Update when an item closes.

## Done

| Item | Status |
|------|--------|
| Pushgateway + `live-playkit` Grafana board | Applied (`10.0.10.24:9091`) |
| Tag release workflow + `RELEASE_TOKEN` | Working (`v0.3.1`, `v0.4.0` Gitea releases) |
| Selftest CI | Green (Playwright image pinned to package version) |
| Outline **QA & Dev → Playkit** content @ v0.4.0 | Updated 2026-07-15 (browser sync); keep in sync via script once API scopes fixed |
| v0.4 CLI / retry presets / registry wiring | Shipped on `main` |

## Outstanding (needs human UI once)

### 1. Gitea npm publish token (`write:package`)

`v0.4.0` **Gitea Release** succeeded; `npm publish` failed with **E401** because
Actions `RELEASE_TOKEN` lacks package scopes.

1. Gitea → **Settings → Applications → Generate New Token**
2. Scopes: **`write:package`** (implies read) + keep `write:repository` if this token also cuts releases
3. Prefer a dedicated token named `playkit-npm-publish`
4. Store as repo Action secret **`NPM_PUBLISH_TOKEN`** on `ilia/playkit`
   (optional: also `vault_playkit_npm_token` in ansible vault — see ansible `docs/hardening/SECRETS.md`)
5. Publish once:

```bash
cd /path/to/playkit   # on main @ v0.4.0
npm ci && npm run build
npm publish --registry https://git.levkin.ca/api/packages/ilia/npm/
# or: ./scripts/publish-gitea-npm.sh
```

6. Verify: `npm view @levkin/playkit version --registry https://git.levkin.ca/api/packages/ilia/npm/`

Until then consumers use the git pin: `#v0.4.0`.

### 2. Outline API key scopes

Vault `vault_outline_api_key` can **list/create/info/export** but **not**
`documents.update` / `delete` / `archive` (HTTP 403).

1. Outline → **Settings → API** (API & Access)
2. Edit/recreate key with scopes at least:

```
collections.list documents.list documents.info documents.create documents.update documents.delete documents.archive documents.search
```

(Full recommended list: ansible `docs/guides/authentik-apps.md` → Outline API key)

3. Update vault + `make vault-export-env`
4. `python3 scripts/outline-sync-playkit.py`
5. Delete leftover **QA & Dev → Playkit sync probe** if still present

### 3. Adoption soak

Keep **no new consumer repos** until punimtag e2e + kit CI + metrics stay green
for a few days. Then prefer `screening` as the next adopter.
