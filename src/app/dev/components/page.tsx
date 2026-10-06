import { Plus, Printer } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Field,
  Input,
  PageHeader,
  Panel,
  STATUSES,
  StatusChip,
  Table,
  TBody,
  TableEmpty,
  TableError,
  TableLoadingRows,
  THead,
  Td,
  Th,
  Tr,
  type StatusKey,
} from "@/components/ui";
import { previewPagesEnabled } from "../preview-pages";

export const metadata: Metadata = { title: "Component reference" };

// FAKE sample data for the reference page only. Not a real school or pupil.
const SAMPLE_ROWS = [
  { name: "Ama Owusu (fake)", cls: "JHS 2", billed: "1,250.00", paid: "1,250.00", status: "paid" },
  {
    name: "Kofi Asante (fake)",
    cls: "JHS 2",
    billed: "1,250.00",
    paid: "480.00",
    status: "part-paid",
  },
  { name: "Efua Mensah (fake)", cls: "JHS 2", billed: "1,250.00", paid: "0.00", status: "owing" },
] as const;

/**
 * Every shared component on one page, for review against
 * docs/design-system.md. Development and Vercel previews only.
 */
export default function ComponentReferencePage() {
  if (!previewPagesEnabled()) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <PageHeader
        title="Component reference"
        description="Development only. All names and amounts are fake sample data."
        actions={
          <>
            <Button icon={Printer}>Print class list</Button>
            <Button variant="primary" icon={Plus}>
              Record payment
            </Button>
          </>
        }
      />

      <Panel title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">Primary</Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete payment</Button>
          <Button variant="primary" loading>
            Saving…
          </Button>
          <Button disabled>Disabled</Button>
          <Button size="compact">Compact</Button>
        </div>
      </Panel>

      <Panel title="Status chips and badges">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUSES) as StatusKey[]).map((key) => (
            <StatusChip key={key} status={key} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>JHS 2</Badge>
          <Badge>Boarding</Badge>
          <Badge>3 unreconciled</Badge>
        </div>
      </Panel>

      <Panel title="Form fields">
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <Field id="ref-name" label="Pupil name">
            <Input defaultValue="Ama Owusu (fake)" />
          </Field>
          <Field id="ref-phone" label="Parent phone" hint="Ghana number, e.g. 024 123 4567">
            <Input inputMode="tel" />
          </Field>
          <Field id="ref-score" label="Class score" error="Enter a score from 0 to 30">
            <Input defaultValue="34" inputMode="decimal" />
          </Field>
          <Field id="ref-notes" label="Notes" optional>
            <Input />
          </Field>
        </div>
      </Panel>

      <Panel title="Alerts">
        <div className="flex max-w-xl flex-col gap-2">
          <Alert tone="danger" title="There is a problem">
            Enter a phone number or email.
          </Alert>
          <Alert tone="success">Payment recorded.</Alert>
          <Alert tone="info">Mobile money payments are reconciled each evening.</Alert>
        </div>
      </Panel>

      <section className="flex flex-col gap-2">
        <h2 className="text-heading font-semibold">Table</h2>
        <Table caption="Fees for JHS 2, sample data">
          <THead>
            <tr>
              <Th sort={{ direction: "ascending", href: "?sort=name" }}>Pupil</Th>
              <Th>Class</Th>
              <Th numeric>Billed (GHS)</Th>
              <Th numeric>Paid (GHS)</Th>
              <Th>Status</Th>
            </tr>
          </THead>
          <TBody>
            {SAMPLE_ROWS.map((row, i) => (
              <Tr key={row.name} selected={i === 1}>
                <Td>{row.name}</Td>
                <Td>{row.cls}</Td>
                <Td numeric>{row.billed}</Td>
                <Td numeric>{row.paid}</Td>
                <Td>
                  <StatusChip status={row.status} />
                </Td>
              </Tr>
            ))}
            <Tr total>
              <Td>Total</Td>
              <Td />
              <Td numeric>3,750.00</Td>
              <Td numeric>1,730.00</Td>
              <Td />
            </Tr>
          </TBody>
        </Table>
        <div className="grid gap-4 lg:grid-cols-3">
          <Table caption="Loading example">
            <TBody>
              <TableLoadingRows columns={3} rows={3} />
            </TBody>
          </Table>
          <Table caption="Empty example">
            <TBody>
              <TableEmpty
                columns={3}
                message="No payments recorded this term."
                action={<Button variant="primary">Record payment</Button>}
              />
            </TBody>
          </Table>
          <Table caption="Error example">
            <TBody>
              <TableError
                columns={3}
                message="Payments could not be loaded."
                retryHref="/dev/components"
              />
            </TBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
