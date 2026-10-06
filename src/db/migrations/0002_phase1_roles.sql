-- Phase 1 has admin, bursar and teacher accounts only (CLAUDE.md). The
-- parent and student values stay in the "role" enum so a later phase can use
-- them without redesigning the database.
--
-- NOT VALID: new and changed rows are checked, but existing development
-- databases that still hold old demo parent/student memberships upgrade
-- cleanly. The app ignores those rows (src/server/tenant.ts).
ALTER TABLE "membership"
  ADD CONSTRAINT "membership_phase1_role"
  CHECK ("role" IN ('admin', 'bursar', 'teacher')) NOT VALID;
