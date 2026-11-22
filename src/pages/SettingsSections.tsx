import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarHeart, Code2, Gift, Info, Wallet, Download } from "lucide-react";
import { Title } from "../components/UI";
import { useApp } from "../state/AppState";
import { currency, currencyUnit, t } from "../utils/format";
import { PreviewBanner, SettingsGroup, SettingsRow, SettingsFormSheet, SheetActions } from "../components/SettingsUi";

type BudgetKind = "birthdayBudget" | "occasionBudget";
export function SettingsBudgets() {
  const {data,commit,notify} = useApp();
  const [editing,setEditing] = useState<BudgetKind|null>(null);
  const [amount,setAmount] = useState("");
  const current = (key:BudgetKind)=>key==="birthdayBudget"?data.settings.birthdayBudget:(data.settings.occasionBudget??data.settings.birthdayBudget);
  const edit = (key:BudgetKind) => {setEditing(key);setAmount(String(current(key)));};
  const save = () => {
    if(!editing) return;
    const n=Number(amount);
    if(amount.trim()==="" || !Number.isFinite(n) || n<0) return;
    if(commit({...data,settings:{...data.settings,[editing]:n}})){setEditing(null);notify(t("Default budget saved","Бюджет сохранён"));}
  };
  return <div className="settings-page settings-subpage">
    <Title name={t("Budgets & limits","Бюджеты и лимиты")} back="/settings"/>
    <PreviewBanner/>
    <p className="settings-page-intro">{t("Default budget per person for new occasions. Changes do not affect existing plans.","Сумма на человека для новых событий. Уже созданные планы не изменятся.")}</p>
    <SettingsGroup title={t("DEFAULT AMOUNTS","СУММЫ ПО УМОЛЧАНИЮ")}>
      <SettingsRow icon={Gift} title={t("Birthday","День рождения")} value={currency(current("birthdayBudget"))} onClick={()=>edit("birthdayBudget")}/>
      <SettingsRow icon={Wallet} title={t("Other occasions","Другие события")} value={currency(current("occasionBudget"))} onClick={()=>edit("occasionBudget")}/>
    </SettingsGroup>
    {editing && <SettingsFormSheet title={editing==="birthdayBudget"?t("Birthday budget","Бюджет на день рождения"):t("Other occasions","Другие события")} onClose={()=>setEditing(null)}>
      <form className="settings-sheet-form" onSubmit={e=>{e.preventDefault();save();}}>
        <p className="settings-help">{t("This is a starting amount only. You can change the budget for each occasion later.","Это начальная сумма. Бюджет конкретного события можно изменить отдельно.")}</p>
        <label className="settings-input-label" htmlFor="settings-budget-value">{t("Amount","Сумма")+" ("+currencyUnit()+")"}</label>
        <input id="settings-budget-value" className="control" type="number" min="0" step="any" required autoFocus value={amount} onChange={e=>setAmount(e.target.value)}/>
        <SheetActions onCancel={()=>setEditing(null)}/>
      </form>
    </SettingsFormSheet>}
  </div>;
}
export function SettingsHolidays() {
  const {data,commit} = useApp();
  const change = (key:"newyear"|"christmas"|"hanukkah",enabled:boolean) => {
    const settings={...data.settings};
    if(key==="newyear") settings.holidays=enabled?[...new Set([...(settings.holidays||[]),"New Year"])]: (settings.holidays||[]).filter(item=>item!=="New Year");
    else settings[key]=enabled;
    commit({...data,settings});
  };
  return <div className="settings-page settings-subpage">
    <Title name={t("Holidays","Праздники")} back="/settings"/>
    <PreviewBanner/>
    <p className="settings-page-intro">{t("Choose the holidays that matter to you. These preferences do not automatically create calendar events.","Выберите важные праздники. Эти настройки не создают события в календаре автоматически.")}</p>
    <SettingsGroup title={t("HOLIDAYS","ПРАЗДНИКИ")}>
      {([
        ["newyear","New Year · Jan 1","Новый год · 1 января", (data.settings.holidays||[]).includes("New Year")],
        ["christmas","Christmas · Dec 25","Рождество · 25 декабря",!!data.settings.christmas],
        ["hanukkah","Hanukkah","Ханука",!!data.settings.hanukkah],
      ] as const).map(([key,en,ru,enabled])=><label className="settings-switch-row settings-holiday-row" key={key}>
        <span><strong>{t(en,ru)}</strong></span>
        <input type="checkbox" role="switch" checked={enabled} onChange={e=>change(key,e.target.checked)}/>
      </label>)}
    </SettingsGroup>
  </div>;
}
export function SettingsAbout() {
  return <div className="settings-page settings-subpage">
    <Title name={t("About Givvy","О Givvy")} back="/settings"/>
    <PreviewBanner/>
    <div className="settings-about-brand"><div className="settings-about-symbol"><Gift size={26}/></div><strong>givvy</strong><small>{t("Thoughtful gifting, made easier.","Подарки без лишних хлопот.")}</small></div>
    <SettingsGroup title={t("APP","ПРИЛОЖЕНИЕ")}>
      <SettingsRow icon={Info} title={t("Version","Версия")} value="0.1.0"/>
      <SettingsRow icon={Code2} title={t("Developer tools","Инструменты разработчика")} to="/settings/developer"/>
    </SettingsGroup>
  </div>;
}
export function SettingsDeveloper() {
  const {previewMode,setPreviewMode,budgetsEnabled,setBudgetsEnabled} = useApp();
  return <div className="settings-page settings-subpage">
    <Title name="Developer tools" back="/settings/about"/>
    <PreviewBanner/>
    <p className="settings-page-intro">Use a sandbox to inspect empty and filled screens. Preview edits never change your account.</p>
    <SettingsGroup title="PREVIEW STATE">
      <div className="settings-dev-content">
        <div className="settings-segmented" role="group" aria-label="Preview state">
          {(["empty","filled"] as const).map(mode=><button data-ph={"settings-preview-"+mode} type="button" key={mode} aria-pressed={previewMode===mode} className={previewMode===mode?"is-active":""} onClick={()=>setPreviewMode(mode)}>{mode==="empty"?"Empty":"Filled"}</button>)}
        </div>
        <p className="settings-help">{previewMode==="my"?"Choose a state to see sample screens.":previewMode==="empty"?"No people, occasions, gifts or ideas.":"Sample people, occasions and gifts are shown."}</p>
        {previewMode!=="my" && <button type="button" data-ph="settings-preview-my-data" className="settings-exit-button" onClick={()=>setPreviewMode("my")}>Exit preview</button>}
      </div>
    </SettingsGroup>
    <SettingsGroup title="FEATURE FLAGS">
      <label className="settings-switch-row settings-holiday-row">
        <span><strong>Show budgets</strong><small>Hide budget planning without deleting stored budgets or gift prices.</small></span>
        <input type="checkbox" role="switch" aria-label="Show budgets" checked={budgetsEnabled} onChange={e=>setBudgetsEnabled(e.target.checked)}/>
      </label>
    </SettingsGroup>
  </div>;
}
