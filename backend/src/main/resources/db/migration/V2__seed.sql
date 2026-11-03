-- Seed demo members + savings accounts.
-- Users are seeded at startup by DataSeeder (passwords must be BCrypt-hashed).

INSERT INTO members (member_number, full_name, nik, phone, email, address, join_date, status) VALUES
  ('M-0001', 'Siti Rahayu', '3201014501860001', '0812-0000-0001', 'siti@example.id', 'Jl. Melati No. 1, Bandung', '2024-01-15', 'ACTIVE'),
  ('M-0002', 'Budi Santoso', '3201011201900002', '0812-0000-0002', 'budi@example.id', 'Jl. Kenanga No. 2, Bandung', '2024-03-02', 'ACTIVE');

INSERT INTO savings_accounts (member_id, type, balance) VALUES
  (1, 'POKOK',    1000000.00),
  (1, 'WAJIB',     600000.00),
  (1, 'SUKARELA',  250000.00),
  (2, 'POKOK',    1000000.00),
  (2, 'WAJIB',     480000.00),
  (2, 'SUKARELA',   50000.00);
