-- Seed: Admin User
-- Password: Admin@fixla123 (bcrypt hash, salt rounds 12)
INSERT INTO users (id, full_name, phone, email, password_hash, role, is_verified)
VALUES (
  uuid_generate_v4(),
  'Fixla Admin',
  '0000000000',
  'admin@fixla.my',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsCb3DaqG7b8p8kj5J3KoFGhkXXu',
  'admin',
  true
)
ON CONFLICT (phone) DO NOTHING;
