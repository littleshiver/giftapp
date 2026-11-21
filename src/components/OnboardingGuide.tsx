import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Gift, Heart, LockKeyhole, Sparkles, UsersRound, X } from "lucide-react";
import { useApp } from "../state/AppState";
import { useAuth } from "../auth/AuthContext";
import { finishFirstRun } from "../domain/onboardingJourney";

/** Small contextual coachmarks over REAL application pages. There is no
 * duplicate profile, Discover card, calendar or gift editor here. */
export function OnboardingGuide() {
  const { tour, updateTour, stopTour, data, editor, commit, setUi, openEditor } = useApp();
  const { status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const event = data.events.find(e => e.id === tour?.eventId);
  const person = data.people.find(p => p.id === tour?.personId);
  const idea = data.ideas.find(i => i.id === tour?.ideaId);
  const gift = data.gifts.find(g => g.id === tour?.giftId);

  useEffect(() => {
    if (!tour) return;
    if (tour.step === "person-profile" && person) {
      const birthday = data.events.find(e =>
        e.kind === "birthday" && e.people.length === 1 && e.people[0] === person.id);
      if (birthday && birthday.id !== tour.eventId) updateTour({ eventId: birthday.id });
    }
    if (tour.step === "calendar" && event &&
      location.pathname === `/events/${event.id}`) {
      updateTour({ step: "occasion" });
    }
    if (tour.step === "gift-status" && gift?.status === "bought") {
      updateTour({ step: "complete" });
    }
  }, [tour?.step, tour?.eventId, location.pathname, person?.id, event?.id, gift?.status]);

  if (!tour || location.pathname === "/onboarding") return null;

  const finish = (destination: string) => {
    if (tour.preview) {
      stopTour();
      navigate("/settings", { replace: true });
      return;
    }
    if (commit(finishFirstRun(data))) {
      stopTour();
      navigate(destination, { replace: true });
    }
  };
  const skip = () => finish(location.pathname);
  const guide = {
    "home-person": {
      title: "Let's add your first person",
      copy: "On Home, tap the + button and choose Add person. Enter their name and birthday. Photo and year are optional.",
      action: location.pathname !== "/" ? "Go to Home" : "",
      perform: () => navigate("/"),
    },
    "person-profile": {
      title: `Here's ${person?.name || "your person"}!`,
      copy: "This is their real profile. Their birthday was added to Events automatically; you can keep gift preferences here too.",
      action: "Find a gift idea",
      perform: () => {
        setUi({ ideasTab: "discover", filterPerson: tour.personId || "all" });
        updateTour({ step: "discover" });
        navigate("/ideas");
      },
    },
    "discover": {
      title: "Find something they might love",
      copy: `On Discover, swipe right or tap the heart, then save the idea for ${person?.name || "your person"}.`,
      action: location.pathname !== "/ideas" ? "Open Discover" : "",
      perform: () => {
        setUi({ ideasTab: "discover" });
        navigate("/ideas");
      },
    },
    "calendar": {
      title: "Their birthday is in Events",
      copy: "You're looking at the real calendar. Tap the birthday card to open the occasion and plan a gift.",
      action: location.pathname !== "/events" ? "Open Events" : "",
      perform: () => {
        if (event) setUi({ month: event.date, selected: event.date, mode: "calendar" });
        navigate("/events");
      },
    },
    "occasion": {
      title: "Turn your idea into a plan",
      copy: `Your saved idea stays in Ideas. Add it to ${event?.name || "this occasion"} and it becomes a To buy gift.`,
      action: "Choose saved idea",
      perform: () => {
        if (event) {
          navigate(`/events/${event.id}`);
          setUi({ giftPickerEventId: event.id });
        }
      },
    },
    "gift-status": {
      title: "Now it's on the shopping list",
      copy: `${idea?.name || "The gift"} is marked To buy. Open its real card to change the status to Bought when you actually purchase it.`,
      action: gift ? "Open gift" : "",
      perform: () => {
        if (gift) openEditor({ type: "gift", id: gift.id });
      },
    },
    "complete": {
      title: "You've got the hang of it!",
      copy: tour.preview
        ? "That's the full journey through the real app. Your preview stays separate from your own data."
        : "Your person, saved idea and planned gift are ready. You can keep going without an account.",
      action: "",
      perform: () => undefined,
    },
  }[tour.step];

  // Native sheets hold focus, so coachmarks stand aside while the user works.
  if (editor) return null;

  const isComplete = tour.step === "complete";
  return (
    <aside className={`tour-coach tour-coach-${tour.step}`}
      data-tour-step={tour.step}
      aria-label="Givvy walkthrough" role="region">
      <div className="tour-coach-header">
        <span className="tour-coach-eyebrow"><Sparkles size={14}/> Quick tour</span>
        <button type="button" className="tour-coach-close"
          aria-label={tour.preview ? "Exit tutorial preview" : "Skip tutorial"}
          onClick={skip}><X size={17}/></button>
      </div>
      <h2>{guide.title}</h2>
      <p>{guide.copy}</p>
      {tour.step === "home-person" && location.pathname === "/" && (
        <span className="tour-coach-hint"><UsersRound size={15}/> Tap + → Add person</span>
      )}
      {tour.step === "discover" && location.pathname === "/ideas" && (
        <span className="tour-coach-hint"><Heart size={15}/> Try the actual Discover card</span>
      )}
      {tour.step === "calendar" && location.pathname === "/events" && (
        <span className="tour-coach-hint"><Gift size={15}/> Tap {event?.name || "the birthday"}</span>
      )}
      {tour.step === "gift-status" && (
        <button type="button" className="tour-coach-skip-status" onClick={() => updateTour({step:"complete"})}>
          I'll mark it bought later
        </button>
      )}
      {!!guide.action && <button type="button" className="tour-coach-primary"
        onClick={guide.perform}>{guide.action}<ArrowRight size={16}/></button>}
      {isComplete && (
        <div className="tour-coach-finish">
          {!tour.preview && status === "guest" && (
            <button type="button" className="tour-coach-primary"
              onClick={() => finish("/account?mode=sign-up&next=/")}>
              <LockKeyhole size={15}/> Create free account <ArrowRight size={16}/>
            </button>
          )}
          <button type="button" className="tour-coach-secondary"
            onClick={() => finish(tour.preview ? "/settings" : "/")}>
            <Check size={16}/> {tour.preview ? "Back to Settings" : status === "guest" ? "Continue as guest" : "Go to Home"}
          </button>
          {!tour.preview && status === "guest" && (
            <small>Free accounts sync across devices. Guests can export a backup in Settings.</small>
          )}
        </div>
      )}
      {!isComplete && (
        <button type="button" className="tour-coach-skip" onClick={skip}>
          {tour.preview ? "Exit preview" : "Skip tour"}
        </button>
      )}
    </aside>
  );
}
