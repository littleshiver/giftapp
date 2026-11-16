import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { AppData, Event } from "../domain/models";
import { enabledEvents, eventBudget, giftsFor, monthSummary, total } from "../domain/selectors";
import { currency, today } from "../utils/format";

export function HomeBudgets({ data, selected }: { data: AppData; selected?: Event }) {
  const events = enabledEvents(data);
  const [budgetEventId, setBudgetEventId] = useState("");
  const [expanded, setExpanded] = useState(false);
  const event = events.find((e) => e.id === budgetEventId) ?? selected ?? events[0];
  const month = monthSummary(data, today().slice(0, 7));
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long" });
  const percentage = month.budget > 0 ? Math.round(month.committed / month.budget * 100) : 0;
  const circleFill = month.budget > 0
    ? Math.min(100, Math.max(0, month.committed / month.budget * 100))
    : 0;
  const ringStyle = { "--month-fill": circleFill + "%" } as CSSProperties;
  const recipients = event?.people ?? [];
  const shownRecipients = expanded ? recipients : recipients.slice(0, 3);

  return (
    <section className="home-budget-section" aria-labelledby="home-budgets-title">
      <h2 className="home-section-heading" id="home-budgets-title">Gift budgets</h2>
      <div className="home-budget-grid">
        <article className="home-budget-card home-budget-month">
          <div className="home-budget-card-head">
            <strong>{monthLabel}</strong>
            <span>Occasions this month</span>
          </div>
          <div className="home-budget-ring" style={ringStyle} role="img"
            aria-label={month.budget > 0
              ? percentage + "% of budget allocated for " + monthLabel + " gifts"
              : "No occasion budgets set for " + monthLabel}>
            <div className="home-budget-ring-center">
              <strong>{month.budget > 0 ? percentage + "%" : "—"}</strong>
              <small>planned</small>
            </div>
          </div>
          <div className="home-budget-total">
            <strong>{currency(month.committed)}</strong>
            <span>of {currency(month.budget)}</span>
          </div>
          {month.committed > month.budget && (
            <p className="home-budget-warning">{currency(month.committed - month.budget)} over budget</p>
          )}
        </article>
        <article className="home-budget-card home-budget-event">
          <div className="home-budget-card-head">
            <strong>By occasion</strong>
            <span>Gift budget per person</span>
          </div>
          {event ? (
            <>
              <div className="home-budget-picker">
                <select aria-label="Budget occasion" value={event.id}
                  onChange={(ev) => { setBudgetEventId(ev.target.value); setExpanded(false); }}>
                  {events.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <ChevronDown size={15} aria-hidden="true"/>
              </div>
              <div className="home-budget-recipients">
                {shownRecipients.length ? shownRecipients.map((id) => {
                  const person = data.people.find((p) => p.id === id);
                  const planned = total(giftsFor(data, event.id, id));
                  const limit = event.budgets[id];
                  const hasBudget = Number.isFinite(limit);
                  const percent = hasBudget && limit > 0
                    ? Math.min(100, planned / limit * 100)
                    : planned > 0 ? 100 : 0;
                  return (
                    <div className="home-budget-recipient" key={id}>
                      <div className="home-budget-recipient-label">
                        <strong title={person?.name ?? "Recipient"}>{person?.name ?? "Recipient"}</strong>
                        <span>{currency(planned)} / {hasBudget ? currency(limit) : "—"}</span>
                      </div>
                      <div className="home-budget-track" role="progressbar"
                        aria-label={(person?.name ?? "Recipient") + " gift budget"}
                        aria-valuemin={0}
                        aria-valuemax={hasBudget ? Math.max(1, limit) : undefined}
                        aria-valuenow={hasBudget ? Math.min(Math.max(0, planned), Math.max(1, limit)) : undefined}>
                        <span style={{width: percent + "%"}} className={hasBudget && planned > limit ? "over" : ""}/>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="home-budget-empty">Add recipients to plan individual gifts.</p>
                )}
                {recipients.length > 3 && (
                  <button type="button" className="home-budget-toggle"
                    onClick={() => setExpanded((value) => !value)}>
                    {expanded ? "Show fewer" : "Show " + (recipients.length - 3) + " more"}
                  </button>
                )}
              </div>
              <Link className="home-budget-event-link" to={"/events/" + event.id}>
                <span>{currency(total(giftsFor(data, event.id)))} of {currency(eventBudget(event))}</span>
                <ArrowUpRight size={15} aria-hidden="true"/>
              </Link>
            </>
          ) : <p className="home-budget-empty">No occasions yet. Add one to plan gifts.</p>}
        </article>
      </div>
    </section>
  );
}
