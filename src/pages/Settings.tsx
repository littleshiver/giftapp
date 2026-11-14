import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../state/AppState";
import { decode, exportBackup } from "../persistence/storage";
export function Settings() {
  const { data, commit, notify } = useApp(),
    [budget, setBudget] = useState(data.settings.birthdayBudget),
    file = useRef<HTMLInputElement>(null);
  return (
    <>
      <Link className="back" to="/">
        ‹ Dashboard
      </Link>
      <h1 className="page-title" style={{ margin: "24px 0" }}>
        Settings
      </h1>
      <div className="card">
        <div className="sectionhead" style={{ margin: "0 0 8px" }}>
          <h2>Occasions</h2>
        </div>
        {(["christmas", "hanukkah"] as const).map((key) => (
          <label className="checkrow" key={key}>
            <span>
              {key === "christmas" ? "🎄 Christmas (Dec 25)" : "🕎 Hanukkah"}
            </span>
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
          </label>
        ))}
        <p className="fineprint">
          Hanukkah dates vary each year. When enabled, add an occasion with the
          date you observe.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (
              commit({
                ...data,
                settings: { ...data.settings, birthdayBudget: budget },
              })
            )
              notify("Preferences saved ✓");
          }}
        >
          <div className="field">
            <label htmlFor="birthday-default">
              Default birthday budget (RUB)
            </label>
            <input
              id="birthday-default"
              type="number"
              min="0"
              required
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </div>
          <button className="action alt">Save preferences</button>
        </form>
      </div>
      <div className="card">
        <h2 style={{ fontSize: 17 }}>Your data</h2>
        <p className="sub">
          Saved locally in this browser. Export a backup before switching
          browsers or devices.
        </p>
        <div className="backup-actions">
          <button className="action alt" onClick={() => exportBackup(data)}>
            Export JSON
          </button>
          <button className="action alt" onClick={() => file.current?.click()}>
            Import JSON
          </button>
          <input
            ref={file}
            aria-label="Import backup"
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const input = e.currentTarget,
                f = input.files?.[0];
              if (!f) return;
              try {
                const next = decode(await f.text());
                if (!confirm("Replace current data with this backup?")) return;
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
        </div>
      </div>
      <p className="fineprint">Givvy · Stage 1 · English UI · Light theme.</p>
    </>
  );
}
