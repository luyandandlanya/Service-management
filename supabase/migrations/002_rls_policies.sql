-- ============================================================
-- 002_rls_policies.sql
-- ============================================================

-- Helper: is current user an owner?
CREATE OR REPLACE FUNCTION is_owner()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_all" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- SITES (lookup — owner writes, all authenticated read)
-- ============================================================
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sites_read" ON sites
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sites_write" ON sites
  FOR ALL USING (is_owner());

-- ============================================================
-- CONTRACTS (lookup — owner writes, all authenticated read)
-- ============================================================
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_read" ON contracts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "contracts_write" ON contracts
  FOR ALL USING (is_owner());

-- ============================================================
-- PUBLIC HOLIDAYS (lookup — owner writes, all authenticated read)
-- ============================================================
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_holidays_read" ON public_holidays
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "public_holidays_write" ON public_holidays
  FOR ALL USING (is_owner());

-- ============================================================
-- ASSETS (lookup — owner writes, all authenticated read)
-- ============================================================
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets_read" ON assets
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "assets_write" ON assets
  FOR ALL USING (is_owner());

-- ============================================================
-- CONSUMABLES (lookup — owner writes, all authenticated read)
-- ============================================================
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consumables_read" ON consumables
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "consumables_write" ON consumables
  FOR ALL USING (is_owner());

-- ============================================================
-- STAFF
-- ============================================================
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_owner" ON staff
  FOR ALL USING (is_owner());

CREATE POLICY "staff_supervisor" ON staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = staff.contract_id
        AND contracts.supervisor_id = auth.uid()
    )
  );

-- ============================================================
-- ATTENDANCE
-- ============================================================
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_owner" ON attendance
  FOR ALL USING (is_owner());

CREATE POLICY "attendance_supervisor" ON attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN contracts c ON c.id = s.contract_id
      WHERE s.id = attendance.staff_id
        AND c.supervisor_id = auth.uid()
    )
  );

-- ============================================================
-- SALARIES
-- ============================================================
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salaries_owner" ON salaries
  FOR ALL USING (is_owner());

CREATE POLICY "salaries_supervisor" ON salaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN contracts c ON c.id = s.contract_id
      WHERE s.id = salaries.staff_id
        AND c.supervisor_id = auth.uid()
    )
  );

-- ============================================================
-- ASSET LOCATIONS
-- ============================================================
ALTER TABLE asset_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_locations_owner" ON asset_locations
  FOR ALL USING (is_owner());

CREATE POLICY "asset_locations_supervisor" ON asset_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = asset_locations.contract_id
        AND contracts.supervisor_id = auth.uid()
    )
  );

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_movements_owner" ON stock_movements
  FOR ALL USING (is_owner());

CREATE POLICY "stock_movements_supervisor" ON stock_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = stock_movements.contract_id
        AND contracts.supervisor_id = auth.uid()
    )
  );

-- ============================================================
-- ISSUES
-- ============================================================
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "issues_owner" ON issues
  FOR ALL USING (is_owner());

CREATE POLICY "issues_supervisor" ON issues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = issues.contract_id
        AND contracts.supervisor_id = auth.uid()
    )
  );

-- ============================================================
-- APP 2 — OWNER ONLY
-- ============================================================
ALTER TABLE tracked_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE extensions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_files  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracked_items_owner"  ON tracked_items  FOR ALL USING (is_owner());
CREATE POLICY "extensions_owner"     ON extensions     FOR ALL USING (is_owner());
CREATE POLICY "alerts_owner"         ON alerts         FOR ALL USING (is_owner());
CREATE POLICY "document_files_owner" ON document_files FOR ALL USING (is_owner());
