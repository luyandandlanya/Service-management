-- ============================================================
-- 007_fix_handle_new_user_search_path.sql
-- The auth admin API runs triggers with a search_path that doesn't
-- include "public", so the unqualified `profiles` reference in
-- handle_new_user() failed with "relation profiles does not exist"
-- whenever a user was created via Authentication > Add user.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
