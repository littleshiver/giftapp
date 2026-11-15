import { useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { Title, StatusTag } from "../components/UI";
import { Button, Field, Sheet } from "../components/Primitives";
import { OccasionArt } from "../components/OccasionArt";
import type { Event } from "../domain/models";
const occasionExamples = [
  { name: "Birthday", kind: "birthday" },
  { name: "Wedding anniversary", kind: "other" },
  { name: "New Year", kind: "holiday" },
  { name: "Hanukkah", kind: "holiday" },
  { name: "Christmas", kind: "holiday" },
  { name: "Thanksgiving", kind: "holiday" },
  { name: "March 8", kind: "holiday" },
] as const;
const paletteNames = ["Peach", "Mint", "Rose", "Sky"] as const;
export function Components() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Title
        name="Component library"
        subtitle="Reference states and semantic tokens."
        back="/settings"
      />
      <section className="data-card">
        <h2>Color tokens</h2>
        <div className="palette">
          {[
            ["Ink", "--ink"],
            ["Blue", "--blue"],
            ["Sage", "--mint"],
            ["Butter", "--butter"],
            ["Rose", "--rose"],
          ].map(([name, token]) => (
            <div key={token}>
              <div className="swatch" style={{ background: `var(${token})` }} />
              <div className="swatch-label">{name}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="data-card">
        <h2>Occasion illustrations · 4 palettes × 7 event types</h2>
        <p>Approved glossy illustrations on white tiles. Each colorway is reused across all seven types.</p>
        {paletteNames.map((palette, paletteIndex) => (
          <div className="illustration-palette-row" key={palette}>
            <h3>{palette}</h3>
            <div className="illustration-palette-track">
              {occasionExamples.map(({ name, kind }) => (
                <div className="illustration-sample" key={name}>
                  <span className="illustration-sample-tile">
                    <OccasionArt
                      event={{
                        id: `example-${name}`,
                        name,
                        kind: kind as Event["kind"],
                        date: "2026-12-31",
                        people: [],
                        budgets: {},
                        enabled: true,
                      }}
                      paletteIndex={paletteIndex}
                    />
                  </span>
                  <small>{name}</small>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section className="data-card">
        <h2>Buttons · 43px min height</h2>
        <div className="layout-stack">
          <Button>
            <Plus size={16} />
            Primary action
          </Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="outline">
            Outlined action
            <ChevronRight size={16} />
          </Button>
          <Button disabled>Disabled action</Button>
        </div>
        <div className="contrast-test-surface">
          <div className="overline" style={{ marginBottom: 9 }}>On page gray</div>
          <div className="layout-stack">
            <Button variant="secondary">Secondary on gray</Button>
            <Button variant="outline">Outlined on gray</Button>
            <Button disabled>Disabled on gray</Button>
          </div>
        </div>
      </section>
      <section className="data-card">
        <h2>Compact fields</h2>
        <Field label="Text input">
          <input className="control" placeholder="A little thought…" />
        </Field>
        <div className="form-grid">
          <Field label="Amount">
            <input className="control" type="number" />
          </Field>
          <Field label="Date">
            <input className="control" type="date" />
          </Field>
        </div>
        <Field label="Selection">
          <select className="control">
            <option>Choose an option</option>
            <option>One</option>
            <option>Two</option>
          </select>
        </Field>
        <Field label="Short note">
          <textarea className="control textarea" />
        </Field>
      </section>
      <section className="data-card">
        <h2>Selection controls</h2>
        <label className="checkline">
          <input type="checkbox" defaultChecked />
          <span>Checked checkbox</span>
        </label>
        <label className="checkline">
          <input type="checkbox" />
          <span>Unchecked checkbox</span>
        </label>
        <label className="checkline">
          <input type="radio" name="sample-radio" defaultChecked />
          <span>Selected radio</span>
        </label>
        <label className="checkline">
          <input type="radio" name="sample-radio" />
          <span>Unselected radio</span>
        </label>
      </section>
      <section className="data-card">
        <h2>Status pills</h2>
        <div className="sample-cards">
          <div
            className="product-visual"
            style={{ height: 110, background: "var(--butter)" }}
          >
            <StatusTag status="to_buy" />
          </div>
          <div
            className="product-visual"
            style={{ height: 110, background: "var(--mint)" }}
          >
            <StatusTag status="bought" />
          </div>
        </div>
      </section>
      <section className="data-card">
        <h2>Bottom sheet</h2>
        <p>A local demonstration; it does not change saved data.</p>
        <Button
          className="button-full"
          style={{ marginTop: 12 }}
          onClick={() => setOpen(true)}
        >
          Open sample editor
        </Button>
      </section>
      {open && (
        <Sheet title="Sample sheet" onClose={() => setOpen(false)}>
          <Field label="Sample name">
            <input className="control" />
          </Field>
          <Button className="button-full" onClick={() => setOpen(false)}>
            Close sample
          </Button>
        </Sheet>
      )}
    </>
  );
}
