import { hasAnyRole } from "@/domain/roles";
import { requireRole } from "@/server/tenant";
import { TimetableNav } from "./timetable-nav";

const ADMIN_SECTIONS = [
  { href: "/timetable", label: "Whole school" },
  { href: "/timetable/classes", label: "Classes" },
  { href: "/timetable/teachers", label: "Teachers" },
  { href: "/timetable/plans", label: "Day plans & rooms" },
];
const TEACHER_SECTIONS = [
  { href: "/timetable", label: "My timetable" },
  { href: "/timetable/classes", label: "My classes" },
];

/** Admins and teachers only. Each page checks access again for its data. */
export default async function TimetableLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRole("admin", "teacher");
  const items = hasAnyRole(ctx.roles, ["admin"]) ? ADMIN_SECTIONS : TEACHER_SECTIONS;
  return (
    <div className="flex flex-col gap-5">
      <TimetableNav items={items} />
      {children}
    </div>
  );
}
