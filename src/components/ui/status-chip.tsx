import { cx } from "./cx";
import { Icon } from "./icon";
import { STATUSES, TONE_CLASSES, type StatusKey } from "./status";

/** A status shown as icon + word + colour, never colour alone. */
export function StatusChip({ status }: { status: StatusKey }) {
  const { label, tone, icon } = STATUSES[status];
  return (
    <span
      className={cx(
        "inline-flex h-[1.375rem] items-center gap-1 rounded-full px-2 text-caption font-semibold whitespace-nowrap",
        "print:border print:border-black print:bg-transparent print:text-black",
        TONE_CLASSES[tone],
      )}
    >
      <Icon icon={icon} className="print:hidden" />
      {label}
    </span>
  );
}
