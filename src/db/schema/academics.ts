import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { STAGES } from "../../domain/levels";
import { user } from "./auth";
import { school } from "./tenancy";

/*
 * School setup (M2): academic years, terms, grade levels, classes and
 * subjects. Every table carries school_id and row-level security keeps
 * schools apart. Links between these tables include school_id in the foreign
 * key, so a row can never point at another school's data.
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

/** e.g. "2025/2026", running roughly September to July. */
export const academicYear = pgTable(
  "academic_year",
  {
    id: id(),
    schoolId: schoolId(),
    name: text("name").notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("academic_year_school_id_id_key").on(t.schoolId, t.id),
    unique("academic_year_school_name_key").on(t.schoolId, t.name),
    check("academic_year_name_format", sql`${t.name} ~ '^[0-9]{4}/[0-9]{4}$'`),
    check("academic_year_dates", sql`${t.endsOn} > ${t.startsOn}`),
  ],
);

/**
 * A term within an academic year. Three per year by default, but the number
 * is up to the school. Date rules (inside the year, no overlap) are checked
 * in src/domain/terms.ts before saving.
 */
export const term = pgTable(
  "term",
  {
    id: id(),
    schoolId: schoolId(),
    academicYearId: bigint("academic_year_id", { mode: "number" }).notNull(),
    number: smallint("number").notNull(),
    name: text("name").notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }).notNull(),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: "term_academic_year_fk",
      columns: [t.schoolId, t.academicYearId],
      foreignColumns: [academicYear.schoolId, academicYear.id],
    }),
    unique("term_school_id_id_key").on(t.schoolId, t.id),
    unique("term_year_number_key").on(t.academicYearId, t.number),
    check("term_number_range", sql`${t.number} BETWEEN 1 AND 6`),
    check("term_dates", sql`${t.endsOn} > ${t.startsOn}`),
  ],
);

export const stageEnum = pgEnum("stage", STAGES);

/** A level such as "KG 1", "Basic 4" or "JHS 2", named and ordered by the school. */
export const gradeLevel = pgTable(
  "grade_level",
  {
    id: id(),
    schoolId: schoolId(),
    name: text("name").notNull(),
    stage: stageEnum("stage").notNull(),
    sortOrder: integer("sort_order").notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("grade_level_school_id_id_key").on(t.schoolId, t.id),
    unique("grade_level_school_name_key").on(t.schoolId, t.name),
  ],
);

/** A class in one academic year, e.g. "JHS 2A" in 2025/2026. */
export const classGroup = pgTable(
  "class_group",
  {
    id: id(),
    schoolId: schoolId(),
    academicYearId: bigint("academic_year_id", { mode: "number" }).notNull(),
    gradeLevelId: bigint("grade_level_id", { mode: "number" }).notNull(),
    name: text("name").notNull(),
    // Must hold the teacher role in this school; checked by the service.
    classTeacherId: text("class_teacher_id").references(() => user.id),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: "class_group_academic_year_fk",
      columns: [t.schoolId, t.academicYearId],
      foreignColumns: [academicYear.schoolId, academicYear.id],
    }),
    foreignKey({
      name: "class_group_grade_level_fk",
      columns: [t.schoolId, t.gradeLevelId],
      foreignColumns: [gradeLevel.schoolId, gradeLevel.id],
    }),
    unique("class_group_school_id_id_key").on(t.schoolId, t.id),
    unique("class_group_year_name_key").on(t.academicYearId, t.name),
    index("class_group_teacher_idx").on(t.classTeacherId),
  ],
);

/** A subject the school teaches. Archived rather than deleted once in use. */
export const subject = pgTable(
  "subject",
  {
    id: id(),
    schoolId: schoolId(),
    name: text("name").notNull(),
    shortName: text("short_name"),
    isArchived: boolean("is_archived").notNull().default(false),
    ...timestamps(),
  },
  (t) => [
    unique("subject_school_id_id_key").on(t.schoolId, t.id),
    uniqueIndex("subject_school_name_key").on(t.schoolId, sql`lower(${t.name})`),
  ],
);

/**
 * A subject taken by a class, and who teaches it. One row per class and
 * subject, so a class subject has at most one teacher.
 */
export const classSubject = pgTable(
  "class_subject",
  {
    id: id(),
    schoolId: schoolId(),
    classGroupId: bigint("class_group_id", { mode: "number" }).notNull(),
    subjectId: bigint("subject_id", { mode: "number" }).notNull(),
    // Must hold the teacher role in this school; checked by the service.
    teacherId: text("teacher_id").references(() => user.id),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: "class_subject_class_group_fk",
      columns: [t.schoolId, t.classGroupId],
      foreignColumns: [classGroup.schoolId, classGroup.id],
    }),
    foreignKey({
      name: "class_subject_subject_fk",
      columns: [t.schoolId, t.subjectId],
      foreignColumns: [subject.schoolId, subject.id],
    }),
    unique("class_subject_class_subject_key").on(t.classGroupId, t.subjectId),
    index("class_subject_teacher_idx").on(t.teacherId),
  ],
);
