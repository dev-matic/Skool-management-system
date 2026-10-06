import type { Role } from "@/domain/roles";

export interface NavItem {
  label: string;
  href: string;
  roles: readonly Role[];
  /** Milestone that builds this area; null once it exists. */
  comingIn: string | null;
}

const ALL: readonly Role[] = ["admin", "bursar", "teacher", "parent", "student"];

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ALL, comingIn: null },
  { label: "School setup", href: "/setup", roles: ["admin"], comingIn: "M2" },
  { label: "Students", href: "/students", roles: ["admin", "teacher"], comingIn: "M3" },
  { label: "Attendance", href: "/attendance", roles: ["admin", "teacher"], comingIn: "M5" },
  { label: "Scores & reports", href: "/assessment", roles: ["admin", "teacher"], comingIn: "M7" },
  { label: "Fees & payments", href: "/fees", roles: ["admin", "bursar"], comingIn: "M9" },
  { label: "Audit log", href: "/audit", roles: ["admin"], comingIn: "later" },
];
