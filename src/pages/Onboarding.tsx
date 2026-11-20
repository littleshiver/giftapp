import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, Gift,
  Heart, Lightbulb, LockKeyhole, ShoppingBasket, Sparkles, X,
} from "lucide-react";
import { HomeBrand } from "../components/HomeBrand";
import { PersonAvatar } from "../components/UI";
import { OccasionArt } from "../components/OccasionArt";
import { Button, Field } from "../components/Primitives";
import { discoverySuggestions } from "../domain/discovery";
import {
  addFirstPerson, finishFirstRun, planFirstGift, saveFirstIdea, setFirstGiftBought,
} from "../domain/onboardingJourney";
import type { AppData } from "../domain/models";
import { useApp } from "../state/AppState";
import { useAuth } from "../auth/AuthContext";
import { currency, fmtDate } from "../utils/format";
import { track } from "../analytics/analytics";

const monthLabels = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const steps = ["Welcome", "Person", "Profile", "Ideas", "Occasion", "To buy", "Ready"] as const;

/** A guided, real first gift path. Only explicit user actions write data.
 * Preview from Settings uses an isolated in-memory copy, never a real commit.
 * Skipping is always safe: no invented demo people or purchases. */
export function Onboarding() {
  const { data, commit, notify } = useApp();
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preview = params.has("preview");
  const [sandbox, setSandbox] = useState<AppData>(() => data);
  const current = preview ? sandbox : data;
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [personId, setPersonId] = useState("");
  const [eventId, setEventId] = useState("");
  const [ideaId, setIdeaId] = useState("");
  const [giftId, setGiftId] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [error, setError] = useState("");

  const person = current.people.find(p => p.id === personId);
  const occasion = current.events.find(e => e.id === eventId);
  const idea = current.ideas.find(i => i.id === ideaId);
  const gift = current.gifts.find(g => g.id === giftId);
  const suggestion = discoverySuggestions[suggestionIndex % discoverySuggestions.length];

  useEffect(() => {
    if (!preview) track("onboarding_step_viewed", { step: step + 1 });
  }, [step, preview]);

  const store = (next: AppData) => {
    if (preview) {
      setSandbox(next);
      return true;
    }
    return commit(next);
  };
  const go = (next: number) => {
    setError("");
    setStep(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const complete = () => {
    if (preview) {
      go(6);
      return;
    }
    if (store(finishFirstRun(current))) {
      track("onboarding_completed", {
        added_birthday: Boolean(personId), saved_idea: Boolean(ideaId),
        planned_gift: Boolean(giftId),
      });
      go(6);
    }
  };
  const exit = () => {
    if (preview) {
      navigate("/settings");
    } else if (store(finishFirstRun(current))) {
      track("onboarding_skipped", { step: step + 1 });
      navigate("/");
    }
  };
  const addPerson = (e: FormEvent) => {
    e.preventDefault();
    try {
      const monthDay = `${month}-${day.padStart(2, "0")}`;
      const result = addFirstPerson(current, name, monthDay);
      if (store(result.data)) {
        setPersonId(result.person.id);
        setEventId(result.event.id);
        go(2);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const saveIdea = () => {
    try {
      const result = saveFirstIdea(current, suggestion, personId);
      if (store(result.data)) {
        setIdeaId(result.idea.id);
        go(4);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const plan = () => {
    try {
      const result = planFirstGift(current, ideaId, eventId);
      if (store(result.data)) {
        setGiftId(result.gift.id);
        go(5);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const setBought = (value: boolean) => {
    try {
      if (store(setFirstGiftBought(current, giftId, value))) {
        if (!preview) notify(value ? "Marked as bought ✓" : "Moved back to To buy", "success");
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="guided-onboarding">
      <header className="guided-topbar">
        <HomeBrand />
        {step < 6 && (
          <button type="button" className="guided-skip" data-ph={preview ? "onboarding-back-to-settings" : "onboarding-explore-first"}
            onClick={exit}>{preview ? "Exit preview" : "Skip"}</button>
        )}
      </header>
      <div className="guided-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((label, index) => (
          <span key={label} className={index <= step ? "is-active" : ""} aria-hidden="true"/>
        ))}
      </div>

      <div className="guided-content" key={step}>
        {step === 0 && (
          <section className="guided-stage guided-intro">
            <div className="guided-kicker"><Sparkles size={15}/> Gifting made lighter</div>
            <h1>Great gifts, from first thought to finally bought.</h1>
            <p>Save ideas, remember your people, plan occasions and keep spending in sight. All in one place.</p>
            <div className="guided-intro-flow" aria-label="The gift planning journey">
              <div className="guided-flow-snapshot guided-flow-idea">
                <img src={discoverySuggestions[1].image} alt="Cozy throw blanket"/>
                <Heart size={17} fill="currentColor" aria-hidden="true"/>
              </div>
              <div className="guided-flow-snapshot guided-flow-person">
                <span aria-hidden="true">👤</span>
                <strong>A person</strong>
                <small>Remember what they love</small>
              </div>
              <div className="guided-flow-snapshot guided-flow-gift">
                <ShoppingBasket size={24} aria-hidden="true"/>
                <strong>Ready to give</strong>
                <small>Plan, buy, done</small>
              </div>
            </div>
            <div className="guided-intro-steps" aria-label="What Givvy helps with">
              <span><Lightbulb size={15}/> Find an idea</span>
              <span><CalendarDays size={15}/> Pick an occasion</span>
              <span><Check size={15}/> Track the gift</span>
            </div>
            <div className="guided-actions">
              <Button type="button" data-ph="onboarding-get-started" className="button-full guided-primary"
                onClick={() => go(1)}>Try as guest <ArrowRight size={17}/></Button>
              <button type="button" className="guided-text-action" onClick={exit}>
                {preview ? "Back to Settings" : "Explore the app first"}
              </button>
              {!preview && auth.status === "guest" && (
                <Link to="/account?next=/" data-ph="onboarding-have-account" className="guided-text-action">
                  Already have an account? Sign in
                </Link>
              )}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="guided-stage">
            <div className="guided-kicker">01 · Your people</div>
            <h1>Who are we gifting?</h1>
            <p>Start with one person. We’ll add their next birthday to Events automatically.</p>
            <form className="guided-person-form" onSubmit={addPerson}>
              <Field label="Name">
                <input className="control" name="name" aria-label="Name" autoComplete="off"
                  required maxLength={70} placeholder="e.g. Mira"
                  value={name} onChange={e => setName(e.target.value)}/>
              </Field>
              <fieldset className="guided-birthday-fieldset">
                <legend>Birthday</legend>
                <div className="guided-birthday-fields">
                  <label>
                    <span className="sr-only">Birthday month</span>
                    <select className="control" aria-label="Birthday month" value={month}
                      required onChange={e => setMonth(e.target.value)}>
                      <option value="">Month</option>
                      {monthLabels.map((label, i) => (
                        <option value={String(i+1).padStart(2,"0")} key={label}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Birthday day</span>
                    <input className="control" type="number" min={1} max={31} required
                      placeholder="Day" aria-label="Birthday day"
                      value={day} onChange={e => setDay(e.target.value)}/>
                  </label>
                </div>
                <small>No birth year needed. You can add a photo or edit this later.</small>
              </fieldset>
              {error && <p className="guided-error" role="alert">{error}</p>}
              <Button className="button-full guided-primary" data-ph="onboarding-add-person">
                Add person <ArrowRight size={17}/>
              </Button>
            </form>
            <button type="button" className="guided-text-action" onClick={() => go(0)}>
              <ArrowLeft size={15}/> Back
            </button>
          </section>
        )}

        {step === 2 && person && occasion && (
          <section className="guided-stage">
            <div className="guided-kicker">02 · People</div>
            <h1>Meet {person.name}.</h1>
            <p>A People profile is ready. You can keep their gift ideas and preferences here.</p>
            <div className="guided-person-card">
              <div className="guided-person-cover">
                <PersonAvatar person={person} className="guided-person-avatar"/>
              </div>
              <div className="guided-person-panel">
                <strong>{person.name}</strong>
                <span className="guided-person-birthday"><CalendarDays size={15}/> {fmtDate(occasion.date)}</span>
                <small>Their birthday is already in Events</small>
              </div>
            </div>
            <div className="guided-soft-tip">
              <Check size={17}/> Birthday added automatically. No duplicate setup.
            </div>
            <Button type="button" className="button-full guided-primary"
              data-ph="onboarding-find-ideas" onClick={() => go(3)}>
              Let's find a gift <ArrowRight size={17}/>
            </Button>
          </section>
        )}

        {step === 3 && person && (
          <section className="guided-stage">
            <div className="guided-kicker">03 · Discover</div>
            <h1>An idea for {person.name}.</h1>
            <p>Browse a few ideas. Saving one doesn't mean you've decided to buy it.</p>
            <div className="guided-discover-stage">
              <div className="guided-polaroid" key={suggestion.id}>
                <img src={suggestion.image} alt={suggestion.name}/>
                <strong>{suggestion.name}</strong>
              </div>
            </div>
            <div className="guided-idea-controls">
              <button type="button" className="guided-skip-idea"
                aria-label="Show another idea"
                onClick={() => setSuggestionIndex(index => (index+1)%discoverySuggestions.length)}>
                <X size={23}/>
              </button>
              <button type="button" className="guided-save-idea"
                data-ph="onboarding-save-idea" onClick={saveIdea}>
                <Heart size={21} fill="currentColor"/>
                <span>Save for {person.name}</span>
              </button>
            </div>
            {error && <p className="guided-error" role="alert">{error}</p>}
            <p className="guided-tip-muted">Or skip the tour to explore Discover yourself.</p>
          </section>
        )}

        {step === 4 && person && occasion && idea && (
          <section className="guided-stage">
            <div className="guided-kicker">04 · Events</div>
            <h1>Now make a plan.</h1>
            <p>{idea.name} is saved in {person.name}'s ideas. Their birthday event is already waiting for you.</p>
            <div className="guided-event-card">
              <span className="guided-event-icon"><OccasionArt event={occasion}/></span>
              <div><small>{fmtDate(occasion.date)}</small><strong>{occasion.name}</strong></div>
              <Check size={19} className="guided-event-check"/>
            </div>
            <div className="guided-idea-row">
              <img src={idea.image} alt=""/>
              <span><strong>{idea.name}</strong><small>{currency(idea.price)} · Saved idea</small></span>
            </div>
            <div className="guided-soft-tip">
              <Gift size={17}/> Planning creates a To buy gift in this occasion. The idea stays saved, too.
            </div>
            {error && <p className="guided-error" role="alert">{error}</p>}
            <Button type="button" className="button-full guided-primary" onClick={plan}
              data-ph="onboarding-plan-gift">
              Plan this gift <ArrowRight size={17}/>
            </Button>
          </section>
        )}

        {step === 5 && gift && person && occasion && (
          <section className="guided-stage">
            <div className="guided-kicker">05 · From plan to present</div>
            <h1>One less thing to remember.</h1>
            <p>{gift.name} is on {person.name}'s birthday list. Update its status when you actually buy it.</p>
            <div className="guided-gift-status-card">
              <img src={gift.image} alt={gift.name}/>
              <div className="guided-gift-status-body">
                <strong>{gift.name}</strong>
                <small>{occasion.name} · {currency(gift.price)}</small>
                <span className={`guided-status-chip ${gift.status === "bought" ? "is-bought" : ""}`}>
                  {gift.status === "bought" ? <Check size={15}/> : <ShoppingBasket size={15}/>}
                  {gift.status === "bought" ? "Bought" : "To buy"}
                </span>
              </div>
            </div>
            <button type="button" className="guided-status-toggle" onClick={() => setBought(gift.status !== "bought")}>
              {gift.status === "bought" ? "↶ Move back to To buy" : "✓ Mark as bought"}
            </button>
            <p className="guided-tip-muted">Only mark it bought if you've actually purchased it. You can leave it as To buy.</p>
            {error && <p className="guided-error" role="alert">{error}</p>}
            <Button type="button" data-ph="onboarding-finish" className="button-full guided-primary" onClick={complete}>
              Finish walkthrough <ArrowRight size={17}/>
            </Button>
          </section>
        )}

        {step === 6 && (
          <section className="guided-stage guided-finish">
            <div className="guided-done-icon"><Check size={29}/></div>
            <div className="guided-kicker">You're ready</div>
            <h1>Everything in its place.</h1>
            <p>{preview
              ? "That was a design preview. Nothing was saved to your account or device."
              : "Your people, ideas and occasions are ready. Givvy will keep them together while you plan."}</p>
            {!preview && auth.status === "guest" && (
              <div className="guided-account-note">
                <LockKeyhole size={21} aria-hidden="true"/>
                <div>
                  <strong>Keep your plans across devices</strong>
                  <span>A free account syncs your lists online. As a guest, they stay in this browser. You can export a backup from Settings either way.</span>
                </div>
              </div>
            )}
            {!preview && auth.status === "guest" && (
              <Link className="guided-primary guided-link-primary" to="/account?mode=sign-up&next=/"
                data-ph="onboarding-sign-up">Create free account <ArrowRight size={17}/></Link>
            )}
            {!preview && auth.status === "disabled" && (
              <p className="guided-tip-muted">Account sync isn't configured in this build. Your plans stay local, and you can export them from Settings.</p>
            )}
            <Button type="button" className={`button-full ${auth.status === "guest" ? "guided-secondary" : "guided-primary"}`}
              data-ph="onboarding-done"
              onClick={() => navigate(preview ? "/settings" : "/")}>
              {preview ? "Back to Settings" : auth.status === "guest" ? "Continue as guest" : "Go to Home"}
            </Button>
            {!preview && occasion && (
              <Link className="guided-text-action" to={`/events/${occasion.id}`}>Open {occasion.name}</Link>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
