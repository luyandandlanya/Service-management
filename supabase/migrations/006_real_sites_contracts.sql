-- ============================================================
-- 006_real_sites_contracts.sql
-- Real site/contract list (landscaping company, hospital clients).
-- Run after 005_remove_dummy_sites_contracts.sql.
-- ============================================================

INSERT INTO sites (name, client_name) VALUES
  ('Clairwood Hospital',              'Clairwood Hospital'),
  ('Ekuhlengeni Hospital',            'Ekuhlengeni Hospital'),
  ('King Dinuzulu Complex',           'King Dinuzulu Complex'),
  ('Ngwelezana Hospital & Clinics',   'Ngwelezana Hospital & Clinics'),
  ('Hillcrest Hospital',              'Hillcrest Hospital'),
  ('Pinetown Mortuary',               'Pinetown Mortuary');

INSERT INTO contracts (site_id, name, working_days)
SELECT id, 'Landscaping', 'mon-fri' FROM sites WHERE name = 'Clairwood Hospital'
UNION ALL
SELECT id, 'Landscaping', 'mon-fri' FROM sites WHERE name = 'Ekuhlengeni Hospital'
UNION ALL
SELECT id, 'Landscaping', 'mon-fri' FROM sites WHERE name = 'King Dinuzulu Complex'
UNION ALL
SELECT id, 'Landscaping', 'mon-fri' FROM sites WHERE name = 'Pinetown Mortuary'
UNION ALL
SELECT id, 'Landscaping',        'mon-fri' FROM sites WHERE name = 'Hillcrest Hospital'
UNION ALL
SELECT id, 'Pottering Services', 'mon-fri' FROM sites WHERE name = 'Hillcrest Hospital'
UNION ALL
SELECT id, 'Landscaping',        'mon-fri' FROM sites WHERE name = 'Ngwelezana Hospital & Clinics'
UNION ALL
SELECT id, 'Pottering Services', 'mon-fri' FROM sites WHERE name = 'Ngwelezana Hospital & Clinics'
UNION ALL
SELECT id, 'Cleaning',           'mon-fri' FROM sites WHERE name = 'Ngwelezana Hospital & Clinics';
