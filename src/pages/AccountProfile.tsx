import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, LogOut, Mail, UserRound, ShieldCheck } from "lucide-react";
import { Title } from "../components/UI";
import { useApp } from "../state/AppState";
import { useAuth } from "../auth/AuthContext";
import { SettingsGroup, SettingsRow, SettingsFormSheet, SheetActions, PreviewBanner } from "../components/SettingsUi";
import { authErrorMessage, requestAccountEmailChange, signOutUser, updateAccountName, updateAccountPassword } from "../auth/providers";
import { t } from "../utils/format";

type AccountSheet = "name"|"email"|"password"|null;
const providerNames: Record<string,string>={"google.com":"Google","apple.com":"Apple",password:"Email & password"};

export function AccountProfile() {
  const auth=useAuth();
  const {data,commit,notify} = useApp();
  const navigate=useNavigate();
  const [sheet,setSheet] = useState<AccountSheet>(null);
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [currentPassword,setCurrentPassword] = useState("");
  const [password,setPassword] = useState("");
  const [confirmPassword,setConfirmPassword] = useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [info,setInfo]=useState("");
  const user=auth.user;
  const testing=auth.status==="testing";
  const passwordProvider=!!user?.providers.includes("password");
  const titleName=user?.displayName||data.settings.name|| (testing?"Preview User":t("Your account","Ваш аккаунт"));
  const begin=(kind:AccountSheet)=>{
    setError("");setInfo("");setName(titleName==="Preview User"?"":titleName);
    setEmail(user?.email||"");setCurrentPassword("");setPassword("");setConfirmPassword("");setSheet(kind);
  };
  const close=()=>{if(!busy){setSheet(null);setError("");setInfo("");}};
  const save=async(event:FormEvent)=>{
    event.preventDefault();
    if(!sheet || testing) return;
    setError("");setInfo("");
    if(sheet==="name" && !name.trim()){setError(t("Enter a name.","Введите имя."));return;}
    if(sheet==="password" && (password.length<6 || password!==confirmPassword)) {
      setError(t("Passwords must match and be at least 6 characters.","Пароли должны совпадать и содержать не менее 6 символов."));return;
    }
    setBusy(true);
    try{
      if(sheet==="name"){
        await updateAccountName(name);
        await auth.refresh();
        commit({...data,settings:{...data.settings,name:name.trim()}});
        notify(t("Account name updated","Имя изменено"));
        setSheet(null);
      } else if(sheet==="email"){
        if(email.trim().toLowerCase() === user?.email?.toLowerCase()){setSheet(null);return;}
        await requestAccountEmailChange(email,currentPassword||undefined);
        setInfo(t("Check your new inbox and follow the verification link. Your current email remains active until confirmed.","Проверьте новую почту и перейдите по ссылке. Пока адрес не подтверждён, действует прежний email."));
      } else {
        await updateAccountPassword(currentPassword,password);
        notify(t("Password updated","Пароль изменён"));setSheet(null);
      }
    }catch(err){setError(authErrorMessage(err)||t("Could not update your account.","Не удалось обновить аккаунт."));}
    finally{setBusy(false);}
  };
  const signOut=async()=>{
    if(testing)return;
    setBusy(true);setError("");
    try{await signOutUser();navigate("/welcome",{replace:true});}
    catch(err){setError(authErrorMessage(err)||"Could not sign out.");}
    finally{setBusy(false);}
  };
  return <div className="settings-page settings-subpage">
    <Title name={t("Account","Аккаунт")} back="/settings" />
    <PreviewBanner />
    <div className="settings-profile-card settings-profile-static">
      <span className="settings-account-avatar"><UserRound size={25}/></span>
      <span className="settings-profile-copy"><strong>{titleName}</strong><small>{user?.email||"Preview account"}</small></span>
    </div>
    <SettingsGroup title={t("PERSONAL DETAILS","ЛИЧНЫЕ ДАННЫЕ")}>
      <SettingsRow icon={UserRound} title={t("Name","Имя")} value={titleName} onClick={()=>begin("name")}/>
      <SettingsRow icon={Mail} title="Email" value={user?.email||"—"} onClick={()=>begin("email")}/>
    </SettingsGroup>
    <SettingsGroup title={t("SECURITY","БЕЗОПАСНОСТЬ")}>
      <SettingsRow icon={ShieldCheck} title={t("Sign-in method","Способ входа")} value={user?.providers.map(p=>providerNames[p]||p).join(", ") || (testing?"Preview":"Email")}/>
      {passwordProvider && <SettingsRow icon={KeyRound} title={t("Change password","Сменить пароль")} onClick={()=>begin("password")}/>}
    </SettingsGroup>
    {passwordProvider && !user?.emailVerified && <p className="settings-page-intro">{t("Verify your email using the link sent during registration.","Подтвердите email по ссылке, отправленной при регистрации.")}</p>}
    <button data-ph="account-sign-out" className="settings-signout" type="button" disabled={busy||testing} onClick={()=>void signOut()}><LogOut size={18}/>{t("Sign out","Выйти из аккаунта")}</button>
    {error && !sheet && <p role="alert" className="settings-error">{error}</p>}

    {sheet && <SettingsFormSheet title={sheet==="name"?t("Your name","Ваше имя"):sheet==="email"?t("Change email","Изменить email"):t("Change password","Сменить пароль")} onClose={close} busy={busy}>
      <form className="settings-sheet-form" onSubmit={e=>void save(e)}>
        {sheet==="name" && <>
          <label className="settings-input-label" htmlFor="account-profile-name">{t("Name","Имя")}</label>
          <input id="account-profile-name" className="control" type="text" autoComplete="name" required maxLength={70} value={name} onChange={e=>setName(e.target.value)}/>
          <p className="settings-help">{t("This name is saved to your account and shown in Givvy.","Имя сохранится в аккаунте и будет отображаться в Givvy.")}</p>
        </>}
        {sheet==="email" && <>
          <p className="settings-help">{t("We'll send a confirmation link to your new email. The current address stays active until you confirm.","Мы отправим ссылку подтверждения на новый адрес. До подтверждения останется активен прежний.")}</p>
          <label className="settings-input-label" htmlFor="account-profile-email">{t("New email","Новый email")}</label>
          <input id="account-profile-email" className="control" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/>
          {passwordProvider && <>
            <label className="settings-input-label" htmlFor="account-profile-current-email">{t("Current password","Текущий пароль")}</label>
            <input id="account-profile-current-email" className="control" type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/>
          </>}
        </>}
        {sheet==="password" && <>
          <label className="settings-input-label" htmlFor="account-profile-current">{t("Current password","Текущий пароль")}</label>
          <input id="account-profile-current" className="control" type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/>
          <label className="settings-input-label" htmlFor="account-profile-password">{t("New password","Новый пароль")}</label>
          <input id="account-profile-password" className="control" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/>
          <label className="settings-input-label" htmlFor="account-profile-confirm">{t("Confirm new password","Подтверждение пароля")}</label>
          <input id="account-profile-confirm" className="control" type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/>
        </>}
        {error && <p className="settings-error" role="alert">{error}</p>}
        {info && <p className="settings-info" role="status">{info}</p>}
        {!info && <SheetActions onCancel={close} saving={busy} saveText={sheet==="email"?t("Send verification","Отправить подтверждение"):undefined}/>}
        {info && <button type="button" className="button-primary settings-full-action" onClick={close}>{t("Done","Готово")}</button>}
      </form>
    </SettingsFormSheet>}
  </div>;
}
