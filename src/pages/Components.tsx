import { useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { Title, StatusTag } from "../components/UI";
import { Button, Field, Sheet } from "../components/Primitives";
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
