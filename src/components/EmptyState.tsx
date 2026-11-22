import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { t } from "../utils/format";

/** Single pattern for zero-content, filtered-zero, and next-step states.
 * Empty states never imply data loss or replace a loading / error message.
 */
export interface EmptyAction {
  label: string;
  onClick?: () => void;
  to?: string;
}
export function EmptyState({title, description, action, secondaryAction, Icon=Gift, compact=false, children, className=""}:{
  title:string;
  description?:string;
  action?:EmptyAction;
  secondaryAction?:EmptyAction;
  Icon?:LucideIcon;
  compact?:boolean;
  children?:ReactNode;
  className?:string;
}) {
  const button=(a:EmptyAction, secondary=false)=>{
    const content=<>{a.label}<ArrowRight size={15} aria-hidden="true"/></>;
    const classes="empty-state-action"+(secondary?" is-secondary":"");
    return a.to ? <Link to={a.to} className={classes}>{content}</Link>
      : <button type="button" className={classes} onClick={a.onClick}>{content}</button>;
  };
  return <section className={`givvy-empty-state ${compact?"is-compact":""} ${className}`.trim()} aria-label={title}>
    <span className="empty-state-symbol" aria-hidden="true"><Icon size={22} strokeWidth={1.8}/></span>
    <div className="empty-state-copy">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
    {(action||secondaryAction) && <div className="empty-state-actions">
      {action && button(action)}
      {secondaryAction && button(secondaryAction,true)}
    </div>}
  </section>;
}
