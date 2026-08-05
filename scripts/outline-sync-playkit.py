#!/usr/bin/env python3
"""Create or update Outline → QA & Dev → Playkit (living front door).

Canonical source stays in git; this pushes a digest + links to notes.levkin.ca.

Credentials (required):
  OUTLINE_URL
  OUTLINE_TOKEN or OUTLINE_API_KEY

Usage (from ansible vault env, or any shell with those vars):
  python3 scripts/outline-sync-playkit.py
  python3 scripts/outline-sync-playkit.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COLLECTION_NAME = "QA & Dev"
DOC_TITLE = "Playkit"


def load_package_version() -> str:
    pkg = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8"))
    return str(pkg["version"])


def playkit_markdown(version: str) -> str:
    # Do not start with a second H1 — Outline already uses document title "Playkit".
    return f"""Shared Playwright + API e2e kit for Levkin repos. **Source of truth is the git repo** — this page is the browsable front door.

- **Repo:** https://git.levkin.ca/ilia/playkit
- **Current:** v{version}
- **Consumers:** punimtag (`e2e/`) — *pause further adoption until soak completes*
- **Install (npm):** `npm i @levkin/playkit@{version}` — see docs/NPM_REGISTRY.md
- **Fallback (git pin):** `npm i git+https://git.levkin.ca/ilia/playkit.git#v{version}`
- **CLI:** `npx @levkin/playkit init` · `playkit smoke`

## What's in the box

- Browser: `BasePage`, retries (`click`/`fill`/`safeGoto`), public-host guards (`assertPublicHost`, `waitForUrlHost`)
- Network: `interceptNetworkCall`, `startNetworkErrorMonitor` / `assertNoErrors` — see NETWORK.md
- API: `ApiClient` + Zod `schema` / `assertSchema`
- Mail: `createMailInbox()` (Mailpit default, Mailtrap optional)
- Auth helpers: `saveStorageState` / `storageStateUse`, `playkitFailureArtifacts()`
- Metrics: `TimingCollector` → Prometheus Pushgateway → Grafana **Live — Playkit e2e**
- Retry presets: `PLAYKIT_RETRY_PRESET=strictCi|flakyNetwork|default`
- Kit selftest CI against a fake site — docs/SELFTEST.md

## Quick links (in-repo)

| Doc | Purpose |
|-----|---------|
| `README.md` | Install, env vars, release steps |
| `docs/CONSUMER.md` | How to wire a consumer `e2e/` |
| `docs/NETWORK.md` | Page traffic spy / error monitor |
| `docs/NPM_REGISTRY.md` | Gitea npm install / publish |
| `docs/OPS.md` | Ops soak + outstanding UI one-timers |
| `docs/IDEAS.md` | OSS-borrowed backlog |
| `docs/OUTLINE.md` | When / how to re-sync this page |
| `docs/SELFTEST.md` | Kit CI fake-site self-test |
| `ROADMAP.md` | Living plan |
| `CHANGELOG.md` | Per-version notes |

## Metrics

- Pushgateway: `http://10.0.10.x:9091` (LAN)
- Grafana: `dash.levkin.ca` → **Live — Playkit e2e** (`live-playkit`)
- Enable in CI with `PLAYKIT_METRICS_ENABLED=true` + `PLAYKIT_PUSHGATEWAY_URL`

## Release checklist (operators)

1. Tag `vX.Y.Z` (must match `package.json` + CHANGELOG section) → Gitea `release` job
2. Ensure `NPM_PUBLISH_TOKEN` has `write:package` (docs/OPS.md) so registry publish succeeds
3. Re-run this script: `python3 scripts/outline-sync-playkit.py`
4. Confirm Grafana board + Pushgateway scrape (`make deploy-observability` in ansible)

_Last synced by `scripts/outline-sync-playkit.py` for v{version}._
"""


class OutlineError(RuntimeError):
    pass


class OutlineClient:
    def __init__(self, base_url: str, token: str, *, dry_run: bool = False) -> None:
        self.api_base = f"{base_url.rstrip('/')}/api"
        self.token = token
        self.dry_run = dry_run

    def call(self, method: str, body: dict | None = None) -> dict:
        payload = json.dumps(body or {}).encode()
        req = urllib.request.Request(
            f"{self.api_base}/{method}",
            data=payload,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        if self.dry_run:
            print(f"DRY-RUN POST {method}: {json.dumps(body or {}, indent=2)[:800]}")
            return {"ok": True, "data": {"id": "dry-run"}}

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read().decode()
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")
            raise OutlineError(f"{method} failed (HTTP {exc.code}): {detail[:500]}") from exc
        except urllib.error.URLError as exc:
            raise OutlineError(f"{method} request failed: {exc}") from exc

        data = json.loads(raw)
        if not data.get("ok"):
            raise OutlineError(f"{method} returned ok=false: {raw[:500]}")
        return data

    def list_collections(self) -> list[dict]:
        out: list[dict] = []
        offset = 0
        while True:
            batch = self.call("collections.list", {"limit": 100, "offset": offset}).get("data") or []
            out.extend(batch)
            if len(batch) < 100:
                break
            offset += 100
        return out

    def list_documents(self, collection_id: str) -> list[dict]:
        out: list[dict] = []
        offset = 0
        while True:
            batch = (
                self.call(
                    "documents.list",
                    {"limit": 100, "offset": offset, "collectionId": collection_id},
                ).get("data")
                or []
            )
            out.extend(batch)
            if len(batch) < 100:
                break
            offset += 100
        return out


def require_env() -> tuple[str, str]:
    # Allow ansible `.env` next to sibling repo without overwriting set keys
    ansible_env = REPO_ROOT.parent / "ansible" / ".env"
    if ansible_env.is_file():
        for line in ansible_env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            if key and key not in os.environ:
                os.environ[key] = value.strip().strip('"').strip("'")

    url = os.environ.get("OUTLINE_URL", "").strip()
    token = (
        os.environ.get("OUTLINE_TOKEN", "").strip()
        or os.environ.get("OUTLINE_API_KEY", "").strip()
    )
    missing = [n for n, v in (("OUTLINE_URL", url), ("OUTLINE_TOKEN|OUTLINE_API_KEY", token)) if not v]
    if missing:
        print(
            "ERROR: missing "
            + ", ".join(missing)
            + "\nLoad: cd ../ansible && make vault-export-env && set -a && source .env && set +a",
            file=sys.stderr,
        )
        sys.exit(1)
    return url, token


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    version = load_package_version()
    text = playkit_markdown(version)
    url, token = require_env()
    client = OutlineClient(url, token, dry_run=args.dry_run)

    collections = {c["name"]: c["id"] for c in client.list_collections()}
    if COLLECTION_NAME not in collections:
        raise OutlineError(
            f'collection "{COLLECTION_NAME}" not found — run ansible scripts/outline-setup.py first'
        )
    coll_id = collections[COLLECTION_NAME]
    docs = {d["title"]: d["id"] for d in client.list_documents(coll_id)}

    try:
        if DOC_TITLE in docs:
            client.call(
                "documents.update",
                {"id": docs[DOC_TITLE], "title": DOC_TITLE, "text": text, "publish": True},
            )
            print(f"updated: {COLLECTION_NAME} / {DOC_TITLE} (v{version})")
        else:
            client.call(
                "documents.create",
                {
                    "title": DOC_TITLE,
                    "text": text,
                    "collectionId": coll_id,
                    "publish": True,
                },
            )
            print(f"created: {COLLECTION_NAME} / {DOC_TITLE} (v{version})")
    except OutlineError as exc:
        if "403" in str(exc) or "authorization_error" in str(exc):
            print(
                "\nERROR: Outline API key can list/create but not update documents.\n"
                "In Outline → Settings → API & Access, edit the key and add scopes:\n"
                "  documents.update  documents.delete  documents.archive\n"
                "(full recommended set is in ansible docs/guides/authentik-apps.md Outline section).\n"
                "Then re-run: python3 scripts/outline-sync-playkit.py\n"
                "Also delete any leftover 'Playkit sync probe' doc under QA & Dev if present.\n",
                file=sys.stderr,
            )
        raise

    print(f"Outline: {url.rstrip('/')}/  → search '{DOC_TITLE}' under {COLLECTION_NAME}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
