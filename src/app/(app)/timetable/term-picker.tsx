import { Button, Select } from "@/components/ui";
import type { TermChoice } from "@/server/timetable";

/** Chooses the term a timetable page shows (kept in the URL). */
export function TermPicker({
  terms,
  termId,
  keep = {},
}: {
  terms: TermChoice[];
  termId: number;
  /** Other query values to keep, e.g. a filter. */
  keep?: Record<string, string | undefined>;
}) {
  if (terms.length < 2) return null;
  return (
    <form method="get" className="no-print flex items-center gap-2">
      {Object.entries(keep).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <label htmlFor="term-choice" className="text-label font-semibold">
        Term
      </label>
      <Select id="term-choice" name="term" defaultValue={termId} className="w-48">
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}, {t.yearName}
          </option>
        ))}
      </Select>
      <Button type="submit" size="compact">
        Show
      </Button>
    </form>
  );
}
