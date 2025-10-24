-- V2: indexes and fulltext
ALTER TABLE law_nodes
  ADD INDEX idx_nodes_law (law_id),
  ADD INDEX idx_nodes_parent (parent_id),
  ADD INDEX idx_nodes_level (level),
  ADD INDEX idx_nodes_sort (sort_key);

-- Fulltext index for content_text (MySQL/InnoDB 5.6+)
ALTER TABLE law_nodes ADD FULLTEXT ft_content (content_text);

