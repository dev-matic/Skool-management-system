import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { classGroup, stageEnum, subject, term } from "./academics";
import { user } from "./auth";
import { school } from "./tenancy";

/*
 * Timetable (M3). Everything belongs to a term, so next term's timetable can
 * change without touching past terms. Links include school_id in the foreign
 * key, as in academics.ts. Clashes between different day plans (a teacher in
 * KG and JHS at overlapping times) are checked by the service, which locks
 * the term while saving.
 */

const id = () => bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity();
const schoolId = () =>
  bigint("school_id", { mode: "number" })
    .notNull()
    .references(() => school.id);
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A day plan for one term: which days the school opens and its periods and
 * breaks. Stages (KG, Primary, JHS) each use one day plan per term.
 */
export const bellSchedule = pgTable(
  "bell_schedule",
  {
    id: id(),
    schoolId: schoolId(),
    termId: bigint("term_id", { mode: "number" }).notNull(),
    name: text("name").notNull(),
    /** ISO weekdays the plan runs on: 1 Monday ... 7 Sunday. */
    days: smallint("days").array().notNull(),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: "bell_schedule_term_fk",
      columns: [t.schoolId, t.termId],
      foreignColumns: [term.schoolId, term.id],
    }),
    unique("bell_schedule_school_id_id_key").on(t.schoolId, t.id),
    unique("bell_schedule_school_term_id_key").on(t.schoolId, t.termId, t.id),
    uniqueIndex("bell_schedule_term_name_key").on(t.termId, sql`lower(${t.name})`),
    check(
      "bell_schedule_days_valid",
      sql`cardinality(${t.days}) >= 1 AND ${t.days} <@ ARRAY[1,2,3,4,5,6,7]::smallint[]`,
    ),
  ],
);

/** Which day plan a stage follows in a term. */
export const bellScheduleStage = pgTable(
  "bell_schedule_stage",
  {
    id: id(),
    schoolId: schoolId(),
    termId: bigint("term_id", { mode: "number" }).notNull(),
    stage: stageEnum("stage").notNull(),
    bellScheduleId: bigint("bell_schedule_id", { mode: "number" }).notNull(),
  },
  (t) => [
    // The day plan must belong to the same term.
    foreignKey({
      name: "bell_schedule_stage_schedule_fk",
      columns: [t.schoolId, t.termId, t.bellScheduleId],
      foreignColumns: [bellSchedule.schoolId, bellSchedule.termId, bellSchedule.id],
    }).onDelete("cascade"),
    unique("bell_schedule_stage_term_stage_key").on(t.termId, t.stage),
  ],
);

/** A lesson period or a break in a day plan, with its times. */
export const period = pgTable(
  "period",
  {
    id: id(),
    schoolId: schoolId(),
    bellScheduleId: bigint("bell_schedule_id", { mode: "number" }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    kind: text("kind", { enum: ["lesson", "break"] }).notNull(),
    name: text("name").notNull(),
    startsAt: time("starts_at").notNull(),
    endsAt: time("ends_at").notNull(),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: "period_bell_schedule_fk",
      columns: [t.schoolId, t.bellScheduleId],
      foreignColumns: [bellSchedule.schoolId, bellSchedule.id],
    }).onDelete("cascade"),
    unique("period_school_id_id_key").on(t.schoolId, t.id),
    index("period_bell_schedule_idx").on(t.bellScheduleId),
    check("period_kind_valid", sql`${t.kind} IN ('lesson', 'break')`),
    check("period_times", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

/** A room or space lessons can be held in (optional on a lesson). */
export const room = pgTable(
  "room",
  {
    id: id(),
    schoolId: schoolId(),
    name: text("name").notNull(),
    isArchived: boolean("is_archived").notNull().default(false),
    ...timestamps(),
  },
  (t) => [
    unique("room_school_id_id_key").on(t.schoolId, t.id),
    uniqueIndex("room_school_name_key").on(t.schoolId, sql`lower(${t.name})`),
  ],
);

/**
 * One lesson: a class has a subject with a teacher in a period on a day of a
 * term, optionally in a room. The subject and teacher are stored on the
 * lesson so the term keeps its history when assignments change later.
 */
export const timetableEntry = pgTable(
  "timetable_entry",
  {
    id: id(),
    schoolId: schoolId(),
    termId: bigint("term_id", { mode: "number" }).notNull(),
    classGroupId: bigint("class_group_id", { mode: "number" }).notNull(),
    periodId: bigint("period_id", { mode: "number" }).notNull(),
    /** ISO weekday: 1 Monday ... 7 Sunday. */
    day: smallint("day").notNull(),
    subjectId: bigint("subject_id", { mode: "number" }).notNull(),
    // Must hold the teacher role in this school; checked by the service.
    teacherId: text("teacher_id").references(() => user.id),
    roomId: bigint("room_id", { mode: "number" }),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: "timetable_entry_term_fk",
      columns: [t.schoolId, t.termId],
      foreignColumns: [term.schoolId, term.id],
    }),
    foreignKey({
      name: "timetable_entry_class_group_fk",
      columns: [t.schoolId, t.classGroupId],
      foreignColumns: [classGroup.schoolId, classGroup.id],
    }),
    foreignKey({
      name: "timetable_entry_period_fk",
      columns: [t.schoolId, t.periodId],
      foreignColumns: [period.schoolId, period.id],
    }),
    foreignKey({
      name: "timetable_entry_subject_fk",
      columns: [t.schoolId, t.subjectId],
      foreignColumns: [subject.schoolId, subject.id],
    }),
    foreignKey({
      name: "timetable_entry_room_fk",
      columns: [t.schoolId, t.roomId],
      foreignColumns: [room.schoolId, room.id],
    }),
    // A class has at most one lesson in a period on a day.
    unique("timetable_entry_class_slot_key").on(t.classGroupId, t.periodId, t.day),
    index("timetable_entry_term_teacher_idx").on(t.termId, t.teacherId),
    index("timetable_entry_term_room_idx").on(t.termId, t.roomId),
    check("timetable_entry_day_valid", sql`${t.day} BETWEEN 1 AND 7`),
  ],
);
