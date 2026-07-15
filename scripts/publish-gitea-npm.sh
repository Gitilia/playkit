#!/usr/bin/env bash
# Publish @levkin/playkit to the Gitea npm registry.
# Usage:
#   NPM_PUBLISH_TOKEN=… ./scripts/publish-gitea-npm.sh
#   # or export from vault: vault_playkit_npm_token / RELEASE_TOKEN with write:package
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TOKEN="${NPM_PUBLISH_TOKEN:-${PLAYKIT_NPM_TOKEN:-${RELEASE_TOKEN:-}}}"
if [[ -z "${TOKEN}" ]]; then
  echo "Set NPM_PUBLISH_TOKEN (Gitea token with write:package). See docs/OPS.md" >&2
  exit 1
fi

REG="https://git.levkin.ca/api/packages/ilia/npm/"
npm run build
TMP="$(mktemp)"
cat >"$TMP" <<EOF
@levkin:registry=${REG}
//git.levkin.ca/api/packages/ilia/npm/:_authToken=${TOKEN}
EOF
echo "Publishing $(node -p "require('./package.json').version") to ${REG}"
npm publish --userconfig "$TMP" --access restricted
rm -f "$TMP"
npm view @levkin/playkit version --registry "$REG" || true
