-- Add staff_type to drive daily rate lookup
-- Values: team_member (R450/day), supervisor (R550/day), relief_staff (R350/day)
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS staff_type TEXT DEFAULT 'team_member'
    CHECK (staff_type IN ('team_member', 'supervisor', 'relief_staff'));
