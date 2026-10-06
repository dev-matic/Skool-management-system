-- Security foundation: restricted app role, tenant isolation (row-level
-- security) and an append-only audit log.
--
-- The app connects as "skool_app", which is NOT the table owner and cannot
-- bypass row-level security. Migrations and seeding run as the owner.
-- Every new table must GRANT only the privileges it needs and, if it holds
-- school data, ENABLE ROW LEVEL SECURITY with a school_id policy.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'skool_app') THEN
    -- Login and password are set outside migrations (see docker/initdb and docs).
    CREATE ROLE skool_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO skool_app;
--> statement-breakpoint

-- Current request context, set per transaction by the app (src/server/db-context.ts).
-- Returns NULL when unset, so every policy below fails closed.
CREATE FUNCTION app_current_school_id() RETURNS bigint
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.school_id', true), '')::bigint $$;
--> statement-breakpoint
CREATE FUNCTION app_current_user_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '') $$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_current_school_id(), app_current_user_id() TO skool_app;
--> statement-breakpoint

-- Auth tables are global (one login per person), so no row-level security.
GRANT SELECT, INSERT, UPDATE, DELETE ON "user", "session", "account", "verification" TO skool_app;
--> statement-breakpoint

-- school: readable if it is the current school or the user is a member;
-- only the current school can be updated. Creating schools is a platform
-- task done with the owner connection, so no INSERT/DELETE for the app.
GRANT SELECT, UPDATE ON "school" TO skool_app;
--> statement-breakpoint
ALTER TABLE "school" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY school_select ON "school" FOR SELECT TO skool_app
  USING (
    id = app_current_school_id()
    OR EXISTS (
      SELECT 1 FROM "membership" m
      WHERE m.school_id = "school".id
        AND m.user_id = app_current_user_id()
        AND m.is_active
    )
  );
--> statement-breakpoint
CREATE POLICY school_update ON "school" FOR UPDATE TO skool_app
  USING (id = app_current_school_id())
  WITH CHECK (id = app_current_school_id());
--> statement-breakpoint

-- membership: a user can see their own memberships in every school (to
-- choose a school), and everything within the current school.
GRANT SELECT, INSERT, UPDATE, DELETE ON "membership" TO skool_app;
--> statement-breakpoint
ALTER TABLE "membership" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY membership_select ON "membership" FOR SELECT TO skool_app
  USING (school_id = app_current_school_id() OR user_id = app_current_user_id());
--> statement-breakpoint
CREATE POLICY membership_insert ON "membership" FOR INSERT TO skool_app
  WITH CHECK (school_id = app_current_school_id());
--> statement-breakpoint
CREATE POLICY membership_update ON "membership" FOR UPDATE TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
--> statement-breakpoint
CREATE POLICY membership_delete ON "membership" FOR DELETE TO skool_app
  USING (school_id = app_current_school_id());
--> statement-breakpoint

-- audit_log: append-only. The app may read its school's entries and add new
-- ones; school-less entries (e.g. sign-in) may be added but not read back.
GRANT SELECT, INSERT ON "audit_log" TO skool_app;
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY audit_log_select ON "audit_log" FOR SELECT TO skool_app
  USING (school_id = app_current_school_id());
--> statement-breakpoint
CREATE POLICY audit_log_insert ON "audit_log" FOR INSERT TO skool_app
  WITH CHECK (school_id IS NULL OR school_id = app_current_school_id());
--> statement-breakpoint

-- The trigger also stops the owner role from editing history by accident.
CREATE FUNCTION audit_log_reject_change() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_reject_change();
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_reject_change();
--> statement-breakpoint

-- Identity columns need sequence access for INSERT.
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO skool_app;
