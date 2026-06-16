-- ============================================================
-- 003_seed_data.sql
-- ============================================================

-- SITES
INSERT INTO sites (id, name, address, client_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Bara Hospital', 'Soweto, Johannesburg', 'Chris Hani Baragwanath Academic Hospital'),
  ('00000000-0000-0000-0000-000000000002', 'Chris Hani Baragwanath', 'Chris Hani Road, Soweto', 'CHBAH Facilities Management');

-- CONTRACTS (supervisor_id left NULL — assign via app)
INSERT INTO contracts (id, site_id, name, working_days, pays_public_holidays, start_date, is_active) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Bara Grounds Maintenance', 'mon-fri', false, '2025-01-01', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Bara Interior Cleaning', 'mon-sat', false, '2025-01-01', true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'CHBAH Landscaping', 'mon-fri', false, '2025-02-01', true)
ON CONFLICT DO NOTHING;

-- CONSUMABLES
INSERT INTO consumables (name, unit, reorder_threshold) VALUES
  ('Petrol',       'litres',  20),
  ('Two-stroke',   'litres',   5),
  ('Nylon',        'rolls',    2),
  ('Weed killer',  'litres',  10);

-- ASSETS
INSERT INTO assets (name, category, depletable) VALUES
  ('Chainsaw',     'machinery', false),
  ('Broom (ilala)','tool',      false),
  ('Rake',         'tool',      false),
  ('Scraper',      'tool',      false),
  ('Gloves',       'tool',      false);

-- SA PUBLIC HOLIDAYS 2026
INSERT INTO public_holidays (date, name) VALUES
  ('2026-01-01', 'New Year''s Day'),
  ('2026-03-21', 'Human Rights Day'),
  ('2026-04-03', 'Good Friday'),
  ('2026-04-06', 'Family Day'),
  ('2026-04-27', 'Freedom Day'),
  ('2026-05-01', 'Workers'' Day'),
  ('2026-06-16', 'Youth Day'),
  ('2026-08-09', 'National Women''s Day'),
  ('2026-08-10', 'Public Holiday (Women''s Day observed)'),
  ('2026-09-24', 'Heritage Day'),
  ('2026-12-16', 'Day of Reconciliation'),
  ('2026-12-25', 'Christmas Day'),
  ('2026-12-26', 'Day of Goodwill')
ON CONFLICT (date) DO NOTHING;
