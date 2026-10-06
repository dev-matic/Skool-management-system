-- School setup tables: the app role gets read/write access, and row-level
-- security limits every row to the current school (see 0001_security.sql).
-- Policies fail closed: with no school in the request context, nothing is
-- visible or writable.
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "academic_year" TO skool_app;
--> statement-breakpoint
ALTER TABLE "academic_year" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY academic_year_school ON "academic_year" FOR ALL TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "term" TO skool_app;
--> statement-breakpoint
ALTER TABLE "term" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY term_school ON "term" FOR ALL TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "grade_level" TO skool_app;
--> statement-breakpoint
ALTER TABLE "grade_level" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY grade_level_school ON "grade_level" FOR ALL TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "class_group" TO skool_app;
--> statement-breakpoint
ALTER TABLE "class_group" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY class_group_school ON "class_group" FOR ALL TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "subject" TO skool_app;
--> statement-breakpoint
ALTER TABLE "subject" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY subject_school ON "subject" FOR ALL TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "class_subject" TO skool_app;
--> statement-breakpoint
ALTER TABLE "class_subject" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY class_subject_school ON "class_subject" FOR ALL TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
