import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmAction, PageHeader, Panel } from "@/components/ui";
import { deleteSubjectAction } from "@/server/actions/subjects";
import { getSubject } from "@/server/subjects";
import { requireRole } from "@/server/tenant";
import { ArchiveSubjectForm, EditSubjectForm } from "../subject-forms";

export const metadata: Metadata = { title: "Edit subject" };

export default async function EditSubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const ctx = await requireRole("admin");
  const { subjectId } = await params;
  const s = /^\d+$/.test(subjectId) ? await getSubject(ctx, Number(subjectId)) : null;
  if (!s) notFound();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={`Edit ${s.name}`} />
      <EditSubjectForm initial={{ subjectId: s.id, name: s.name, shortName: s.shortName }} />
      <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
        <Panel title={s.isArchived ? "Archived" : "Archive"}>
          <ArchiveSubjectForm subjectId={s.id} archived={s.isArchived} />
        </Panel>
        <Panel title="Delete subject">
          <ConfirmAction
            action={deleteSubjectAction}
            label="Delete subject"
            question={`Delete ${s.name}? Only possible if no class takes it.`}
            confirmLabel={`Delete ${s.name}`}
            hidden={{ subjectId: s.id }}
          />
        </Panel>
      </div>
    </div>
  );
}
