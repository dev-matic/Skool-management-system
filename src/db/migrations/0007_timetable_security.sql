-- Timetable tables: the app role gets read/write access, and row-level
-- security limits every row to the current school (see 0001_security.sql).
-- Who may edit (admins) and which timetables a teacher may read are checked
-- by the services, on top of this.
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "bell_schedule" TO skool_app;
--> statement-breakpoint
ALTER TABLE "bell_schedule" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY bell_schedule_school ON "bell_schedule" FOR ALL TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "bell_schedule_stage" TO skool_app;
--> statement-breakpoint
ALTER TABLE "bell_schedule_stage" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY bell_schedule_stage_school ON "bell_schedule_stage" FOR ALL TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "period" TO skool_app;
--> statement-breakpoint
ALTER TABLE "period" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY period_school ON "period" FOR ALL TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "room" TO skool_app;
--> statement-breakpoint
ALTER TABLE "room" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY room_school ON "room" FOR ALL TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "timetable_entry" TO skool_app;
--> statement-breakpoint
ALTER TABLE "timetable_entry" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY timetable_entry_school ON "timetable_entry" FOR ALL TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
