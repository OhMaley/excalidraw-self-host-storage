# Reverse proxy examples

`excalidraw.conf.example` is a copy-paste starting point for the site config
on your host's reverse proxy. It is **not** read by Docker Compose or applied
automatically by anything in this repo — copy it into your reverse proxy's
config directory, replace the placeholder domain, and adjust paths/certs to
match your setup.

It assumes the `backend` and `frontend` services from
`docker-compose.prod.yml` are published to `127.0.0.1:3000` and
`127.0.0.1:8081` respectively (the compose file's defaults), and that
something else on the host (e.g. an ACME client) already manages the TLS
certificate for the domain.
