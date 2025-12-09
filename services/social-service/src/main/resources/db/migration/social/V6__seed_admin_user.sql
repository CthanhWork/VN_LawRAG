-- Seed default admin account (idempotent)
INSERT INTO users (email, password_hash, display_name, status, roles)
VALUES (
  'admin@local',
  '$2b$10$HT/7PfejswBZ7S2eqU/pG.4DW4a648wqGxYBv/EZdmVHojCuWm.fO', -- bcrypt hash for Thanhabc123@@
  'System Admin',
  'ACTIVE',
  'ADMIN'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  display_name = VALUES(display_name),
  status = 'ACTIVE',
  roles = 'ADMIN';
