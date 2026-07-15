# Gitea npm registry (@levkin scope)

Gitea Package Registry is enabled on `git.levkin.ca`. Playkit releases can be
installed without a git URL once published.

## Consumer install

`.npmrc` (or CI step):

```ini
@levkin:registry=https://git.levkin.ca/api/packages/ilia/npm/
//git.levkin.ca/api/packages/ilia/npm/:_authToken=${PLAYKIT_GIT_TOKEN}
```

```bash
npm i @levkin/playkit
# or pin: npm i @levkin/playkit@0.4.0
```

Git pin remains supported as a fallback:

```bash
npm i git+https://git.levkin.ca/ilia/playkit.git#v0.4.0
```

## Publish (release job)

On `vX.Y.Z` tag, `.gitea/workflows/ci.yml` `release` job:

1. Creates the Gitea Release + attaches `npm pack` tarball
2. Runs `npm publish` to `https://git.levkin.ca/api/packages/ilia/npm/`
   using `NPM_PUBLISH_TOKEN` if set, else `RELEASE_TOKEN`
   (needs **`write:package`**)

Manual one-shot:

```bash
NPM_PUBLISH_TOKEN=… ./scripts/publish-gitea-npm.sh
```

## Verify

```bash
npm view @levkin/playkit versions --registry https://git.levkin.ca/api/packages/ilia/npm/
```

## Token setup

`@levkin/playkit@0.4.0` is on the registry. Tag/CI publish uses Actions secret
`NPM_PUBLISH_TOKEN` (`write:package`). Local ops: vault
`vault_playkit_npm_token` / `./scripts/publish-gitea-npm.sh`. See **`docs/OPS.md`**.
