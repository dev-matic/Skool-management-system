import { formatDate } from "@/domain/dates";

/**
 * Shown only on paper: school, title and date printed, on A4 landscape
 * (docs/design-system.md, Print).
 */
export function PrintHeader({
  schoolName,
  title,
  today,
}: {
  schoolName: string;
  title: string;
  today: string;
}) {
  return (
    <>
      <style>{"@media print { @page { size: A4 landscape; margin: 12mm; } }"}</style>
      <div className="hidden border-b border-black pb-2 print:block">
        <p className="text-label">{schoolName}</p>
        <p className="text-title font-semibold">{title}</p>
        <p className="text-caption">Printed {formatDate(today)}</p>
      </div>
    </>
  );
}
