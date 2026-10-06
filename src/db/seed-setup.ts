/**
 * FAKE school setup for the demo school: one academic year with three
 * terms, KG 1 to JHS 3, typical basic-school subjects and teacher
 * assignments. Used by `pnpm db:seed` only. Names, numbers and dates are
 * made up for demonstration and are not any real school's data.
 *
 * The academic year is the one containing today (Ghanaian years start in
 * September), so the demo always has a current term.
 */
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const { academicYear, classGroup, classSubject, gradeLevel, subject, term } = schema;

type Tx = Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0];
type Stage = (typeof schema.STAGES)[number];

const LEVELS: { name: string; stage: Stage }[] = [
  { name: "KG 1", stage: "kg" },
  { name: "KG 2", stage: "kg" },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ name: `Basic ${n}`, stage: "primary" as const })),
  ...[1, 2, 3].map((n) => ({ name: `JHS ${n}`, stage: "jhs" as const })),
];

// Typical subjects for each stage. Every school can rename or change these.
const SUBJECTS: Record<Stage, string[]> = {
  kg: ["Literacy", "Numeracy", "Our World Our People", "Creative Arts"],
  primary: [
    "English Language",
    "Mathematics",
    "Science",
    "Our World Our People",
    "Religious and Moral Education",
    "Ghanaian Language",
    "Creative Arts",
    "Physical Education",
  ],
  jhs: [
    "English Language",
    "Mathematics",
    "Integrated Science",
    "Social Studies",
    "Religious and Moral Education",
    "Ghanaian Language",
    "French",
    "Computing",
    "Career Technology",
    "Creative Arts and Design",
  ],
  shs: [],
};

/** Classes this year: one per level, except JHS 2 which has two streams. */
const CLASSES: { name: string; level: string; classTeacher: string }[] = [
  { name: "KG 1", level: "KG 1", classTeacher: "+233241000010" },
  { name: "KG 2", level: "KG 2", classTeacher: "+233241000011" },
  { name: "Basic 1", level: "Basic 1", classTeacher: "+233241000003" },
  { name: "Basic 2", level: "Basic 2", classTeacher: "+233241000012" },
  { name: "Basic 3", level: "Basic 3", classTeacher: "+233241000013" },
  { name: "Basic 4", level: "Basic 4", classTeacher: "+233241000014" },
  { name: "Basic 5", level: "Basic 5", classTeacher: "+233241000015" },
  { name: "Basic 6", level: "Basic 6", classTeacher: "+233241000016" },
  { name: "JHS 1", level: "JHS 1", classTeacher: "+233241000017" },
  { name: "JHS 2A", level: "JHS 2", classTeacher: "+233241000018" },
  { name: "JHS 2B", level: "JHS 2", classTeacher: "+233241000019" },
  { name: "JHS 3", level: "JHS 3", classTeacher: "+233241000006" },
];

/** JHS subject teachers (by phone); KG and Basic class teachers teach all subjects. */
const JHS_SUBJECT_TEACHERS: Record<string, string> = {
  "English Language": "+233241000018",
  Mathematics: "+233241000006",
  "Integrated Science": "+233241000019",
  "Social Studies": "+233241000017",
  "Religious and Moral Education": "+233241000017",
  "Ghanaian Language": "+233241000018",
  French: "+233241000019",
  Computing: "+233241000006",
  // Career Technology and Creative Arts and Design left unassigned on purpose,
  // so the assignment screen shows what still needs a teacher.
};

/** The academic year containing `today`, with three term windows (FAKE dates). */
export function demoCalendar(today: Date = new Date()) {
  const y = today.getUTCMonth() >= 8 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  const next = y + 1;
  return {
    year: { name: `${y}/${next}`, startsOn: `${y}-09-08`, endsOn: `${next}-07-23` },
    terms: [
      { number: 1, name: "Term 1", startsOn: `${y}-09-08`, endsOn: `${y}-12-11` },
      { number: 2, name: "Term 2", startsOn: `${next}-01-12`, endsOn: `${next}-04-09` },
      { number: 3, name: "Term 3", startsOn: `${next}-04-27`, endsOn: `${next}-07-23` },
    ],
  };
}

export async function seedDemoSetup(tx: Tx, schoolId: number, userIdByPhone: Map<string, string>) {
  const teacher = (phone: string) => {
    const id = userIdByPhone.get(phone);
    if (!id) throw new Error(`Demo teacher ${phone} is missing from the seed users.`);
    return id;
  };
  const calendar = demoCalendar();

  await tx
    .insert(academicYear)
    .values({ schoolId, ...calendar.year })
    .onConflictDoNothing();
  const [year] = await tx
    .select({ id: academicYear.id })
    .from(academicYear)
    .where(and(eq(academicYear.schoolId, schoolId), eq(academicYear.name, calendar.year.name)));
  await tx
    .insert(term)
    .values(calendar.terms.map((t) => ({ schoolId, academicYearId: year!.id, ...t })))
    .onConflictDoNothing();

  await tx
    .insert(gradeLevel)
    .values(LEVELS.map((l, i) => ({ schoolId, ...l, sortOrder: i + 1 })))
    .onConflictDoNothing();
  const levels = await tx.select().from(gradeLevel).where(eq(gradeLevel.schoolId, schoolId));
  const levelByName = new Map(levels.map((l) => [l.name, l]));

  const subjectNames = [...new Set(Object.values(SUBJECTS).flat())];
  await tx
    .insert(subject)
    .values(subjectNames.map((name) => ({ schoolId, name })))
    .onConflictDoNothing();
  const subjects = await tx.select().from(subject).where(eq(subject.schoolId, schoolId));
  const subjectByName = new Map(subjects.map((s) => [s.name, s]));

  await tx
    .insert(classGroup)
    .values(
      CLASSES.map((c) => ({
        schoolId,
        academicYearId: year!.id,
        gradeLevelId: levelByName.get(c.level)!.id,
        name: c.name,
        classTeacherId: teacher(c.classTeacher),
      })),
    )
    .onConflictDoNothing();
  const classes = await tx
    .select()
    .from(classGroup)
    .where(and(eq(classGroup.schoolId, schoolId), eq(classGroup.academicYearId, year!.id)));

  const rows = classes.flatMap((c) => {
    const def = CLASSES.find((d) => d.name === c.name)!;
    const stage = levelByName.get(def.level)!.stage;
    return SUBJECTS[stage].map((name) => ({
      schoolId,
      classGroupId: c.id,
      subjectId: subjectByName.get(name)!.id,
      teacherId:
        stage === "jhs"
          ? JHS_SUBJECT_TEACHERS[name]
            ? teacher(JHS_SUBJECT_TEACHERS[name])
            : null
          : teacher(def.classTeacher),
    }));
  });
  await tx.insert(classSubject).values(rows).onConflictDoNothing();
}
