import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApp } from "../state/AppState";
import { t } from "../utils/format";
import { Sheet } from "./Primitives";

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return <section className="settings-group" aria-label={title}>
    <h2 className="settings-group-title">{title}</h2>
    <div className="settings-group-list">{children}</div>
  </section>;
}
export function SettingsRow({ icon: Icon, title, detail, value, to, onClick, testId, destructive = false }: {
  icon?: LucideIcon; title: string; detail?: string; value?: string; to?: string;
  onClick?: () => void; testId?: string; destructive?: boolean;
}) {
  const children = <>
    {Icon && <span className="settings-list-icon"><Icon size={20} strokeWidth={1.9} /></span>}
    <span className="settings-row-copy"><strong>{title}</strong>{detail && <small>{detail}</small>}</span>
    {value && <span className="settings-row-value">{value}</span>}
    {!destructive && (to||onClick) && <ChevronRight className="settings-chevron" size={19}/>}
  </>;
  const cls="settings-list-row"+(destructive?" is-destructive":"");
  if(to) return <Link data-ph={testId} className={cls} to={to}>{children}</Link>;
  if(onClick) return <button type="button" data-ph={testId} className={cls} onClick={onClick}>{children}</button>;
  return <div className={cls+" is-static"}>{children}</div>;
}

export function PreviewBanner() {
  const {previewMode,setPreviewMode} = useApp();
  return previewMode === "my" ? null : <div className="settings-preview-banner" role="status">
    <span>{t("Preview mode: "+(previewMode === "empty" ? "Empty" : "Filled"),"Режим тестирования: "+(previewMode === "empty"?"Пусто":"Заполнено"))}</span>
    <button data-ph="settings-exit-preview" type="button" onClick={()=>setPreviewMode("my")}>{t("Exit preview","Выйти")}</button>
  </div>;
}

export function SettingsFormSheet({title,onClose,children,busy=false}: {
  title:string;onClose:()=>void;children:ReactNode;busy?:boolean;
}) {
  return <Sheet title={title} onClose={onClose} busy={busy}>
    <div className="settings-sheet-content">{children}</div>
  </Sheet>;
}
export function SheetActions({onCancel,saving=false,saveText}:{
  onCancel:()=>void;saving?:boolean;saveText?:string;
}) {
  return <div className="settings-sheet-actions">
    <button type="button" className="button-secondary" disabled={saving} onClick={onCancel}>{t("Cancel","Отмена")}</button>
    <button type="submit" className="button-primary" disabled={saving}>{saving?t("Saving…","Сохранение…"):(saveText||t("Save","Сохранить"))}</button>
  </div>;
}
