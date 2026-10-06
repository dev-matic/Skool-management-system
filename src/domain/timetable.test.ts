import { describe, expect, it } from "vitest";
import {
  findClashes,
  overlaps,
  parseTime,
  timeRange,
  toMinutes,
  validatePlan,
  type LessonSlot,
  type PeriodInput,
} from "./timetable";

describe("parseTime", () => {
  it("reads the ways times are typed and normalises them", () => {
    expect(parseTime("8:00")).toBe("08:00");
    expect(parseTime("08.40")).toBe("08:40");
    expect(parseTime(" 13:45 ")).toBe("13:45");
    expect(parseTime("07:30:00")).toBe("07:30");
  });

  it("refuses anything that is not a 24-hour time", () => {
    for (const bad of ["", "8", "24:00", "12:60", "8am", "8:5", "-1:00"]) {
      expect(parseTime(bad), bad).toBeNull();
    }
  });

  it("converts to minutes and ranges", () => {
    expect(toMinutes("08:40")).toBe(520);
    expect(timeRange("8:00", "08:40:00")).toBe("08:00–08:40");
    expect(() => toMinutes("later")).toThrow();
  });
});

describe("overlaps", () => {
  const r = (startsAt: string, endsAt: string) => ({ startsAt, endsAt });
  it("is true only when ranges share time; touching is fine", () => {
    expect(overlaps(r("08:00", "08:40"), r("08:30", "09:10"))).toBe(true);
    expect(overlaps(r("08:00", "09:00"), r("08:15", "08:30"))).toBe(true);
    expect(overlaps(r("08:00", "08:40"), r("08:40", "09:20"))).toBe(false);
    expect(overlaps(r("10:00", "10:30"), r("08:00", "08:40"))).toBe(false);
  });
});

describe("validatePlan", () => {
  const lesson = (name: string, startsAt: string, endsAt: string): PeriodInput => ({
    kind: "lesson",
    name,
    startsAt,
    endsAt,
  });
  const good = {
    name: "Main day",
    days: [1, 2, 3, 4, 5],
    periods: [
      lesson("Period 1", "08:00", "08:40"),
      lesson("Period 2", "08:40", "09:20"),
      { kind: "break" as const, name: "Break", startsAt: "09:20", endsAt: "09:50" },
      lesson("Period 3", "09:50", "10:30"),
    ],
  };

  it("accepts a normal day", () => {
    expect(validatePlan(good)).toEqual({});
  });

  it("needs a name, a day and a lesson", () => {
    expect(validatePlan({ name: " ", days: [], periods: [] })).toEqual({
      name: expect.any(String),
      days: expect.any(String),
      periods: "Add at least one lesson period.",
    });
    expect(validatePlan({ ...good, days: [0] }).days).toMatch(/Monday to Sunday/);
  });

  it("names the row with bad or overlapping times", () => {
    const errors = validatePlan({
      ...good,
      periods: [
        lesson("Period 1", "08:00", "08:40"),
        lesson("Period 2", "08:30", "09:10"),
        lesson("Period 3", "10:00", "09:00"),
        lesson("Period 4", "9", "10:00"),
        lesson("", "11:00", "11:40"),
      ],
    });
    expect(errors["period-1"]).toBe("Period 2 starts before Period 1 ends (08:40).");
    expect(errors["period-2"]).toBe("Period 3 must end after it starts.");
    expect(errors["period-3"]).toMatch(/Period 4: write times as 08:00/);
    expect(errors["period-4"]).toMatch(/Give this row a name/);
  });
});

describe("findClashes", () => {
  const slot = (over: Partial<LessonSlot>): LessonSlot => ({
    classId: 1,
    className: "JHS 1",
    subjectName: "Mathematics",
    teacherId: "t1",
    teacherName: "Kwabena Frimpong",
    roomId: null,
    roomName: null,
    day: 1,
    startsAt: "08:00",
    endsAt: "08:40",
    ...over,
  });

  it("finds a teacher booked in two classes at once, naming both", () => {
    const other = slot({ classId: 2, className: "JHS 2A", subjectName: "Science" });
    expect(findClashes([slot({})], [other])).toEqual([
      "Kwabena Frimpong is already teaching JHS 2A (Science) on Monday 08:00–08:40, so cannot teach JHS 1 Mathematics then.",
    ]);
  });

  it("finds clashes across day plans when times overlap", () => {
    const kg = slot({ classId: 3, className: "KG 2", startsAt: "08:20", endsAt: "08:50" });
    expect(findClashes([slot({})], [kg])).toHaveLength(1);
    const later = slot({ classId: 3, className: "KG 2", startsAt: "08:40", endsAt: "09:10" });
    expect(findClashes([slot({})], [later])).toEqual([]);
  });

  it("finds a double-booked room and a class with two lessons", () => {
    const lab = { roomId: 7, roomName: "Science lab" };
    const other = slot({ classId: 2, className: "JHS 2A", teacherId: "t2", ...lab });
    expect(findClashes([slot(lab)], [other])).toEqual([
      "Science lab is already booked for JHS 2A (Mathematics) on Monday 08:00–08:40.",
    ]);
    const sameClass = slot({ teacherId: "t2", subjectName: "English Language" });
    expect(findClashes([slot({})], [sameClass])).toEqual([
      "JHS 1 already has English Language on Monday 08:00–08:40.",
    ]);
  });

  it("checks the lessons being saved against each other too", () => {
    const a = slot({});
    const b = slot({ classId: 2, className: "JHS 2A" });
    expect(findClashes([a, b], [])).toHaveLength(1);
  });

  it("ignores other days, missing teachers and rooms", () => {
    expect(findClashes([slot({})], [slot({ classId: 2, day: 2 })])).toEqual([]);
    expect(
      findClashes([slot({ teacherId: null })], [slot({ classId: 2, teacherId: null })]),
    ).toEqual([]);
  });
});
