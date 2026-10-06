"use client";

import {
  CalendarCheck,
  CalendarX,
  Check,
  ClipboardPen,
  Clock,
  HandCoins,
  Info,
  Smartphone,
  TriangleAlert,
  Wallet,
  type LucideIcon,
  CalendarClock,
  FileCheck,
  GraduationCap,
  Receipt,
  UserCog,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { FigureTile, Icon, Panel as Card, cx } from "@/components/ui";
import { formatDate } from "@/domain/dates";
import { Money, formatGHS, sumMoney } from "@/domain/money";
import {
  ARREARS_AGEING,
  ATTENDANCE_BY_WEEK,
  CLASSES,
  LARGEST_ARREARS,
  PAYMENTS_BY_METHOD,
  PENDING,
  PREVIEW_TODAY,
  RECEIPTS_TODAY,
  STAFF,
  UNASSIGNED_SUBJECTS,
  staffCounts,
  ageBucket,
  attendanceSummary,
  expectedFees,
  feeSummary,
  percentOf,
  type AgeBucket,
  type PendingItem,
} from "./data";

type Tint = "sky" | "mint" | "peach" | "lilac";

// Full class names so Tailwind can see them.
const TINT: Record<Tint, { bg: string; ink: string }> = {
  sky: { bg: "bg-tint-sky", ink: "text-tint-sky-ink" },
  mint: { bg: "bg-tint-mint", ink: "text-tint-mint-ink" },
  peach: { bg: "bg-tint-peach", ink: "text-tint-peach-ink" },
  lilac: { bg: "bg-tint-lilac", ink: "text-tint-lilac-ink" },
};
const TINT_ORDER: Tint[] = ["sky", "mint", "peach", "lilac"];

const QUICK_ACTIONS: { label: string; icon: LucideIcon }[] = [
  { label: "Add staff", icon: UserPlus },
  { label: "Add student", icon: GraduationCap },
  { label: "Record payment", icon: Receipt },
  { label: "Edit timetable", icon: CalendarClock },
  { label: "Publish results", icon: FileCheck },
];

const ROLE_NAMES = { admin: "Admin", bursar: "Bursar", teacher: "Teacher" } as const;

/** Percent with one decimal place, e.g. "75.0%". */
function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function Bar({
  percent,
  fill = "bg-brand-edge",
  track = "bg-brand-tint",
}: {
  percent: number;
  fill?: string;
  track?: string;
}) {
  return (
    <div aria-hidden="true" className={cx("h-2 w-full overflow-hidden rounded-full", track)}>
      <div
        className={cx("h-full rounded-full", fill)}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

const TH = "h-8 px-2 text-left text-label font-semibold whitespace-nowrap text-ink-secondary";
const TD = "h-9 border-t border-card-edge px-2 py-1.5 align-middle";

const AGE_STYLE: Record<AgeBucket, { label: string; chip: string }> = {
  "0-30": { label: "0–30 days", chip: "bg-tint-sky text-ink" },
  "31-60": { label: "31–60 days", chip: "bg-warning-bg text-warning" },
  "60+": { label: "Over 60 days", chip: "bg-danger-bg text-danger" },
};

const PENDING_STYLE: Record<PendingItem["kind"], { icon: LucideIcon; tint: Tint }> = {
  register: { icon: CalendarX, tint: "peach" },
  scores: { icon: ClipboardPen, tint: "lilac" },
  reconcile: { icon: Smartphone, tint: "sky" },
};

const METHOD_COLOURS = [
  "bg-brand-edge",
  "bg-tint-peach-ink",
  "bg-tint-lilac-ink",
  "bg-tint-mint-ink",
  "bg-neutral",
];

function AttendanceTrend() {
  const w = 320;
  const h = 170;
  const pad = { left: 40, right: 12, top: 22, bottom: 26 };
  const min = 90;
  const max = 100;
  const x = (i: number) =>
    pad.left + (i * (w - pad.left - pad.right)) / (ATTENDANCE_BY_WEEK.length - 1);
  const y = (rate: number) => pad.top + ((max - rate) * (h - pad.top - pad.bottom)) / (max - min);
  const points = ATTENDANCE_BY_WEEK.map((p, i) => `${x(i)},${y(p.rate)}`).join(" ");
  const summary = ATTENDANCE_BY_WEEK.map((p) => `${p.week} ${p.rate}%`).join(", ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      role="img"
      aria-label={`Attendance by week: ${summary}`}
    >
      {[90, 95, 100].map((tick) => (
        <g key={tick}>
          <line
            x1={pad.left}
            x2={w - pad.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke="var(--color-card-edge)"
          />
          <text
            x={pad.left - 6}
            y={y(tick) + 4}
            textAnchor="end"
            className="fill-ink-secondary text-[11px]"
          >
            {tick}%
          </text>
        </g>
      ))}
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-brand-edge)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {ATTENDANCE_BY_WEEK.map((p, i) => (
        <g key={p.week}>
          <circle
            cx={x(i)}
            cy={y(p.rate)}
            r={4}
            fill="white"
            stroke="var(--color-brand-edge)"
            strokeWidth={2}
          />
          <text
            x={x(i)}
            y={y(p.rate) - 9}
            textAnchor="middle"
            className="fill-ink text-[11px] font-semibold"
          >
            {p.rate}
          </text>
          <text x={x(i)} y={h - 6} textAnchor="middle" className="fill-ink-secondary text-[11px]">
            {p.week}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function PreviewDashboard() {
  const [classFilter, setClassFilter] = useState("all");
  const isAll = classFilter === "all";
  const classes = isAll ? CLASSES : CLASSES.filter((c) => c.name === classFilter);
  const fees = feeSummary(classes);
  const attendance = attendanceSummary(classes);
  const arrears = LARGEST_ARREARS.filter((a) => isAll || a.className === classFilter).sort((a, b) =>
    new Money(b.balance).comparedTo(new Money(a.balance)),
  );
  const pending = PENDING.filter((p) => isAll || p.className === classFilter);

  const methodTotal = sumMoney(PAYMENTS_BY_METHOD.map((p) => new Money(p.amount)));
  const momoTotal = sumMoney(
    PAYMENTS_BY_METHOD.filter((p) => p.group === "momo").map((p) => new Money(p.amount)),
  );
  const todayTotal = sumMoney(RECEIPTS_TODAY.map((r) => new Money(r.amount)));
  const staff = staffCounts(STAFF);
  const recentStaff = [...STAFF].sort((a, b) => b.addedOn.localeCompare(a.addedOn)).slice(0, 3);
  const lowestWeek = ATTENDANCE_BY_WEEK.reduce((low, w) => (w.rate < low.rate ? w : low));
  const allOutstanding = sumMoney(ARREARS_AGEING.map((b) => new Money(b.amount)));
  const wholeSchool = !isAll && (
    <span className="rounded-full bg-subtle px-2 py-0.5 text-caption font-semibold">
      Whole school
    </span>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label text-ink-secondary">
            Tuesday <span className="tabular-nums">{formatDate(PREVIEW_TODAY)}</span>
          </p>
          <h1 className="text-title font-bold">Good morning, Akosua</h1>
          <p className="text-ink-secondary">Here is what needs attention today.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-label font-semibold">
            Term
            <select className="h-9 rounded-control border border-input bg-surface px-2.5 text-base font-normal">
              <option>Term 1, 2026/2027</option>
              <option disabled>Term 2 (not started)</option>
              <option disabled>Term 3 (not started)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-label font-semibold">
            Class
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-9 min-w-36 rounded-control border border-input bg-surface px-2.5 text-base font-normal"
            >
              <option value="all">All classes</option>
              {CLASSES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-control border border-dashed border-input bg-surface px-3 py-2 text-label text-ink-secondary">
        <Icon icon={Info} className="mt-px shrink-0 text-brand-strong" />
        <span>
          <strong className="text-ink">Design preview with FAKE demo data.</strong> No real school,
          pupil or payment. Each figure links to its list further down this page; in the real
          dashboard it opens the pupils behind the number.
        </span>
      </p>

      <nav aria-label="Quick actions" className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-label font-semibold text-ink-secondary">Quick actions</span>
        {QUICK_ACTIONS.map((action, i) => (
          <span
            key={action.label}
            aria-disabled="true"
            title="Not linked in this preview"
            className={cx(
              "inline-flex min-h-9 items-center gap-2 rounded-control border px-3 py-1.5 font-semibold",
              i === 0
                ? "border-brand-edge bg-brand text-ink"
                : "border-card-edge bg-surface text-ink",
            )}
          >
            <Icon icon={action.icon} />
            {action.label}
          </span>
        ))}
      </nav>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FigureTile
          tint="sky"
          icon={CalendarCheck}
          label="Attendance today"
          value={attendance.rate === null ? "Not marked" : pct(attendance.rate)}
          detail={
            <>
              <strong>{attendance.absent}</strong> absent · <strong>{attendance.notMarked}</strong>{" "}
              {attendance.notMarked === 1 ? "register" : "registers"} not marked
            </>
          }
          href="#attendance"
          linkLabel="See classes"
        />
        <FigureTile
          tint="mint"
          icon={Wallet}
          label="Fees collected this term"
          value={formatGHS(fees.collected)}
          detail={
            <>
              <strong>{pct(fees.rate)}</strong> of {formatGHS(fees.expected)} expected
            </>
          }
          href="#fees"
          linkLabel="See by class"
        >
          <Bar percent={fees.rate} fill="bg-tint-mint-ink" track="bg-surface" />
        </FigureTile>
        <FigureTile
          tint="peach"
          icon={HandCoins}
          label="Still owed this term"
          value={formatGHS(fees.outstanding)}
          detail={
            <>
              <strong>{pct(percentOf(fees.outstanding, fees.expected))}</strong> of this term&apos;s
              fees
            </>
          }
          href="#arrears"
          linkLabel="See largest balances"
        />
        <FigureTile
          tint="lilac"
          icon={TriangleAlert}
          label="Needs attention"
          value={String(pending.length)}
          detail="Registers, scores and payments to check"
          href="#pending"
          linkLabel="See the list"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          id="fees"
          title="Fees collected by class"
          subtitle="Term 1 · collected against expected"
          className="lg:col-span-2"
        >
          <div className="relative overflow-x-auto">
            <table className="w-full border-collapse">
              <caption className="sr-only">Fees collected and expected per class</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Class
                  </th>
                  <th scope="col" className={cx(TH, "w-[35%]")}>
                    <span className="sr-only">Progress</span>
                  </th>
                  <th scope="col" className={cx(TH, "text-right")}>
                    Collected
                  </th>
                  <th scope="col" className={cx(TH, "text-right")}>
                    Expected
                  </th>
                  <th scope="col" className={cx(TH, "text-right")}>
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => {
                  const expected = expectedFees(c);
                  const collected = new Money(c.collected);
                  const rate = percentOf(collected, expected);
                  return (
                    <tr key={c.name} className="hover:bg-row-hover">
                      <th scope="row" className={cx(TD, "text-left font-medium whitespace-nowrap")}>
                        {c.name}
                      </th>
                      <td className={TD}>
                        <Bar percent={rate} />
                      </td>
                      <td className={cx(TD, "text-right whitespace-nowrap tabular-nums")}>
                        {formatGHS(collected)}
                      </td>
                      <td
                        className={cx(
                          TD,
                          "text-right whitespace-nowrap text-ink-secondary tabular-nums",
                        )}
                      >
                        {formatGHS(expected)}
                      </td>
                      <td className={cx(TD, "text-right font-semibold tabular-nums")}>
                        {pct(rate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {isAll && (
                <tfoot>
                  <tr className="font-semibold">
                    <th scope="row" className={cx(TD, "border-t-2 border-t-input text-left")}>
                      Total
                    </th>
                    <td className={cx(TD, "border-t-2 border-t-input")}>
                      <Bar percent={fees.rate} />
                    </td>
                    <td
                      className={cx(
                        TD,
                        "border-t-2 border-t-input text-right whitespace-nowrap tabular-nums",
                      )}
                    >
                      {formatGHS(fees.collected)}
                    </td>
                    <td
                      className={cx(
                        TD,
                        "border-t-2 border-t-input text-right whitespace-nowrap tabular-nums",
                      )}
                    >
                      {formatGHS(fees.expected)}
                    </td>
                    <td className={cx(TD, "border-t-2 border-t-input text-right tabular-nums")}>
                      {pct(fees.rate)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        <Card title="How fees were paid" subtitle="Term 1 so far" aside={wholeSchool}>
          <div aria-hidden="true" className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {PAYMENTS_BY_METHOD.map((p, i) => (
              <div
                key={p.method}
                className={METHOD_COLOURS[i]}
                style={{ width: `${percentOf(new Money(p.amount), methodTotal)}%` }}
              />
            ))}
          </div>
          <ul className="flex flex-col">
            {PAYMENTS_BY_METHOD.map((p, i) => (
              <li
                key={p.method}
                className="flex items-center gap-2 border-t border-card-edge py-1.5 first:border-t-0"
              >
                <span
                  aria-hidden="true"
                  className={cx("size-2.5 shrink-0 rounded-full", METHOD_COLOURS[i])}
                />
                <span className="flex-1">{p.method}</span>
                <span className="tabular-nums">{formatGHS(new Money(p.amount))}</span>
                <span className="w-12 text-right text-label font-semibold tabular-nums">
                  {pct(percentOf(new Money(p.amount), methodTotal))}
                </span>
              </li>
            ))}
          </ul>
          <p className="rounded-control bg-tint-sky px-3 py-2 text-label">
            Mobile money: <strong>{pct(percentOf(momoTotal, methodTotal))}</strong> of all payments
          </p>

          <h3 className="mt-1 font-semibold">
            Received today{" "}
            <span className="font-normal text-ink-secondary">
              · {RECEIPTS_TODAY.length} receipts, {formatGHS(todayTotal)}
            </span>
          </h3>
          <ul className="flex flex-col">
            {RECEIPTS_TODAY.map((r) => (
              <li
                key={r.receipt}
                className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-x-2 border-t border-card-edge py-1.5 first:border-t-0"
              >
                <span className="text-label text-ink-secondary tabular-nums">{r.time}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.pupil}</span>
                  <span className="block text-caption text-ink-secondary">
                    {r.className} · {r.method}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">
                    {formatGHS(new Money(r.amount))}
                  </span>
                  <span className="block text-caption text-ink-secondary">{r.receipt}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          id="attendance"
          title="Attendance today by class"
          subtitle={`Tuesday ${formatDate(PREVIEW_TODAY)}`}
          className="lg:col-span-2"
        >
          <div className="relative overflow-x-auto">
            <table className="w-full border-collapse">
              <caption className="sr-only">Attendance today per class</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Class
                  </th>
                  <th scope="col" className={TH}>
                    Class teacher
                  </th>
                  <th scope="col" className={cx(TH, "text-right")}>
                    Present
                  </th>
                  <th scope="col" className={cx(TH, "text-right")}>
                    Absent
                  </th>
                  <th scope="col" className={cx(TH, "w-[22%]")}>
                    Rate
                  </th>
                  <th scope="col" className={TH}>
                    Register
                  </th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => {
                  const marked = c.presentToday !== null;
                  const rate = marked
                    ? Math.round(((c.presentToday ?? 0) / c.enrolled) * 1000) / 10
                    : null;
                  return (
                    <tr key={c.name} className="hover:bg-row-hover">
                      <th scope="row" className={cx(TD, "text-left font-medium whitespace-nowrap")}>
                        {c.name}
                      </th>
                      <td className={cx(TD, "whitespace-nowrap")}>{c.classTeacher}</td>
                      <td className={cx(TD, "text-right tabular-nums")}>
                        {marked ? `${c.presentToday} / ${c.enrolled}` : "–"}
                      </td>
                      <td className={cx(TD, "text-right tabular-nums")}>
                        {marked ? c.enrolled - (c.presentToday ?? 0) : "–"}
                      </td>
                      <td className={TD}>
                        {rate !== null && (
                          <span className="flex items-center gap-2">
                            <Bar percent={rate} />
                            <span className="w-11 shrink-0 text-right text-label font-semibold tabular-nums">
                              {pct(rate)}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className={TD}>
                        <span
                          className={cx(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label font-semibold whitespace-nowrap",
                            marked ? "bg-success-bg text-success" : "bg-warning-bg text-warning",
                          )}
                        >
                          <Icon icon={marked ? Check : Clock} />
                          {marked ? "Marked" : "Not marked"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card id="pending" title="Needs attention" subtitle="Clear these today">
          {pending.length === 0 ? (
            <p className="py-6 text-center text-ink-secondary">Nothing waiting for this class.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((p) => {
                const style = PENDING_STYLE[p.kind];
                return (
                  <li
                    key={p.title}
                    className="flex items-start gap-3 rounded-control p-2 hover:bg-row-hover"
                  >
                    <span
                      className={cx(
                        "grid size-9 shrink-0 place-items-center rounded-control",
                        TINT[style.tint].bg,
                        TINT[style.tint].ink,
                      )}
                    >
                      <Icon icon={style.icon} size="md" />
                    </span>
                    <span>
                      <span className="block font-semibold">{p.title}</span>
                      <span className="block text-label text-ink-secondary">{p.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          id="arrears"
          title="Largest balances owed"
          subtitle="This term plus anything brought forward"
          className="lg:col-span-2"
        >
          <div className="grid gap-2 sm:grid-cols-3">
            {ARREARS_AGEING.map((b) => (
              <div
                key={b.bucket}
                className={cx("rounded-control px-3 py-2", AGE_STYLE[b.bucket].chip)}
              >
                <p className="text-label font-semibold">{AGE_STYLE[b.bucket].label}</p>
                <p className="text-heading font-bold text-ink tabular-nums">
                  {formatGHS(new Money(b.amount))}
                </p>
                <p className="text-label text-ink">{b.pupils} pupils</p>
              </div>
            ))}
          </div>
          <p className="text-label text-ink-secondary">
            All balances owed (whole school):{" "}
            <strong className="text-ink tabular-nums">{formatGHS(allOutstanding)}</strong>
          </p>
          <div className="relative overflow-x-auto">
            <table className="w-full border-collapse">
              <caption className="sr-only">Pupils with the largest balances</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Pupil
                  </th>
                  <th scope="col" className={TH}>
                    Class
                  </th>
                  <th scope="col" className={cx(TH, "text-right")}>
                    Balance
                  </th>
                  <th scope="col" className={TH}>
                    Overdue
                  </th>
                </tr>
              </thead>
              <tbody>
                {arrears.length === 0 && (
                  <tr>
                    <td colSpan={4} className={cx(TD, "py-6 text-center text-ink-secondary")}>
                      No large balances in this class.
                    </td>
                  </tr>
                )}
                {arrears.map((a, i) => {
                  const tint = TINT[TINT_ORDER[i % TINT_ORDER.length]!];
                  const bucket = ageBucket(a.daysOverdue);
                  return (
                    <tr key={a.pupil} className="hover:bg-row-hover">
                      <th scope="row" className={cx(TD, "text-left font-medium")}>
                        <span className="flex items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className={cx(
                              "grid size-8 shrink-0 place-items-center rounded-full text-caption font-bold",
                              tint.bg,
                              tint.ink,
                            )}
                          >
                            {initials(a.pupil)}
                          </span>
                          {a.pupil}
                        </span>
                      </th>
                      <td className={cx(TD, "whitespace-nowrap")}>{a.className}</td>
                      <td
                        className={cx(
                          TD,
                          "text-right font-semibold whitespace-nowrap tabular-nums",
                        )}
                      >
                        {formatGHS(new Money(a.balance))}
                      </td>
                      <td className={TD}>
                        <span
                          className={cx(
                            "inline-flex rounded-full px-2 py-0.5 text-label font-semibold whitespace-nowrap",
                            AGE_STYLE[bucket].chip,
                          )}
                        >
                          {a.daysOverdue} days
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card
            id="staff"
            title="Staff"
            subtitle="People who sign in"
            aside={
              <span className="inline-flex items-center gap-1.5 rounded-control border border-card-edge px-2.5 py-1 text-label font-semibold">
                <Icon icon={UserCog} />
                Manage staff
              </span>
            }
          >
            <dl className="grid grid-cols-3 gap-2">
              {(
                [
                  ["Teachers", staff.teachers, "sky"],
                  ["Bursar", staff.bursars, "mint"],
                  ["Admins", staff.admins, "lilac"],
                ] as const
              ).map(([label, value, tint]) => (
                <div key={label} className={cx("rounded-control px-3 py-2", TINT[tint].bg)}>
                  <dt className="text-label">{label}</dt>
                  <dd className="text-heading font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-label text-ink-secondary">
              {staff.people} people · {staff.multiRole} has two roles (admin and teacher)
            </p>
            <p className="flex items-start gap-2 rounded-control bg-warning-bg px-3 py-2 text-label text-warning">
              <Icon icon={TriangleAlert} className="mt-px shrink-0" />
              <span>
                <strong>{UNASSIGNED_SUBJECTS.length} subjects have no teacher:</strong>{" "}
                {UNASSIGNED_SUBJECTS.join(", ")}
              </span>
            </p>
            <h3 className="font-semibold">Recently added</h3>
            <ul className="flex flex-col">
              {recentStaff.map((person, i) => {
                const tint = TINT[TINT_ORDER[i % TINT_ORDER.length]!];
                return (
                  <li
                    key={person.name}
                    className="flex items-center gap-2.5 border-t border-card-edge py-1.5 first:border-t-0"
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        "grid size-8 shrink-0 place-items-center rounded-full text-caption font-bold",
                        tint.bg,
                        tint.ink,
                      )}
                    >
                      {initials(person.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{person.name}</span>
                      <span className="block text-caption text-ink-secondary">
                        {person.roles.map((r) => ROLE_NAMES[r]).join(", ")}
                      </span>
                    </span>
                    <span className="text-label text-ink-secondary tabular-nums">
                      {formatDate(person.addedOn)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Attendance this term" subtitle="Whole school, per week" aside={wholeSchool}>
            <AttendanceTrend />
            <p className="text-label text-ink-secondary">
              Lowest:{" "}
              <strong className="text-ink">
                {lowestWeek.week}, {pct(lowestWeek.rate)}
              </strong>
              . In the real dashboard, each week opens the pupils absent that week.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
