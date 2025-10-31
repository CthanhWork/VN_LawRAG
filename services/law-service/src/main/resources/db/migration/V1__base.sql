-- V1: base schema for laws and law_nodes
CREATE TABLE IF NOT EXISTS laws (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  title TEXT,
  issuing_body VARCHAR(255),
  promulgation_date DATE,
  effective_date DATE,
  expire_date DATE NULL,
  status VARCHAR(64),
  field VARCHAR(255),
  unified BOOLEAN DEFAULT FALSE,
  unified_source VARCHAR(512),
  source_url VARCHAR(1024)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS law_nodes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  law_id BIGINT NOT NULL,
  parent_id BIGINT NULL,
  level VARCHAR(32) NOT NULL,
  ordinal_label VARCHAR(64),
  heading TEXT,
  content_html LONGTEXT,
  content_text LONGTEXT,
  sort_key VARCHAR(64),
  path VARCHAR(512) NOT NULL,
  title VARCHAR(512),
  effective_start DATE,
  effective_end DATE,
  CONSTRAINT fk_nodes_law FOREIGN KEY (law_id) REFERENCES laws(id),
  CONSTRAINT fk_nodes_parent FOREIGN KEY (parent_id) REFERENCES law_nodes(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE laws ADD CONSTRAINT uk_laws_code UNIQUE (code);

