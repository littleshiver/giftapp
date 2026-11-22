import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound, Languages, Coins, Wallet, CalendarHeart, ShieldCheck, Download, Info } from "lucide-react";
import { Title } from "../components/UI";
import { useApp } from "../state/AppState";
import { useAuth } from "../auth/AuthContext";
import { exportBackup } from "../persistence/storage";
import { analyticsAvailable, setConsent } from "../analytics/analytics";
import { useAnalyticsConsent } from "../analytics/AnalyticsTracker";
import { supportedCurrencies, t } from "../utils/format";
import { PreviewBanner, SettingsGroup, SettingsRow, SettingsFormSheet, SheetActions } from "../components/SettingsUi";

type EditSheet = "language"|"currency"|"privacy"|"export"|null;

export function Settings() {
  const {data,personalData,commit,notify,syncStatus} = useApp();
  const auth = useAuth();
  const analyticsConsent = useAnalyticsConsent();
  const [sheet,setSheet] = useState<EditSheet>(null);
  const [selectedLanguage,setSelectedLanguage] = useState<"en"|"ru">(data.settings.language||"en");
  const [selectedCurrency,setSelectedCurrency] = useState(data.settings.currency||"RUB");
  const [currencyAcknowledged,setCurrencyAcknowledged] = useState(false);
  const hasAmounts = !!(data.gifts.length || data.ideas.length || data.events.some(event=>Object.keys(event.budgets||{}).length));
  const open = (kind: EditSheet) => {
    setSelectedLanguage(data.settings.language||"en");
    setSelectedCurrency(data.settings.currency||"RUB");
    setCurrencyAcknowledged(false);
    setSheet(kind);
  };
  useEffect(()=>{
    if (sheet===null) setCurrencyAcknowledged(false);
  },[sheet]);
  const update = (patch: Partial<typeof data.settings>) => commit({...data,settings:{...data.settings,...patch}});
  const saveLanguage = () => {
    if (update({language:selectedLanguage})) {setSheet(null);notify(t("Language updated","Язык изменён"));}
  };
  const saveCurrency = () => {
    if (selectedCurrency !== (data.settings.currency||"RUB") && hasAmounts && !currencyAcknowledged) return;
    if (update({currency:selectedCurrency})) {setSheet(null);notify(t("Currency updated","Валюта изменена"));}
  };
  return <div className="settings-page">
    <Title name={t("Settings","Настройки")} />
    <PreviewBanner/>
    <Link to="/account" data-ph="settings-account" className="settings-profile-card">
      <span className="settings-account-avatar"><UserRound size={26}/></span>
      <span className="settings-profile-copy">
        <strong>{auth.user?.displayName || data.settings.name || t("Your account","Ваш аккаунт")}</strong>
        <small>{auth.user?.email || (auth.status==="testing"?"Preview account":t("Account settings","Настройки аккаунта"))}</small>
        {syncStatus==="error" && <small className="settings-sync-warning">{t("Sync unavailable","Нет синхронизации")}</small>}
      </span>
      <span className="settings-profile-arrow">›</span>
    </Link>

    <SettingsGroup title={t("GENERAL","ОБЩИЕ")}>
      <SettingsRow icon={Languages} title={t("Language","Язык")} value={data.settings.language==="ru"?"Русский":"English"} onClick={()=>open("language")}/>
      <SettingsRow icon={Coins} title={t("Currency","Валюта")} value={data.settings.currency||"RUB"} onClick={()=>open("currency")}/>
    </SettingsGroup>
    <SettingsGroup title={t("PLANNING","ПЛАНИРОВАНИЕ")}>
      <SettingsRow icon={Wallet} title={t("Budgets & limits","Бюджеты и лимиты")} detail={t("Default amounts for new occasions","Суммы для новых событий")} to="/settings/budgets"/>
      <SettingsRow icon={CalendarHeart} title={t("Holidays","Праздники")} detail={t("Choose your holidays","Выберите свои праздники")} to="/settings/holidays"/>
    </SettingsGroup>
    <SettingsGroup title={t("OTHER","ДРУГОЕ")}>
      {analyticsAvailable && <SettingsRow icon={ShieldCheck} title={t("Privacy","Конфиденциальность")} onClick={()=>open("privacy")}/>}
      <SettingsRow icon={Download} title={t("Export data","Экспорт данных")} onClick={()=>open("export")}/>
      <SettingsRow icon={Info} title={t("About Givvy","О Givvy")} to="/settings/about"/>
    </SettingsGroup>

    {sheet==="language" && <SettingsFormSheet title={t("Language","Язык")} onClose={()=>setSheet(null)}>
      <form className="settings-sheet-form" onSubmit={event=>{event.preventDefault();saveLanguage();}}>
        <p className="settings-help">{t("Choose the language for the app. Russian translation is still a preview.","Выберите язык приложения. Русский перевод пока доступен частично.")}</p>
        <div className="settings-choice-list" role="radiogroup" aria-label={t("Language","Язык")}>
          {([["en","English"],["ru","Русский (preview)"]] as const).map(([code,label])=>
            <label key={code} className="settings-choice">
              <span>{label}</span><input type="radio" name="language" value={code} checked={selectedLanguage===code} onChange={()=>setSelectedLanguage(code)}/>
            </label>)}
        </div>
        <SheetActions onCancel={()=>setSheet(null)}/>
      </form>
    </SettingsFormSheet>}
    {sheet==="currency" && <SettingsFormSheet title={t("Currency","Валюта")} onClose={()=>setSheet(null)}>
      <form className="settings-sheet-form" onSubmit={event=>{event.preventDefault();saveCurrency();}}>
        <p className="settings-help">{t("This currency labels your gift prices and budgets. Changing it does not convert any amounts.","Это валюта для цен подарков и бюджетов. При её смене суммы не пересчитываются.")}</p>
        <label className="settings-input-label" htmlFor="settings-currency-select">{t("Currency","Валюта")}</label>
        <select className="control" id="settings-currency-select" value={selectedCurrency} onChange={e=>{setSelectedCurrency(e.target.value);setCurrencyAcknowledged(false);}}>
          {supportedCurrencies.map(code=><option key={code} value={code}>{code} — {new Intl.DisplayNames([data.settings.language==="ru"?"ru":"en"],{type:"currency"}).of(code)}</option>)}
        </select>
        {hasAmounts && selectedCurrency !== (data.settings.currency||"RUB") && <label className="settings-currency-warning">
          <input type="checkbox" checked={currencyAcknowledged} onChange={e=>setCurrencyAcknowledged(e.target.checked)}/>
          <span>{t("I understand: existing numbers stay the same and will be displayed in the new currency.","Понимаю: существующие суммы останутся прежними, изменится только обозначение валюты.")}</span>
        </label>}
        <div className="settings-sheet-actions">
          <button type="button" className="button-secondary" onClick={()=>setSheet(null)}>{t("Cancel","Отмена")}</button>
          <button type="submit" className="button-primary" disabled={hasAmounts && selectedCurrency!==(data.settings.currency||"RUB") && !currencyAcknowledged}>{t("Save","Сохранить")}</button>
        </div>
      </form>
    </SettingsFormSheet>}
    {sheet==="privacy" && <SettingsFormSheet title={t("Privacy","Конфиденциальность")} onClose={()=>setSheet(null)}>
      <div className="settings-sheet-form">
        <label className="settings-switch-row"><span><strong>{t("Share anonymous usage stats","Делиться анонимной статистикой")}</strong><small>{t("Helps us improve Givvy. Names, dates and written gift details are not tracked.","Помогает улучшать Givvy. Имена, даты и введённые описания не записываются.")}</small></span>
          <input type="checkbox" role="switch" checked={analyticsConsent==="granted"} onChange={e=>setConsent(e.target.checked?"granted":"denied")}/>
        </label>
        <button type="button" className="button-primary settings-full-action" onClick={()=>setSheet(null)}>{t("Done","Готово")}</button>
      </div>
    </SettingsFormSheet>}
    {sheet==="export" && <SettingsFormSheet title={t("Export data","Экспорт данных")} onClose={()=>setSheet(null)}>
      <div className="settings-sheet-form">
        <p className="settings-help">{t("Download a JSON backup of your people, occasions, gifts and ideas. Your account is already synced; this is an extra personal copy. Demo content is never exported.","Скачайте JSON-копию людей, событий, подарков и идей. Основные данные синхронизируются с аккаунтом, это дополнительная копия. Тестовые данные в неё не входят.")}</p>
        <button data-ph="settings-export-json" type="button" className="button-primary settings-full-action" onClick={()=>{exportBackup(personalData);setSheet(null);}}><Download size={17}/>{t("Download JSON backup","Скачать JSON-копию")}</button>
      </div>
    </SettingsFormSheet>}
  </div>;
}
