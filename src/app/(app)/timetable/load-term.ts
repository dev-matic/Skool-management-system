import "server-only";
import { pickTerm } from "@/domain/timetable";
import { getCurrentTerm } from "@/server/academic-years";
import type { TenantContext } from "@/server/tenant";
import { listTerms } from "@/server/timetable";

/** All terms, the one this page shows, and today's date in the school. */
export async function loadTerm(ctx: TenantContext, requested: string | undefined) {
  const [terms, current] = await Promise.all([listTerms(ctx), getCurrentTerm(ctx)]);
  return { terms, term: pickTerm(terms, requested, current.today), today: current.today };
}
