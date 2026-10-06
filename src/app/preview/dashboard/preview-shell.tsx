import {
  CalendarCheck,
  CalendarClock,
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  School,
  Search,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Icon, cx } from "@/components/ui";
import { PREVIEW_SCHOOL, PREVIEW_TERM } from "./data";

const MENU: { label: string; icon: LucideIcon; current?: boolean }[] = [
  { label: "Dashboard", icon: LayoutDashboard, current: true },
  { label: "Students", icon: Users },
  { label: "Attendance", icon: CalendarCheck },
  { label: "Timetable", icon: CalendarClock },
  { label: "Scores & reports", icon: ClipboardList },
  { label: "Fees & payments", icon: Wallet },
  { label: "Analytics", icon: ChartColumn },
  { label: "School setup", icon: School },
];

function SchoolMark() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-[0.625rem] bg-brand font-bold text-ink">
      DB
    </span>
  );
}

/** PROPOSED soft app frame: white sidebar and top bar on a tinted page. */
export function PreviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="pv min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-(--pv-line) bg-surface px-3 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex items-center gap-2.5 px-2">
          <SchoolMark />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-semibold">{PREVIEW_SCHOOL}</span>
            <span className="block text-caption text-ink-secondary">FAKE demo school</span>
          </span>
        </div>
        <nav aria-label="Main (preview)">
          <p className="px-2.5 pb-2 text-caption font-semibold tracking-wide text-ink-secondary uppercase">
            Menu
          </p>
          <ul className="flex flex-col gap-0.5">
            {MENU.map((item) => (
              <li key={item.label}>
                <span
                  aria-current={item.current ? "page" : undefined}
                  aria-disabled={item.current ? undefined : "true"}
                  title={item.current ? undefined : "Not linked in this preview"}
                  className={cx(
                    "flex min-h-9 items-center gap-2.5 rounded-[0.625rem] px-2.5 py-1.5 font-medium",
                    item.current ? "bg-brand-tint font-semibold text-ink" : "text-ink",
                  )}
                >
                  <Icon
                    icon={item.icon}
                    size="md"
                    className={item.current ? "text-brand-strong" : "text-ink-secondary"}
                  />
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-(--pv-line) bg-surface px-4 lg:px-6">
          <span className="lg:hidden">
            <SchoolMark />
          </span>
          <label className="relative hidden w-full max-w-sm md:block">
            <span className="sr-only">Search</span>
            <Icon
              icon={Search}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-secondary"
            />
            <input
              type="search"
              disabled
              placeholder="Search pupils and receipts (comes with Students)"
              className="h-9 w-full rounded-full border border-(--pv-line) bg-(--pv-page) pr-3 pl-9 text-base placeholder:text-ink-secondary disabled:cursor-not-allowed"
            />
          </label>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-brand-tint px-3 py-1 text-label font-semibold whitespace-nowrap sm:inline">
              {PREVIEW_TERM}
            </span>
            <span className="grid size-9 place-items-center rounded-full bg-(--pv-lilac) text-label font-bold text-(--pv-lilac-ink)">
              AM
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block font-semibold">Akosua Mensah</span>
              <span className="block text-caption text-ink-secondary">Admin</span>
            </span>
          </div>
        </header>
        <main id="main" className="px-4 py-5 lg:px-6">
          <div className="mx-auto max-w-[90rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
