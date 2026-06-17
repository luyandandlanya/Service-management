-- ============================================================
-- 008_reset_sites_contracts.sql
-- Wipes ALL existing sites/contracts (and anything hanging off them)
-- and re-inserts exactly the real list below. Safe to re-run.
-- ============================================================

DELETE FROM salaries WHERE staff_id IN (
  SELECT id FROM staff WHERE contract_id IN (SELECT id FROM contracts)
);
DELETE FROM attendance WHERE staff_id IN (
  SELECT id FROM staff WHERE contract_id IN (SELECT id FROM contracts)
);
DELETE FROM staff WHERE contract_id IN (SELECT id FROM contracts);
DELETE FROM asset_locations WHERE contract_id IN (SELECT id FROM contracts);
DELETE FROM stock_movements WHERE contract_id IN (SELECT id FROM contracts);
DELETE FROM issues WHERE contract_id IN (SELECT id FROM contracts);
DELETE FROM tracked_items WHERE contract_id IN (SELECT id FROM contracts);

DELETE FROM contracts;
DELETE FROM sites;

INSERT INTO sites (name, client_name) VALUES
  ('Clairwood Hospital',            'Clairwood Hospital'),
  ('Ekuhlengeni Hospital',          'Ekuhlengeni Hospital'),
  ('King Dinuzulu Complex',         'King Dinuzulu Complex'),
  ('Ngwelezana Hospital & Clinics', 'Ngwelezana Hospital & Clinics'),
  ('Hillcrest Hospital',            'Hillcrest Hospital'),
  ('Pinetown Mortuary',             'Pinetown Mortuary');

INSERT INTO contracts (site_id, name, working_days)
SELECT id, 'Landscaping', 'mon-fri' FROM sites WHERE name = 'Clairwood Hospital'
UNION ALL
SELECT id, 'Landscaping', 'mon-fri' FROM sites WHERE name = 'Ekuhlengeni Hospital'
UNION ALL
SELECT id, 'Landscaping', 'mon-fri' FROM sites WHERE name = 'King Dinuzulu Complex'
UNION ALL
SELECT id, 'Landscaping', 'mon-fri' FROM sites WHERE name = 'Ngwelezana Hospital & Clinics'
UNION ALL
SELECT id, 'Pottering Services', 'mon-fri' FROM sites WHERE name = 'Ngwelezana Hospital & Clinics'
UNION ALL
SELECT id, 'Cleaning', 'mon-fri' FROM sites WHERE name = 'Ngwelezana Hospital & Clinics'
UNION ALL
SELECT id, 'Landscaping', 'mon-fri' FROM sites WHERE name = 'Hillcrest Hospital'
UNION ALL
SELECT id, 'Pottering Services', 'mon-fri' FROM sites WHERE name = 'Hillcrest Hospital'
UNION ALL
SELECT id, 'Landscaping', 'mon-fri' FROM sites WHERE name = 'Pinetown Mortuary';
