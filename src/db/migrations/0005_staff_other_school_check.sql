-- Answers one question that row-level security otherwise hides: does a
-- person on the current school's staff also belong to another school?
-- Used to stop one school's admin resetting the password of someone who
-- also works elsewhere (src/server/staff.ts).
--
-- SECURITY DEFINER so it can look past row-level security, but it only
-- returns true/false, and only for people with a membership in the
-- current school; for anyone else it returns NULL.
CREATE FUNCTION app_user_in_other_school(target_user_id text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM membership
        WHERE user_id = target_user_id AND school_id = app_current_school_id()
      ) THEN NULL
      ELSE EXISTS (
        SELECT 1 FROM membership
        WHERE user_id = target_user_id
          AND school_id <> app_current_school_id()
          AND is_active
      )
    END
  $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_user_in_other_school(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_user_in_other_school(text) TO skool_app;
