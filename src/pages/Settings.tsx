import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Upload, Sparkles, Info, UserRound } from "lucide-react";
import { Title } from "../components/UI";
import { Button, Field } from "../components/Primitives";
import { useApp } from "../state/AppState";
import { useAuth } from "../auth/AuthContext";
import { decode, downloadJson, exportBackup } from "../persistence/storage";
import { analyticsAvailable, setConsent } from "../analytics/analytics";
import { useAnalyticsConsent } from "../analytics/AnalyticsTracker";
export function Settings() {
  const { data, personalData, previewMode, setPreviewMode, commit, notify, syncStatus } = useApp(),
    [budget, setBudget] = useState(data.settings.birthdayBudget),
    file = useRef<HTMLInputElement>(null),
    auth = useAuth(),
    analyticsConsent = useAnalyticsConsent();
  useEffect(() => {
    setBudget(data.settings.birthdayBudget);
  }, [previewMode]);
  return (
    <>
      <Title name="Settings" subtitle="Make Givvy yours." />
      {auth.status !== "disabled" && (
        <section className="data-card">
          <h2>Account</h2>
          <p>
            {auth.status === "signed-in"
              ? `Signed in as ${auth.user?.email || auth.user?.displayName || "you"}. ${
                  syncStatus === "error"
                    ? "Couldn't reach your account — changes are kept and will sync."
                    : syncStatus === "loading" || syncStatus === "saving"
                      ? "Syncing…"
                      : "Everything is saved to your account."
                }`
              : "You're using Givvy as a guest. Sign in to keep your lists safe — everything you've added stays."}
          </p>
          <Link data-ph="settings-account" className="button-secondary button-full" style={{ marginTop: 14 }} to="/account">
            <UserRound size={16} />
            {auth.status === "signed-in" ? "Manage account" : "Sign in or create account"}
          </Link>
        </section>
      )}
      <section className="data-card">
        <h2>Preview content</h2>
        <p>
          Explore the design with no entries or ten sample people, photographs
          and gifts. Preview changes are temporary and never overwrite your data.
        </p>
        <div className="preview-mode-options preview-demo-switch" role="group" aria-label="Demo content">
          {([
            ["empty", "Empty"],
            ["filled", "Filled"],
          ] as const).map(([mode, label]) => (
            <button data-ph={`settings-preview-${mode}`}
              key={mode}
              type="button"
              className={`preview-mode-button ${previewMode === mode ? "is-active" : ""}`}
              aria-pressed={previewMode === mode}
              onClick={() => setPreviewMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>
        <button data-ph="settings-preview-my-data" className="preview-return-personal" type="button"
          aria-pressed={previewMode === "my"}
          onClick={() => setPreviewMode("my")}>
          {previewMode === "my" ? "Viewing my data" : "Return to my data"}
        </button>
        <p className="section-note">
          {previewMode === "my"
            ? "You're looking at your own saved content."
            : previewMode === "empty"
              ? "Empty preview: no people, events, gifts or ideas. Changes are temporary."
              : "Filled preview: sample people, celebrations and gifts. Changes are temporary."}
        </p>
      </section>
      <section className="data-card">
        <h2>Preferences</h2>
        <form
          key={previewMode}
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
              notify(previewMode === "my" ? "Preferences saved" : "Preview preferences changed");
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
          <Button data-ph="settings-save-preferences" className="button-full">Save preferences</Button>
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
        <Link data-ph="settings-preview-onboarding"
          className="button-secondary button-full"
          style={{ marginTop: 14 }}
          to="/onboarding?preview=1"
        >
          <Sparkles size={16} />
          Preview onboarding
        </Link>
        {import.meta.env.DEV && (
          <Link data-ph="settings-component-library"
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
        <h2>{auth.status === "signed-in" ? "Backup" : "Local data"}</h2>
        <p>
          {auth.status === "signed-in"
            ? "Your data is saved to your account and available on any device. You can still export a JSON copy. Preview content is never included."
            : "Your real data stays in this browser. Export before changing browsers or devices. Preview content is never included in your backup."}
        </p>
        <div className="button-row" style={{ marginTop: 14 }}>
          <Button data-ph="settings-export-json" variant="secondary" onClick={() => exportBackup(personalData)}>
            <Download size={16} />
            Export JSON
          </Button>
          <Button data-ph="settings-import-json" variant="secondary" disabled={previewMode !== "my"} onClick={() => file.current?.click()}>
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
        {personalData.migration && (
          <>
            <p style={{ marginTop: 14 }}>
              This backup includes the original pre-upgrade snapshot and
              per-item history. Previous browser storage keys remain untouched.
            </p>
            <Button data-ph="settings-export-original"
              variant="outline"
              style={{ marginTop: 10 }}
              onClick={() =>
                downloadJson(
                  JSON.stringify(personalData.migration!.original, null, 2),
                  "givvy-original-backup.json",
                )
              }
            >
              Export original data
            </Button>
          </>
        )}
      </section>
      {analyticsAvailable && (
        <section className="data-card">
          <h2>Privacy</h2>
          <label className="checkline" style={{ marginTop: 14 }}>
            <input
              type="checkbox"
              checked={analyticsConsent === "granted"}
              onChange={(e) => setConsent(e.target.checked ? "granted" : "denied")}
            />
            <span>Share anonymous usage stats</span>
          </label>
          <p className="section-note">
            Helps us see which screens and buttons are used. Names, dates,
            notes and anything you type are never recorded.
          </p>
        </section>
      )}
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
