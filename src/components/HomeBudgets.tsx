import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { AppData, Event } from "../domain/models";
import { bought, eventBudget, giftsFor, monthSummary, total } from "../domain/selectors";
import { currency, today } from "../utils/format";

/** Budget A: one monthly overview, optional by-occasion breakdown.
 * The committed (all gifts) amount represents planned spend; only Bought
 * contributes to the actually spent amount. Both are within the same budget. */
export function HomeBudgets({ data }: { data: AppData; selected?: Event }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [year, baseMonth] = today().slice(0, 7).split("-").map(Number);
  const date = new Date(year, baseMonth - 1 + monthOffset, 1);
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const summary = monthSummary(data, monthKey);
  const planned = summary.committed;
  const spent = summary.bought;
  const remainingPlanned = Math.max(0, planned - spent);
  const percentage = summary.budget > 0 ? Math.round(planned / summary.budget * 100) : 0;
  const spentPercent = summary.budget > 0 ? Math.min(100, spent / summary.budget * 100) : 0;
  const upcomingPercent = summary.budget > 0
    ? Math.min(100 - spentPercent, remainingPlanned / summary.budget * 100)
    : 0;
  return (
    <section className="home-budget-section" aria-labelledby="home-budgets-title">
      <h2 className="home-section-heading" id="home-budgets-title">Gift budgets</h2>
      <article className="home-month-budget-card">
        <div className="home-month-budget-nav" aria-label="Budget month navigation">
          <button type="button" aria-label="Previous month" onClick={() => setMonthOffset(n => n - 1)}>
            <ChevronLeft size={19} aria-hidden="true"/>
          </button>
          <div className="home-month-budget-month">
            <CalendarDays size={16} aria-hidden="true"/>
            <strong>{monthLabel}</strong>
          </div>
          <button type="button" aria-label="Next month" onClick={() => setMonthOffset(n => n + 1)}>
            <ChevronRight size={19} aria-hidden="true"/>
          </button>
        </div>
        <div className="home-month-budget-numbers">
          <div>
            <span className="home-month-budget-kicker">Planned gifts</span>
            <strong className="home-month-budget-value">{currency(planned)}</strong>
          </div>
          <div className="home-month-budget-limit">
            <span className="home-month-budget-kicker">Monthly budget</span>
            <strong>{currency(summary.budget)}</strong>
          </div>
        </div>
        <div className="home-month-budget-track" role="progressbar"
          aria-label={monthLabel + " planned gift budget"}
          aria-valuemin={0} aria-valuemax={Math.max(summary.budget, 1)}
          aria-valuenow={Math.min(planned, Math.max(summary.budget,1))}>
          <span className="home-month-budget-spent" style={{width:`${spentPercent}%`}}/>
          <span className="home-month-budget-to-buy" style={{width:`${upcomingPercent}%`}}/>
        </div>
        <div className="home-month-budget-meta">
          <span><i className="home-budget-dot home-budget-dot-spent"/>Spent {currency(spent)}</span>
          <span><i className="home-budget-dot home-budget-dot-planned"/>To buy {currency(remainingPlanned)}</span>
          {summary.budget > 0 && <span>{percentage}% planned</span>}
        </div>
        {planned > summary.budget && (
          <p className="home-budget-warning" role="status">
            {currency(planned - summary.budget)} over budget
          </p>
        )}
        <button className="home-month-budget-toggle" type="button"
          aria-expanded={expanded} aria-controls="home-month-occasions"
          onClick={() => setExpanded(value => !value)}>
          <span>By occasion <small>({summary.events.length})</small></span>
          <ChevronDown size={18} className={expanded ? "is-expanded" : ""} aria-hidden="true"/>
        </button>
        {expanded && (
          <div className="home-month-budget-occasions" id="home-month-occasions">
            {summary.events.length ? summary.events.map(event => {
              const gifts = giftsFor(data, event.id);
              const plannedTotal = total(gifts);
              const actual = bought(gifts);
              return (
                <Link to={`/events/${event.id}`} className="home-month-budget-occasion" key={event.id}>
                  <span className="home-month-budget-occasion-name">
                    <strong>{event.name}</strong>
                    <small>{currency(actual)} spent · {currency(plannedTotal)} planned</small>
                  </span>
                  <span className="home-month-budget-occasion-limit">
                    {currency(eventBudget(event))} <ChevronRight size={15} aria-hidden="true"/>
                  </span>
                </Link>
              );
            }) : <p className="home-budget-empty">No occasions planned for this month.</p>}
          </div>
        )}
      </article>
    </section>
  );
}
