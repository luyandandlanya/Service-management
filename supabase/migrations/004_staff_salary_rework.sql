-- ============================================================
-- 004_staff_salary_rework.sql
-- Aligns staff pay model + salaries table with the real payroll
-- sheet format: staff have a GROSS monthly target; the day rate
-- is recalculated each month as gross_pay / working_days_in_month.
-- ============================================================

-- STAFF: split name into first/surname, replace daily_rate with monthly gross target
ALTER TABLE staff ADD COLUMN IF NOT EXISTS surname TEXT;
ALTER TABLE staff RENAME COLUMN daily_rate TO monthly_rate;

-- SALARIES: add columns to mirror the payroll sheet layout
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS gross_pay NUMERIC(10,2);
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS day_rate NUMERIC(10,2);
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS deductions NUMERIC(10,2) DEFAULT 0;

-- Allow a 'paid' status in addition to draft/approved
ALTER TABLE salaries DROP CONSTRAINT IF EXISTS salaries_status_check;
ALTER TABLE salaries ADD CONSTRAINT salaries_status_check
  CHECK (status IN ('draft', 'approved', 'paid'));
