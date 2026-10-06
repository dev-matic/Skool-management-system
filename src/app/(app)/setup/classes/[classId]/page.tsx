import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmAction, PageHeader, Panel } from "@/components/ui";
import { deleteClassAction } from "@/server/actions/classes";
import { getClass, listLevels, listTeachers } from "@/server/classes";
import { requireRole } from "@/server/tenant";
import { EditClassForm } from "../class-forms";

export const metadata: Metadata = { title: "Edit class" };

export default async function EditClassPage({ params }: { params: Promise<{ classId: string }> }) {
  const ctx = await requireRole("admin");
  const { classId } = await params;
  const cls = /^\d+$/.test(classId) ? await getClass(ctx, Number(classId)) : null;
  if (!cls) notFound();
  const [levels, teachers] = await Promise.all([listLevels(ctx), listTeachers(ctx)]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={`Edit ${cls.name}`} />
      <EditClassForm
        initial={{
          classId: cls.id,
          yearId: cls.academicYearId,
          name: cls.name,
          gradeLevelId: cls.gradeLevelId,
          classTeacherId: cls.classTeacherId,
        }}
        levels={levels.map((l) => ({ id: l.id, name: l.name }))}
        teachers={teachers.map((t) => ({ id: t.userId, name: t.name }))}
      />
      <Panel title="Delete class" className="max-w-lg">
        <ConfirmAction
          action={deleteClassAction}
          label="Delete class"
          question={`Delete ${cls.name} and its list of subjects? This cannot be undone.`}
          confirmLabel={`Delete ${cls.name}`}
          hidden={{ classId: cls.id, yearId: cls.academicYearId }}
        />
      </Panel>
    </div>
  );
}
