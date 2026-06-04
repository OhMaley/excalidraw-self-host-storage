-- Collection names must be unique within a workspace.
ALTER TABLE collections
    ADD CONSTRAINT uq_collections_workspace_name UNIQUE (workspace_id, name);

-- Drawing titles must be unique within a collection.
ALTER TABLE drawings
    ADD CONSTRAINT uq_drawings_collection_title UNIQUE (collection_id, title);
