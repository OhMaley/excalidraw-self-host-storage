# Deployment

Images are built by GitHub Actions, pushed to GHCR, and pulled by the server.
Nothing is built on the server and it holds no source code.

```
git tag v1.4.0 && git push origin v1.4.0
  └─ release.yml: backend tests + frontend quality
       └─ build & push ghcr.io/ohmaley/excalidraw-self-host-storage/{backend,migrator,frontend}
            tagged v1.4.0 and sha-<commit>
            └─ deploy.yml (waits for your approval on the "production" environment)
                 └─ ssh <deploy-user>@server  →  <deploy-dir>/deploy.sh v1.4.0
                      fetch compose file @v1.4.0 → pull → backup → up -d → health check
```

- **Release:** push a `vX.Y.Z` tag.
- **Deploy an untagged `main` commit:** run *Release — Build & Deploy* manually
  (Actions tab), which builds images tagged `sha-<commit>`.
- **Redeploy / roll back:** run *Deploy* manually with an existing version.
  No rebuild happens.

## One-time GitHub setup

1. **Environment:** Settings → Environments → New `production`:
   - *Required reviewers*: yourself. This is the "semi" in semi-automatic.
   - *Deployment branches and tags*: restrict to `main` and `v*` tags.
   - Environment secrets:
     | Secret | Value |
     |---|---|
     | `DEPLOY_HOST` | server hostname or IP |
     | `DEPLOY_USER` | the server account that runs deploys (`<deploy-user>` below) |
     | `DEPLOY_SSH_KEY` | private key generated below |
     | `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 <host>`, run from a trusted machine, then fingerprint-checked |
   - Optional environment secret `DEPLOY_PORT` if SSH isn't on 22.
2. **Packages:** after the first release, open each of the 3 packages
   (profile → Packages), go to *Package settings*, and set them to **Public**. Then the server
   needs no registry credentials. The images contain no secrets: all
   config is injected at runtime.

## One-time server setup

Deploys run as a server account (`<deploy-user>`) from a deploy directory of
your choice (`<deploy-dir>`). The real user and path are deliberately not in
this repo: the user is only in the `DEPLOY_USER` secret, the path only in
`authorized_keys` on the server. `deploy.sh` finds
everything relative to its own location and never prints the absolute path
(CI logs are public).

```bash
# As <deploy-user>. Docker group membership is root-equivalent (and the
# account may have sudo too), which is why the CI key below is locked to
# deploy.sh only.
sudo usermod -aG docker "$USER"    # then log out and back in

mkdir -p <deploy-dir> && chmod 700 <deploy-dir>
cd <deploy-dir>
curl -fsSLO https://raw.githubusercontent.com/OhMaley/excalidraw-self-host-storage/main/docker/deploy.sh
curl -fsSL  https://raw.githubusercontent.com/OhMaley/excalidraw-self-host-storage/main/docker/env.prod.template -o .env.prod
chmod 700 deploy.sh && chmod 600 .env.prod
$EDITOR .env.prod        # fill in real values
```

Keep `<deploy-dir>` and `deploy.sh` writable only by `<deploy-user>`: the CI key
can run whatever that file contains. The directory also holds `.env.prod`
and `backups/` (all user data).

Generate a **dedicated** CI key on your machine (not your personal key) and
paste the private half into the `DEPLOY_SSH_KEY` secret:

```bash
ssh-keygen -t ed25519 -N "" -C "github-actions-deploy" -f deploy_key
```

Then on the server add the public half as a **new line** in
`~/.ssh/authorized_keys` of `<deploy-user>`, locked to the deploy script. The restriction
applies only to that line: your personal key keeps normal shell access.

```
command="<deploy-dir>/deploy.sh",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty ssh-ed25519 AAAA... github-actions-deploy
```

Delete the local `deploy_key` files once the secret is saved.

`deploy.sh` itself is **not** updated by deploys. It's the trusted entry point,
so changes to it are copied to the server by hand.

Requirements on the host: Docker with Compose v2.17+ (for multiple
`--env-file`), `curl`, `flock`.

## Database migrations

The `migrator` image contains the migrations and runs `sqlx migrate run`
before the backend starts. If it fails, the deploy fails and the backend
stays stopped. `deploy.sh` then prints the rollback command.

Rules that keep rollback working:

- **Migrations are append-only.** Never edit an applied one: sqlx checksums
  them and will refuse to run.
- **Each migration must be compatible with the previous release.** Rollback
  only swaps images, it never un-applies a migration (the migrator runs with
  `--ignore-missing` so an older image accepts a newer schema). Adding tables
  or nullable columns is safe. For renames, drops, or `NOT NULL` on existing data,
  use *expand/contract* across two releases:
  1. vN: add the new column, have the code write both and read the new one
  2. vN+1: drop the old column
- **Undo:** every deploy saves a `pg_dump` and a drawings tarball in
  `<deploy-dir>/backups/` (last 5 kept). To restore the database after
  a bad migration:
  ```bash
  cd <deploy-dir>
  docker stop backend
  gunzip -c backups/appdb-<stamp>-before-<version>.sql.gz \
    | docker exec -i appdb sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE \"$POSTGRES_DB\"" -c "CREATE DATABASE \"$POSTGRES_DB\"" && psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  ./deploy.sh <previous version>
  ```

## Backups

Deploy-time backups live on the same server, so they don't survive losing it.
Set up a separate scheduled off-site backup of **both** the database
(`pg_dump`) and the `drawings_data` volume. Drawings are files on disk,
not rows in Postgres.

## Not handled by CI

- Changes to `.env.prod` (edit on the server, then re-run `deploy.sh <current version>`)
- Keycloak realm/client changes (admin console)
- Reverse proxy config (`docker/reverse-proxy/`)
- `deploy.sh` updates (copied by hand, see above)