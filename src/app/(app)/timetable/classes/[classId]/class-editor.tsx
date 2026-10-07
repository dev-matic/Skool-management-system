"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Alert, Button, Select, StatusChip, TINTS, cx, tintFor } from "@/components/ui";
import { DAY_NAMES, overlaps } from "@/domain/timetable";
import { saveClassTimetableAction, type FormState } from "@/server/actions/timetable";
import type { ClassTimetable, RoomRow } from "@/server/timetable";

type Cells = Record<string, { subjectId: string; roomId: string }>; // "periodId:day"

const fromLessons = (tt: ClassTimetable): Cells =>
  Object.fromEntries(
    tt.lessons.map((l) => [
      `${l.periodId}:${l.day}`,
      { subjectId: String(l.subjectId), roomId: l.roomId ? String(l.roomId) : "" },
    ]),
  );

const same = (
  a?: { subjectId: string; roomId: string },
  b?: { subjectId: string; roomId: string },
) => (a?.subjectId ?? "") === (b?.subjectId ?? "") && (a?.roomId ?? "") === (b?.roomId ?? "");

/**
 * The admin's weekly grid for one class: pick a subject in each cell with
 * the keyboard (Tab moves across the week); the teacher comes from the
 * class's subject assignments. Each menu marks teachers busy with another
 * class at that time, so clashes are visible before saving. Only changed
 * cells are sent; nothing is saved if any lesson would clash, and each clash
 * is named above the grid and on its cell. Rooms are hidden until needed.
 */
export function ClassEditor({
  timetable,
  rooms,
  today,
}: {
  timetable: ClassTimetable;
  rooms: RoomRow[];
  today: number | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveClassTimetableAction,
    {},
  );
  const formId = useId();
  const plan = timetable.plan!;
  const saved = fromLessons(timetable);
  const savedKey = JSON.stringify(saved);
  const [cells, setCells] = useState<Cells>(saved);
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (syncedKey !== savedKey) {
    setSyncedKey(savedKey);
    setCells(saved);
  }
  const changed = [...new Set([...Object.keys(saved), ...Object.keys(cells)])].filter(
    (k) => !same(saved[k], cells[k]),
  );
  const dirty = changed.length > 0;

  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  const [showRooms, setShowRooms] = useState(() => timetable.lessons.some((l) => l.roomId));
  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.errors?.form) alertRef.current?.focus();
  }, [state]);
  const clashCells = state.clashCells ?? {};

  /** Who else has a teacher or room at this cell's time: id -> class name. */
  const busyAt = (day: number, startsAt: string, endsAt: string) => {
    const teachers = new Map<string, string>();
    const roomsBooked = new Map<string, string>();
    for (const b of timetable.busy) {
      if (b.day !== day || !overlaps(b, { startsAt, endsAt })) continue;
      if (b.teacherId) teachers.set(b.teacherId, b.className);
      if (b.roomId) roomsBooked.set(String(b.roomId), b.className);
    }
    return { teachers, rooms: roomsBooked };
  };

  const subjectById = new Map(timetable.subjects.map((s) => [String(s.subjectId), s]));
  const lessonAt = new Map(timetable.lessons.map((l) => [`${l.periodId}:${l.day}`, l]));
  const activeRooms = rooms.filter((r) => !r.isArchived);
  const lessonCount = Object.values(cells).filter((c) => c.subjectId).length;
  const set = (key: string, change: Partial<{ subjectId: string; roomId: string }>) =>
    setCells((prev) => {
      const next = { subjectId: "", roomId: "", ...prev[key], ...change };
      if (!next.subjectId) next.roomId = "";
      return { ...prev, [key]: next };
    });

  const saveBar = (
    <div className="no-print flex flex-wrap items-center gap-3">
      <Button
        type="submit"
        form={formId}
        variant="primary"
        icon={Save}
        loading={pending}
        disabled={!dirty && !pending}
      >
        {pending ? "Saving…" : "Save timetable"}
      </Button>
      {dirty && <StatusChip status="unsaved" />}
      <span className="text-label text-ink-secondary" aria-live="polite">
        {lessonCount} lesson{lessonCount === 1 ? "" : "s"} a week
      </span>
      {activeRooms.length > 0 && (
        <label className="ml-auto flex items-center gap-2 text-label font-semibold">
          <input
            type="checkbox"
            className="size-4 pointer-coarse:size-5"
            checked={showRooms}
            onChange={(e) => setShowRooms(e.target.checked)}
          />
          Show rooms
        </label>
      )}
    </div>
  );

  return (
    <div
      className="flex flex-col gap-3"
      role="group"
      aria-label={`${timetable.className} timetable`}
    >
      <form id={formId} action={action} className="hidden">
        <input type="hidden" name="classId" value={timetable.classId} />
        <input type="hidden" name="termId" value={timetable.term.id} />
        {changed.map((k) => {
          const [periodId, day] = k.split(":");
          const c = cells[k];
          return (
            <input
              key={k}
              type="hidden"
              name={`cell-${periodId}-${day}`}
              value={c?.subjectId ? `${c.subjectId}:${c.roomId}` : ""}
            />
          );
        })}
      </form>
      {state.errors?.form && (
        <Alert ref={alertRef} tabIndex={-1} tone="danger" title={state.errors.form}>
          {state.clashes && state.clashes.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {state.clashes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      {state.ok && state.message && !dirty && <Alert tone="success">{state.message}</Alert>}
      {saveBar}

      <div className="relative overflow-x-auto rounded-panel border border-card-edge bg-surface shadow-card">
        <table className="w-full min-w-[56rem] table-fixed border-collapse">
          <caption className="sr-only">
            {timetable.className} timetable, {timetable.term.name}: choose a subject for each period
          </caption>
          <colgroup>
            <col className="w-28" />
            {plan.days.map((d) => (
              <col key={d} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                className="h-10 border-b border-divider bg-subtle px-3 text-left text-label font-semibold text-ink-secondary"
              >
                Period
              </th>
              {plan.days.map((d) => (
                <th
                  key={d}
                  scope="col"
                  aria-current={d === today ? "date" : undefined}
                  className={cx(
                    "h-10 border-b border-l border-divider px-2 text-left text-label font-semibold",
                    d === today ? "bg-brand-tint text-ink" : "bg-subtle text-ink-secondary",
                  )}
                >
                  {DAY_NAMES[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.periods.map((p) =>
              p.kind === "break" ? (
                <tr key={p.id}>
                  <th
                    scope="row"
                    className="border-b border-divider bg-subtle px-3 py-1.5 text-left text-label font-normal text-ink-secondary tabular-nums"
                  >
                    {p.startsAt}–{p.endsAt}
                  </th>
                  <td
                    colSpan={plan.days.length}
                    className="border-b border-l border-divider bg-subtle px-3 py-1.5 text-label font-semibold text-ink-secondary"
                  >
                    {p.name}
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <th scope="row" className="border-b border-divider px-3 py-2 text-left align-top">
                    <span className="block font-semibold">{p.name}</span>
                    <span className="block text-label font-normal text-ink-secondary tabular-nums">
                      {p.startsAt}–{p.endsAt}
                    </span>
                  </th>
                  {plan.days.map((d) => {
                    const key = `${p.id}:${d}`;
                    const cell = cells[key];
                    const subjectId = cell?.subjectId ?? "";
                    const subject = subjectById.get(subjectId);
                    const before = lessonAt.get(key);
                    // An unchanged lesson shows the teacher saved on it.
                    const teacher =
                      before && String(before.subjectId) === subjectId
                        ? before.teacherName
                        : (subject?.teacherName ?? null);
                    const isChanged = !same(saved[key], cell);
                    const name = `${timetable.className} ${DAY_NAMES[d]} ${p.name}`;
                    const busy = busyAt(d, p.startsAt, p.endsAt);
                    const busyClass = subject?.teacherId
                      ? busy.teachers.get(subject.teacherId)
                      : undefined;
                    const roomClash = cell?.roomId ? busy.rooms.get(cell.roomId) : undefined;
                    const clashes = clashCells[key];
                    return (
                      <td
                        key={d}
                        className={cx(
                          "border-b border-l border-divider p-1 align-top",
                          subjectId &&
                            TINTS[tintFor(subject?.name ?? before?.subjectName ?? "")].bg,
                          isChanged && "outline-2 -outline-offset-2 outline-warning",
                          clashes && "outline-2 -outline-offset-2 outline-danger",
                        )}
                      >
                        <Select
                          aria-label={`${name} subject`}
                          value={subjectId}
                          onChange={(e) => set(key, { subjectId: e.target.value })}
                          className={cx(
                            "h-8 bg-surface/90 text-label",
                            !subjectId && "text-ink-secondary",
                          )}
                        >
                          <option value="">Free</option>
                          {timetable.subjects.map((s) => {
                            const elsewhere = s.teacherId
                              ? busy.teachers.get(s.teacherId)
                              : undefined;
                            return (
                              <option key={s.subjectId} value={s.subjectId}>
                                {elsewhere
                                  ? `${s.name} · ${s.teacherName} busy (${elsewhere})`
                                  : s.name}
                              </option>
                            );
                          })}
                          {before && !subjectById.has(String(before.subjectId)) && (
                            <option value={before.subjectId}>
                              {before.subjectName} (no longer taken)
                            </option>
                          )}
                        </Select>
                        {subjectId && (
                          <span
                            className={cx(
                              "mt-1 block px-1 text-caption",
                              teacher ? "text-ink-secondary" : "font-semibold text-warning",
                            )}
                          >
                            {teacher ?? "No teacher assigned"}
                          </span>
                        )}
                        {busyClass && !clashes && (
                          <span className="mt-0.5 block px-1 text-caption font-semibold text-danger">
                            Busy with {busyClass} then
                          </span>
                        )}
                        {roomClash && !clashes && (
                          <span className="mt-0.5 block px-1 text-caption font-semibold text-danger">
                            Room booked by {roomClash}
                          </span>
                        )}
                        {clashes?.map((m) => (
                          <span
                            key={m}
                            className="mt-0.5 block px-1 text-caption font-semibold text-danger"
                          >
                            {m}
                          </span>
                        ))}
                        {subjectId && activeRooms.length > 0 && (showRooms || cell?.roomId) && (
                          <Select
                            aria-label={`${name} room`}
                            value={cell?.roomId ?? ""}
                            onChange={(e) => set(key, { roomId: e.target.value })}
                            className="mt-1 h-7 bg-surface/90 text-caption"
                          >
                            <option value="">No room</option>
                            {rooms
                              .filter((r) => !r.isArchived || String(r.id) === cell?.roomId)
                              .map((r) => {
                                const booked = busy.rooms.get(String(r.id));
                                return (
                                  <option key={r.id} value={r.id}>
                                    {booked ? `${r.name} · booked (${booked})` : r.name}
                                  </option>
                                );
                              })}
                          </Select>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <p className="text-label text-ink-secondary">
        Teachers come from{" "}
        <Link href="/setup/teachers" className="text-brand-strong underline">
          School setup › Teachers
        </Link>
        . Changed cells are outlined until you save; a teacher busy with another class at that time
        is marked in the menu.
      </p>
      {saveBar}
    </div>
  );
}
