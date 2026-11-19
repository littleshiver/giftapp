import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { PersonAvatar } from "./UI";
import type { AppData } from "../domain/models";
import { bought, monthSummary, total } from "../domain/selectors";
import { currency, today } from "../utils/format";

/** One monthly budget at a glance, with recipient totals across every
 * occasion in that month (not an occasion-by-occasion accordion). */
export function HomeBudgets({ data }: { data: AppData }) {
  const [monthOffset, setMonthOffset] = useState(0);
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

  const eventsForMonth = new Set(summary.events.map(event => event.id));
  const giftsForMonth = data.gifts.filter(gift => eventsForMonth.has(gift.eventId));
  const personIds = new Set([
    ...summary.events.flatMap(event => event.people),
    ...giftsForMonth.map(gift => gift.personId),
  ]);
  const peopleBudgets = [...personIds].map(id => {
    const person = data.people.find(p => p.id === id);
    const gifts = giftsForMonth.filter(g => g.personId === id);
    const limitEvents = summary.events.filter(event =>
      event.people.includes(id) && Number.isFinite(event.budgets[id]),
    );
    return {
      id,
      person,
      spent: bought(gifts),
      planned: total(gifts),
      budget: limitEvents.reduce((sum, event) => sum + event.budgets[id], 0),
      hasBudget: limitEvents.length > 0,
    };
  });

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
          <div className="home-month-budget-stat">
            <span className="home-month-budget-kicker">Planned gifts</span>
            <strong className="home-month-budget-value">{currency(planned)}</strong>
          </div>
          <div className="home-month-budget-stat home-month-budget-limit">
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

        <div className="home-month-budget-people" aria-label="Budgets by person">
          <h3>By person <small>({peopleBudgets.length})</small></h3>
          {peopleBudgets.length ? peopleBudgets.map(item => (
            <Link className="home-month-budget-person" key={item.id} to={`/people/${item.id}`}
              aria-label={`${item.person?.name || "Recipient"}: ${currency(item.planned)} planned`}>
              <PersonAvatar person={item.person} className="home-month-budget-avatar"/>
              <span className="home-month-budget-person-name">
                <strong>{item.person?.name || "Recipient"}</strong>
                <small>{currency(item.spent)} spent · {currency(item.planned-item.spent)} to buy</small>
              </span>
              <span className="home-month-budget-person-total">
                <strong>{currency(item.planned)}</strong>
                <small>{item.hasBudget ? "of " + currency(item.budget) : "No limit set"}</small>
              </span>
            </Link>
          )) : <p className="home-budget-empty">No gift budgets planned for this month.</p>}
        </div>
      </article>
    </section>
  );
}
