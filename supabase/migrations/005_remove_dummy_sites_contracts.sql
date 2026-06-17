-- ============================================================
-- 005_remove_dummy_sites_contracts.sql
-- Removes placeholder sites/contracts seeded in 003_seed_data.sql.
-- Run this once the owner is ready to enter the real site/contract list.
-- Safe to run even if staff/attendance/etc. were never attached to
-- these dummy contracts.
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
