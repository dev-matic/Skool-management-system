import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Alert } from "./alert";
import { Button } from "./button";
import { Field, Input } from "./field";
import { STATUSES, type StatusKey } from "./status";
import { StatusChip } from "./status-chip";
import { Td, Th } from "./table";

const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("StatusChip", () => {
  it.each(Object.keys(STATUSES) as StatusKey[])("%s shows a word and a decorative icon", (key) => {
    const html = render(h(StatusChip, { status: key }));
    expect(html).toContain(`>${STATUSES[key].label}<`);
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it("uses the tone colours, never colour alone", () => {
    expect(render(h(StatusChip, { status: "owing" }))).toContain("text-danger");
    expect(render(h(StatusChip, { status: "paid" }))).toContain("text-success");
  });
});

describe("Button", () => {
  it("defaults to type=button so it never submits a form by accident", () => {
    expect(render(h(Button, null, "Cancel"))).toContain('type="button"');
  });

  it("when loading: disabled, busy, label kept", () => {
    const html = render(h(Button, { loading: true, variant: "primary" }, "Saving…"));
    expect(html).toContain("disabled");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Saving…");
  });
});

describe("Field", () => {
  it("links the label, hint and error to the input", () => {
    const html = render(
      h(Field, {
        id: "phone",
        label: "Phone",
        hint: "e.g. 024 123 4567",
        error: "Enter a Ghana number",
        children: h(Input, { name: "phone" }),
      }),
    );
    expect(html).toContain('for="phone"');
    expect(html).toContain('id="phone"');
    expect(html).toContain('aria-describedby="phone-hint phone-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('id="phone-error"');
  });

  it("marks optional fields in words", () => {
    const html = render(h(Field, { id: "n", label: "Notes", optional: true, children: h(Input) }));
    expect(html).toContain("(optional)");
    expect(html).not.toContain('aria-invalid="');
  });
});

describe("Alert", () => {
  it("announces danger alerts and passes extra props through", () => {
    // A non-literal object, as JSX would pass it: data-* attributes go through.
    const props = { tone: "danger" as const, "data-testid": "form-error" };
    const html = render(h(Alert, props, "Wrong password"));
    expect(html).toContain('role="alert"');
    expect(html).toContain('data-testid="form-error"');
  });

  it("uses a polite status role for other tones", () => {
    expect(render(h(Alert, { tone: "success" }, "Saved"))).toContain('role="status"');
  });
});

describe("Table cells", () => {
  it("numeric cells are right-aligned with tabular figures", () => {
    const html = render(
      h("table", null, h("tbody", null, h("tr", null, h(Td, { numeric: true }, "1,250.00")))),
    );
    expect(html).toContain("text-right");
    expect(html).toContain("tabular-nums");
  });

  it("sortable headers expose the sort to screen readers", () => {
    const html = render(
      h(
        "table",
        null,
        h(
          "thead",
          null,
          h("tr", null, h(Th, { sort: { direction: "ascending", href: "?sort=name" } }, "Name")),
        ),
      ),
    );
    expect(html).toContain('aria-sort="ascending"');
    expect(html).toContain('href="?sort=name"');
  });
});
