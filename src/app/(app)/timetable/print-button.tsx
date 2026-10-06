"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button icon={Printer} onClick={() => window.print()} className="no-print">
      {label}
    </Button>
  );
}
