import { ROLE_LABELS } from "@/domain/roles";

/** Role choices on the staff forms, with what each role can do. */
export const ROLE_OPTIONS = [
  {
    value: "admin",
    label: ROLE_LABELS.admin,
    description: "Sets up the school, manages staff and sees everything.",
  },
  {
    value: "bursar",
    label: ROLE_LABELS.bursar,
    description: "Records fee payments, prints receipts and follows up arrears.",
  },
  {
    value: "teacher",
    label: ROLE_LABELS.teacher,
    description: "Takes attendance and enters scores for their classes.",
  },
] as const;
