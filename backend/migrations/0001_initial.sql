-- gen_random_uuid() is available in pgcrypto (Postgres < 13) and as a built-in from Postgres 13+.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users are upserted from Keycloak claims on first authenticated request.
-- The primary key is the Keycloak subject (sub), which is not always a UUID.
CREATE TABLE users (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE workspaces (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    -- TRUE only for the personal workspace created automatically for each user.
    -- Private workspaces cannot be deleted and have no workspace_members rows.
    is_private  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by  TEXT         NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by  TEXT         REFERENCES users(id),
    updated_at  TIMESTAMPTZ
);

-- Membership for non-private workspaces. Ownership is expressed as role = 'owner'.
-- Private workspaces have no rows here; access is implied by workspaces.created_by.
CREATE TABLE workspace_members (
    workspace_id UUID           NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      TEXT           NOT NULL REFERENCES users(id),
    role         workspace_role NOT NULL,
    joined_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

-- Supports "list all workspaces for a given user" without a full table scan.
CREATE INDEX idx_workspace_members_user_id ON workspace_members (user_id);

CREATE TABLE collections (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    description  VARCHAR(500),
    created_by   TEXT         NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by   TEXT         REFERENCES users(id),
    updated_at   TIMESTAMPTZ
);

CREATE INDEX idx_collections_workspace_id ON collections (workspace_id);

CREATE TABLE drawings (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID         NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    title         VARCHAR(100) NOT NULL,
    description   VARCHAR(500),
    tags          TEXT[]       NOT NULL DEFAULT '{}',
    created_by    TEXT         NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by    TEXT         REFERENCES users(id),
    updated_at    TIMESTAMPTZ
);

-- Supports "list drawings in a collection ordered by created_at DESC".
CREATE INDEX idx_drawings_collection_id_created_at ON drawings (collection_id, created_at DESC);
