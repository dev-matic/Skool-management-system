import { PHASE1_ROLES, type Role } from "@/domain/roles";

export type NavIcon =
  "dashboard" | "setup" | "students" | "attendance" | "assessment" | "fees" | "audit";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  roles: readonly Role[];
  /** Milestone that builds this area; null once it exists. */
  comingIn: string | null;
}

const ALL: readonly Role[] = PHASE1_ROLES;

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", roles: ALL, comingIn: null },
  { label: "School setup", href: "/setup", icon: "setup", roles: ["admin"], comingIn: null },
  {
    label: "Students",
    href: "/students",
    icon: "students",
    roles: ["admin", "teacher"],
    comingIn: "M3",
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: "attendance",
    roles: ["admin", "teacher"],
    comingIn: "M5",
  },
  {
    label: "Scores & reports",
    href: "/assessment",
    icon: "assessment",
    roles: ["admin", "teacher"],
    comingIn: "M7",
  },
  {
    label: "Fees & payments",
    href: "/fees",
    icon: "fees",
    roles: ["admin", "bursar"],
    comingIn: "M9",
  },
  { label: "Audit log", href: "/audit", icon: "audit", roles: ["admin"], comingIn: "later" },
];
