import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmAction, PageHeader, Panel } from "@/components/ui";
import { deleteLevelAction } from "@/server/actions/classes";
import { listLevels } from "@/server/classes";
import { requireRole } from "@/server/tenant";
import { EditLevelForm } from "../../class-forms";

export const metadata: Metadata = { title: "Edit level" };

export default async function EditLevelPage({ params }: { params: Promise<{ levelId: string }> }) {
  const ctx = await requireRole("admin");
  const { levelId } = await params;
  const level = (await listLevels(ctx)).find((l) => String(l.id) === levelId);
  if (!level) notFound();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={`Edit ${level.name}`} />
      <EditLevelForm initial={{ levelId: level.id, name: level.name, stage: level.stage }} />
      <Panel title="Delete level" className="max-w-lg">
        {level.classCount > 0 ? (
          <p className="text-ink-secondary">
            {level.name} has {level.classCount} class{level.classCount === 1 ? "" : "es"}, so it
            cannot be deleted. Move or delete its classes first.
          </p>
        ) : (
          <ConfirmAction
            action={deleteLevelAction}
            label="Delete level"
            question={`Delete ${level.name}?`}
            confirmLabel={`Delete ${level.name}`}
            hidden={{ levelId: level.id }}
          />
        )}
      </Panel>
    </div>
  );
}
