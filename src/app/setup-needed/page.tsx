import { Wrench } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Icon, cardClass, cx } from "@/components/ui";
import { configProblems } from "@/env";

export const metadata: Metadata = { title: "Not set up yet" };

/**
 * Shown instead of an error when this deployment is missing its settings.
 * Lists setting names only, never their values.
 */
export default async function SetupNeededPage() {
  await connection(); // read the settings at request time, not at build
  const problems = configProblems();
  if (problems.length === 0) redirect("/dashboard");
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-[8vh] pb-10">
      <Icon icon={Wrench} size="md" className="text-brand-strong" />
      <h1 className="text-title font-semibold">This site is not set up yet</h1>
      <p className="text-ink-secondary">
        The app is installed, but it needs its database and sign-in settings before anyone can use
        it. Whoever runs this site should add the settings below, then redeploy.
      </p>
      <section className={cx(cardClass, "p-4")} aria-labelledby="missing">
        <h2 id="missing" className="text-heading font-semibold">
          Settings to fix
        </h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          {problems.map((p) => {
            const [name, ...rest] = p.split(":");
            return (
              <li key={p}>
                <code className="font-semibold">{name}</code>
                {rest.length > 0 && (
                  <span className="text-ink-secondary">: {rest.join(":").trim()}</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <p className="text-label text-ink-secondary">
        Step-by-step instructions are in <code>docs/deploying.md</code> in the project&apos;s code.
      </p>
    </div>
  );
}
