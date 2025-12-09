-- V4: add document type and related law reference for decrees
ALTER TABLE laws
  ADD COLUMN doc_type VARCHAR(32) NULL AFTER code,
  ADD COLUMN related_law_id BIGINT NULL AFTER unified_source,
  ADD INDEX idx_laws_doc_type (doc_type),
  ADD INDEX idx_laws_related (related_law_id),
  ADD CONSTRAINT fk_laws_related FOREIGN KEY (related_law_id) REFERENCES laws(id);

-- Default existing rows to LAW
UPDATE laws SET doc_type = COALESCE(doc_type, 'LAW');

