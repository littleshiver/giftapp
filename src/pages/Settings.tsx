import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Upload, Sparkles, Info } from "lucide-react";
import { Title } from "../components/UI";
import { Button, Field } from "../components/Primitives";
import { useApp } from "../state/AppState";
import { decode, downloadJson, exportBackup } from "../persistence/storage";
export function Settings() {
  const { data, commit, notify } = useApp(),
    [budget, setBudget] = useState(data.settings.birthdayBudget),
    file = useRef<HTMLInputElement>(null);
  return (
    <>
      <Title name="Settings" subtitle="Make Givvy yours." />
      <section className="data-card">
        <h2>Preferences</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            if (
              commit({
                ...data,
                settings: {
                  ...data.settings,
                  name: String(fd.get("name") || "").trim(),
                  birthdayBudget: budget,
                },
              })
            )
              notify("Preferences saved");
          }}
        >
          <Field label="Your name">
            <input
              className="control"
              name="name"
              defaultValue={data.settings.name || ""}
              maxLength={70}
            />
          </Field>
          <Field label="Default birthday budget (₽)">
            <input
              className="control"
              type="number"
              min="0"
              required
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </Field>
          <Button className="button-full">Save preferences</Button>
        </form>
      </section>
      <section className="data-card">
        <h2>Design & first-run flows</h2>
        <p>
          Explore the onboarding
          {import.meta.env.DEV
            ? " and the reusable UI component library."
            : ". Preview adds preferences only when you finish."}
        </p>
        <Link
          className="button-secondary button-full"
          style={{ marginTop: 14 }}
          to="/onboarding?preview=1"
        >
          <Sparkles size={16} />
          Preview onboarding
        </Link>
        {import.meta.env.DEV && (
          <Link
            className="button-outline button-full"
            style={{ marginTop: 10 }}
            to="/components"
          >
            <Info size={16} />
            Component library
          </Link>
        )}
      </section>
      <section className="data-card">
        <h2>Local data</h2>
        <p>
          Your data stays in this browser. Export before changing browsers or
          devices. Photos count toward browser storage limits.
        </p>
        <div className="button-row" style={{ marginTop: 14 }}>
          <Button variant="secondary" onClick={() => exportBackup(data)}>
            <Download size={16} />
            Export JSON
          </Button>
          <Button variant="secondary" onClick={() => file.current?.click()}>
            <Upload size={16} />
            Import JSON
          </Button>
        </div>
        <input
          ref={file}
          hidden
          type="file"
          accept="application/json"
          aria-label="Import backup"
          onChange={async (e) => {
            const input = e.currentTarget,
              f = input.files?.[0];
            if (!f) return;
            try {
              const next = decode(await f.text());
              if (
                !confirm(
                  "Replace current data with this backup? Export a backup first if needed.",
                )
              )
                return;
              if (commit(next, true)) {
                setBudget(next.settings.birthdayBudget);
                notify("Backup imported ✓");
              }
            } catch (err) {
              notify("Could not import backup: " + (err as Error).message);
            } finally {
              input.value = "";
            }
          }}
        />
        {data.migration && (
          <>
            <p style={{ marginTop: 14 }}>
              This backup includes the original pre-upgrade snapshot and
              per-item history. Previous browser storage keys remain untouched.
            </p>
            <Button
              variant="outline"
              style={{ marginTop: 10 }}
              onClick={() =>
                downloadJson(
                  JSON.stringify(data.migration!.original, null, 2),
                  "givvy-original-backup.json",
                )
              }
            >
              Export original data
            </Button>
          </>
        )}
      </section>
      <section className="data-card">
        <h2>Holiday preferences</h2>
        <div style={{ marginTop: 14 }}>
          {(["christmas", "hanukkah"] as const).map((key) => (
            <label key={key} className="checkline">
              <input
                type="checkbox"
                checked={data.settings[key] ?? false}
                onChange={(e) =>
                  commit({
                    ...data,
                    settings: { ...data.settings, [key]: e.target.checked },
                  })
                }
              />
              <span>
                {key === "christmas" ? "Christmas (Dec 25)" : "Hanukkah"}
              </span>
            </label>
          ))}
          <p className="section-note">
            Holiday preferences are retained. Add specific dates and recipients
            in Events; annual recurrence is not automatic.
          </p>
        </div>
      </section>
    </>
  );
}
