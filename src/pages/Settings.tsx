import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Upload, Sparkles, Info, UserRound, LogIn, UserPlus, Globe2, Wallet, ShieldCheck, CalendarDays, ChevronRight, Code2, Database } from "lucide-react";
import { Title } from "../components/UI";
import { Button, Field } from "../components/Primitives";
import { useApp } from "../state/AppState";
import { useAuth } from "../auth/AuthContext";
import { decode, downloadJson, exportBackup } from "../persistence/storage";
import { analyticsAvailable, setConsent } from "../analytics/analytics";
import { useAnalyticsConsent } from "../analytics/AnalyticsTracker";
import { currencyUnit, supportedCurrencies, t } from "../utils/format";
const developerOpenKey = "givvy_developer_tools_open";
export function Settings() {
  const { data, personalData, previewMode, setPreviewMode, commit, notify, syncStatus, budgetsEnabled, setBudgetsEnabled } = useApp();
  const [budget, setBudget] = useState(data.settings.birthdayBudget);
  const [occasionBudget, setOccasionBudget] = useState(data.settings.occasionBudget ?? data.settings.birthdayBudget);
  const [developerOpen, setDeveloperOpen] = useState(() => {
    try { return sessionStorage.getItem(developerOpenKey) === "1"; } catch { return false; }
  });
  const file = useRef<HTMLInputElement>(null), auth=useAuth(), analyticsConsent=useAnalyticsConsent();
  useEffect(() => {
    setBudget(data.settings.birthdayBudget);
    setOccasionBudget(data.settings.occasionBudget ?? data.settings.birthdayBudget);
  }, [previewMode, data.settings.birthdayBudget, data.settings.occasionBudget]);
  const updateSettings = (patch: Partial<typeof data.settings>) => commit({...data,settings:{...data.settings,...patch}});
  const changeCurrency = (code: string) => {
    if (code === (data.settings.currency || "RUB")) return;
    if ((data.gifts.length || data.ideas.length || data.events.some(e=>Object.keys(e.budgets).length)) &&
        !confirm(t("Change the currency for all recorded amounts? Numbers stay the same; no exchange-rate conversion is applied.","Изменить валюту всех записанных сумм? Числа останутся прежними, автоматической конвертации не будет."))) return;
    if (updateSettings({currency:code})) notify(t("Currency updated","Валюта изменена"));
  };
  return <div className="settings-page">
      <Title name={t("Settings","Настройки")} />
      {previewMode !== "my" && <div className="settings-preview-banner" role="status">
        <span>{t("Preview data — changes are temporary","Тестовые данные — изменения временные")}</span>
        <button type="button" onClick={()=>setPreviewMode("my")}>{t("Return to personal data","К своим данным")}</button>
      </div>}
      {!budgetsEnabled && <div className="settings-preview-banner" role="status">
        <span>{t("Budget-free preview is on","Режим без бюджетов включён")}</span>
        <button type="button" onClick={()=>setBudgetsEnabled(true)}>{t("Restore budgets","Вернуть бюджеты")}</button>
      </div>}
      <section className="settings-card settings-account-card">
        <h2 className="settings-section-heading"><UserRound size={20}/>{t("Account","Аккаунт")}</h2>
        <div className="settings-account-identity">
          <span className="settings-account-avatar"><UserRound size={27}/></span>
          <div><strong>{auth.user?.displayName || data.settings.name || t("Your account","Ваш аккаунт")}</strong>
            <small>{auth.user?.email || t("Signed in","Вход выполнен")}</small></div>
        </div>
        {<Link data-ph="settings-account" className="settings-row settings-account-link" to="/account">
          <span><strong>{t("Manage account","Управление аккаунтом")}</strong>
            <small>{syncStatus==="error" ? t("Sync unavailable — changes kept locally","Нет синхронизации — изменения сохранены локально") : syncStatus==="saving" || syncStatus==="loading" ? t("Syncing…","Синхронизация…") : t("Saved to your account","Сохранено в аккаунте")}</small>
          </span><ChevronRight size={19}/>
        </Link>}
        <form key={previewMode + (data.settings.name||"")} onSubmit={e=>{
          e.preventDefault();
          if(updateSettings({name:String(new FormData(e.currentTarget).get("name")||"").trim()})) notify(t("Preferences saved","Настройки сохранены"));
        }}>
          <Field label={t("Your name","Ваше имя")}><input className="control" name="name" maxLength={70} defaultValue={data.settings.name||""} placeholder={t("Your name","Ваше имя")}/></Field>
          <Button data-ph="settings-save-preferences" variant="secondary" className="button-full">{t("Save preferences","Сохранить настройки")}</Button>
        </form>
      </section>
      <section className="settings-card">
        <h2 className="settings-section-heading"><Globe2 size={20}/>{t("Language & currency","Язык и валюта")}</h2>
        <Field label={t("Language","Язык")}><select className="control" value={data.settings.language||"en"} onChange={e=>updateSettings({language:e.target.value==="ru"?"ru":"en"})}>
          <option value="en">English</option><option value="ru">Русский (preview)</option>
        </select></Field>
        <p className="settings-help">{t("Russian preview includes navigation, settings and regional formats. Some screens are still in English.","В предварительном русском переводе доступны навигация, настройки и форматы дат. Некоторые экраны пока на английском.")}</p>
        <Field label={t("Currency","Валюта")}><select className="control" value={data.settings.currency||"RUB"} onChange={e=>changeCurrency(e.target.value)}>
          {supportedCurrencies.map(code=><option key={code} value={code}>{code} — {new Intl.DisplayNames([data.settings.language==="ru"?"ru":"en"],{type:"currency"}).of(code)}</option>)}
        </select></Field>
        <p className="settings-help">{t("One currency for your prices and budgets. Changing it does not convert amounts.","Одна валюта для цен и бюджетов. При изменении суммы не конвертируются.")}</p>
      </section>
      {budgetsEnabled && <section className="settings-card settings-budgets-card">
        <h2 className="settings-section-heading"><Wallet size={20}/>{t("Default budgets","Бюджеты по умолчанию")}</h2>
        <p className="settings-help">{t("Starting amounts for new occasions, per recipient. Existing plans stay unchanged.","Стартовые суммы для новых событий на одного получателя. Уже созданные события не изменятся.")}</p>
        <form onSubmit={e=>{e.preventDefault(); if(Number.isFinite(budget)&&budget>=0&&Number.isFinite(occasionBudget)&&occasionBudget>=0&&updateSettings({birthdayBudget:budget,occasionBudget})) notify(t("Default budgets saved","Бюджеты сохранены"));}}>
          <Field label={t("Default birthday budget","Бюджет на день рождения")+" ("+currencyUnit()+")"}><input className="control" type="number" min="0" step="any" required value={budget} onChange={e=>setBudget(Number(e.target.value))}/></Field>
          <Field label={t("Other occasions","Другие события")+" ("+currencyUnit()+")"}><input className="control" type="number" min="0" step="any" required value={occasionBudget} onChange={e=>setOccasionBudget(Number(e.target.value))}/></Field>
          <Button className="button-full" variant="secondary">{t("Save default budgets","Сохранить бюджеты")}</Button>
        </form>
      </section>}
      <section className="settings-card">
        <h2 className="settings-section-heading"><CalendarDays size={20}/>{t("Occasions","События")}</h2>
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
                {key === "christmas" ? t("Christmas (Dec 25)","Рождество (25 декабря)") : t("Hanukkah","Ханука")}
              </span>
            </label>
          ))}
          <p className="section-note">
            {t("Holiday preferences are retained. Add specific dates and recipients in Events; annual recurrence is not automatic.","Выберите интересующие праздники. Даты и получателей можно добавить в событиях; ежегодное повторение не включено.")}
          </p>
        </div>
      </section>
      <section className="settings-card">
        <h2 className="settings-section-heading"><Database size={20}/>{t("Data & backup","Данные и резервные копии")}</h2>
        <p>
          {t("Your data is saved to your account and available on any device. You can also export a JSON backup. Preview content is never included.", "Данные сохраняются в аккаунте и доступны на других устройствах. Можно также скачать резервную копию JSON. Тестовые данные не экспортируются.")}
        </p>
        <div className="button-row" style={{ marginTop: 14 }}>
          <Button data-ph="settings-export-json" variant="secondary" onClick={() => exportBackup(personalData)}>
            <Download size={16} />
            {t("Export JSON","Экспорт JSON")}
          </Button>
          <Button data-ph="settings-import-json" variant="secondary" disabled={previewMode !== "my"} onClick={() => file.current?.click()}>
            <Upload size={16} />
            {t("Import JSON","Импорт JSON")}
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
                setOccasionBudget(next.settings.occasionBudget ?? next.settings.birthdayBudget);
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

      {analyticsAvailable && <section className="settings-card">
        <h2 className="settings-section-heading"><ShieldCheck size={20}/>{t("Privacy","Конфиденциальность")}</h2>
        <label className="settings-toggle-row"><span><strong>{t("Share anonymous usage stats","Делиться анонимной статистикой")}</strong>
          <small>{t("Helps improve Givvy. Personal names, dates and typed content are never recorded.","Помогает улучшать Givvy. Имена, даты и введённые данные не записываются.")}</small></span>
          <input type="checkbox" role="switch" checked={analyticsConsent==="granted"} onChange={e=>setConsent(e.target.checked?"granted":"denied")}/>
        </label>
      </section>}
      <details className="settings-card settings-developer" open={developerOpen} onToggle={e=>{
        const open=e.currentTarget.open; setDeveloperOpen(open);
        try{sessionStorage.setItem(developerOpenKey,open?"1":"0");}catch{}
      }}>
        <summary><Code2 size={20}/><span><strong>Developer tools</strong><small>Test content, feature previews and design flows</small></span><ChevronRight className="settings-dev-chevron" size={19}/></summary>
        <div className="settings-dev-body">
          <div className="settings-dev-section"><h3>Feature preview</h3>
            <label className="settings-toggle-row"><span><strong>Show budgets</strong><small>Turn off to test Home, Events and editors without budget planning. Gift prices and saved budgets are preserved.</small></span>
              <input type="checkbox" role="switch" aria-label="Show budgets" checked={budgetsEnabled} onChange={e=>setBudgetsEnabled(e.target.checked)}/>
            </label>
          </div>
          <div className="settings-dev-section"><h3>Preview content</h3>
            <p>Sample data stays separate from your personal account.</p>
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

          </div>
          <div className="settings-dev-section"><h3>Design & first-run flows</h3>
        <Link data-ph="settings-preview-sign-in" className="button-secondary button-full"
          style={{ marginTop: 14 }} to="/account?preview=sign-in">
          <LogIn size={16} />
          Preview sign in
        </Link>
        <Link data-ph="settings-preview-sign-up" className="button-secondary button-full"
          style={{ marginTop: 10 }} to="/account?preview=sign-up">
          <UserPlus size={16} />
          Preview registration
        </Link>
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

          </div>
        </div>
      </details>
      <p className="settings-footer">Givvy</p>
    </div>;
}
