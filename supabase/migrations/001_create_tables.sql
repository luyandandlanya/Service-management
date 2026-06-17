-- ============================================================
-- 001_create_tables.sql
-- ============================================================

-- PROFILES
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name   TEXT,
  role        TEXT CHECK (role IN ('owner', 'supervisor')),
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- SITES
CREATE TABLE sites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  address      TEXT,
  client_name  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- CONTRACTS
CREATE TABLE contracts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id              UUID REFERENCES sites ON DELETE RESTRICT,
  supervisor_id        UUID REFERENCES profiles ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  working_days         TEXT DEFAULT 'mon-fri',
  pays_public_holidays BOOLEAN DEFAULT false,
  start_date           DATE,
  end_date             DATE,
  is_active            BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- PUBLIC HOLIDAYS
CREATE TABLE public_holidays (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date       DATE UNIQUE NOT NULL,
  name       TEXT NOT NULL
);

-- STAFF
CREATE TABLE staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  UUID REFERENCES contracts ON DELETE RESTRICT,
  name         TEXT NOT NULL,
  daily_rate   NUMERIC(10,2) NOT NULL,
  start_date   DATE NOT NULL,
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ATTENDANCE
CREATE TABLE attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      UUID REFERENCES staff ON DELETE CASCADE,
  day           DATE NOT NULL,
  absence_type  TEXT CHECK (absence_type IN ('unpaid', 'sick', 'authorized')),
  notes         TEXT,
  created_by    UUID REFERENCES profiles,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (staff_id, day)
);

-- SALARIES
CREATE TABLE salaries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id              UUID REFERENCES staff ON DELETE RESTRICT,
  month                 TEXT NOT NULL,
  working_days_in_month INT,
  days_absent_unpaid    INT DEFAULT 0,
  days_worked           INT,
  amount                NUMERIC(10,2),
  status                TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  approved_by           UUID REFERENCES profiles,
  approved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (staff_id, month)
);

-- ASSETS
CREATE TABLE assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT CHECK (category IN ('tool', 'machinery')),
  depletable  BOOLEAN DEFAULT false
);

-- ASSET LOCATIONS
CREATE TABLE asset_locations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     UUID REFERENCES assets ON DELETE RESTRICT,
  contract_id  UUID REFERENCES contracts ON DELETE RESTRICT,
  quantity     INT NOT NULL,
  condition    TEXT DEFAULT 'good' CHECK (condition IN ('good', 'worn', 'damaged')),
  moved_on     DATE NOT NULL,
  created_by   UUID REFERENCES profiles,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- CONSUMABLES
CREATE TABLE consumables (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  unit               TEXT NOT NULL,
  reorder_threshold  NUMERIC(10,2) DEFAULT 0
);

-- STOCK MOVEMENTS
CREATE TABLE stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumable_id   UUID REFERENCES consumables ON DELETE RESTRICT,
  contract_id     UUID REFERENCES contracts ON DELETE RESTRICT,
  type            TEXT CHECK (type IN ('delivered', 'used')),
  quantity        NUMERIC(10,2) NOT NULL,
  day             DATE NOT NULL,
  notes           TEXT,
  created_by      UUID REFERENCES profiles,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ISSUES
CREATE TABLE issues (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  UUID REFERENCES contracts ON DELETE RESTRICT,
  type         TEXT CHECK (type IN ('broken', 'low_stock', 'service')),
  subject      TEXT NOT NULL,
  description  TEXT,
  status       TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_by   UUID REFERENCES profiles,
  created_at   TIMESTAMPTZ DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

-- ============================================================
-- APP 2 — TRACKER
-- ============================================================

CREATE TABLE tracked_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id      UUID REFERENCES contracts ON DELETE SET NULL,
  type             TEXT CHECK (type IN ('tender', 'certification', 'document')),
  name             TEXT NOT NULL,
  institution      TEXT,
  notes            TEXT,
  effective_date   DATE,
  expiry_date      DATE NOT NULL,
  alert_lead_days  INT DEFAULT 30,
  next_alert_date  DATE,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active', 'snoozed', 'expired', 'renewed')),
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE extensions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_item_id   UUID REFERENCES tracked_items ON DELETE CASCADE,
  original_alert_date DATE,
  new_alert_date      DATE,
  reason              TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_item_id  UUID REFERENCES tracked_items ON DELETE CASCADE,
  scheduled_for    DATE NOT NULL,
  channel          TEXT DEFAULT 'email',
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged')),
  sent_at          TIMESTAMPTZ
);

CREATE TABLE document_files (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_item_id  UUID REFERENCES tracked_items ON DELETE CASCADE,
  filename         TEXT,
  storage_path     TEXT,
  uploaded_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-compute next_alert_date on tracked_items insert/update
CREATE OR REPLACE FUNCTION compute_next_alert_date()
RETURNS trigger AS $$
BEGIN
  NEW.next_alert_date := NEW.expiry_date - (NEW.alert_lead_days || ' days')::interval;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_next_alert_date
  BEFORE INSERT OR UPDATE ON tracked_items
  FOR EACH ROW EXECUTE FUNCTION compute_next_alert_date();
