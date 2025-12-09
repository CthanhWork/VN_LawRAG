ALTER TABLE users
    ADD COLUMN avatar_url VARCHAR(500) NULL,
    ADD COLUMN avatar_public_id VARCHAR(255) NULL;

ALTER TABLE post_media
    ADD COLUMN external_id VARCHAR(255) NULL,
    ADD COLUMN storage_provider VARCHAR(30) NOT NULL DEFAULT 'LOCAL';
