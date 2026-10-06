import {
  Ban,
  Check,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CirclePlus,
  Clock,
  FileCheck,
  Hourglass,
  PencilLine,
  X,
  type LucideIcon,
} from "lucide-react";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusDefinition {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
}

/**
 * Every status the app shows, with its word, colour and icon
 * (docs/design-system.md, Status chip). Add new statuses here, not in screens.
 */
export const STATUSES = {
  // Fees
  paid: { label: "Paid", tone: "success", icon: CircleCheck },
  "part-paid": { label: "Part-paid", tone: "warning", icon: CircleDashed },
  owing: { label: "Owing", tone: "danger", icon: CircleAlert },
  overpaid: { label: "Overpaid", tone: "info", icon: CirclePlus },
  // Attendance
  present: { label: "Present", tone: "success", icon: Check },
  absent: { label: "Absent", tone: "danger", icon: X },
  late: { label: "Late", tone: "warning", icon: Clock },
  excused: { label: "Excused", tone: "neutral", icon: CircleMinus },
  // Records
  draft: { label: "Draft", tone: "neutral", icon: PencilLine },
  published: { label: "Published", tone: "success", icon: CircleCheck },
  withdrawn: { label: "Withdrawn", tone: "neutral", icon: Ban },
  // Payments
  recorded: { label: "Recorded", tone: "neutral", icon: FileCheck },
  "pending-reconciliation": { label: "Pending reconciliation", tone: "info", icon: Hourglass },
  reconciled: { label: "Reconciled", tone: "success", icon: CheckCheck },
  // Staff
  active: { label: "Active", tone: "success", icon: CircleCheck },
  deactivated: { label: "Deactivated", tone: "neutral", icon: Ban },
  // Data entry
  unsaved: { label: "Unsaved changes", tone: "warning", icon: CircleAlert },
} as const satisfies Record<string, StatusDefinition>;

export type StatusKey = keyof typeof STATUSES;

export const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  neutral: "bg-neutral-bg text-neutral",
};
