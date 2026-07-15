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

1. Creates the Gitea Release + attaches `npm pack` tarball (existing)
2. Runs `npm publish` to `https://git.levkin.ca/api/packages/ilia/npm/`
   using `RELEASE_TOKEN` (needs **`write:package`** in addition to release scopes)

One-time: edit the `RELEASE_TOKEN` personal access token / app token on Gitea
to include package write, or add a dedicated `NPM_PUBLISH_TOKEN` secret and
wire it in CI (preferred if you want least privilege).

## Verify

```bash
npm view @levkin/playkit versions --registry https://git.levkin.ca/api/packages/ilia/npm/
```
