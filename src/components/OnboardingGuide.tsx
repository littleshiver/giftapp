import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronLeft, ChevronRight, LockKeyhole, X } from "lucide-react";
import { useApp, type TourStep } from "../state/AppState";
import { useAuth } from "../auth/AuthContext";
import { finishFirstRun } from "../domain/onboardingJourney";

const phases: TourStep[] = [
  "home-person", "person-profile", "discover", "calendar", "occasion", "gift-status", "complete",
];
function phaseIndex(step: TourStep): number {
  if (step === "home-menu") return 0;
  if (step === "discover-right" || step === "discover-recipient") return 2;
  return Math.max(0, phases.indexOf(step));
}

export function TourCoach({ inline = false }: { inline?: boolean }) {
  const { tour, updateTour, stopTour, data, commit, setUi, giftPreviewId, openGiftPreview } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const person = data.people.find(p => p.id === tour?.personId);
  const event = data.events.find(e => e.id === tour?.eventId);
  const gift = data.gifts.find(g => g.id === tour?.giftId);
  if (!tour) return null;

  const finish = () => {
    if (tour.preview) {
      stopTour();
      navigate("/settings", { replace: true });
    } else if (commit(finishFirstRun(data))) {
      stopTour();
      navigate(location.pathname, { replace: true });
    }
  };
  const toDiscover = () => {
    setUi({ ideasTab: "discover", filterPerson: tour.personId || "all" });
    updateTour({ step: "discover" });
    navigate("/ideas");
  };
  const toCalendar = () => {
    if (event) setUi({ month: event.date, selected: event.date, mode: "calendar" });
    updateTour({ step: "calendar" });
    navigate("/events");
  };
  const toOccasion = () => {
    if (!event) return;
    updateTour({ step: "occasion" });
    navigate(`/events/${event.id}`);
  };
  const next = () => {
    switch(tour.step) {
      case "home-person":
        updateTour({ step: "home-menu" });
        break;
      case "home-menu":
        updateTour({ step: "complete" });
        break;
      case "person-profile":
        toDiscover();
        break;
      case "discover":
        updateTour({ step: "discover-right" });
        break;
      case "discover-right":
      case "discover-recipient":
        toCalendar();
        break;
      case "calendar":
        toOccasion();
        break;
      case "occasion":
        if (gift) updateTour({ step: "gift-status" });
        else updateTour({ step: "complete" });
        break;
      case "gift-status":
        updateTour({ step: "complete" });
        break;
      default:
        break;
    }
  };
  const back = () => {
    switch(tour.step) {
      case "home-menu": updateTour({ step: "home-person" }); break;
      case "discover-right": updateTour({ step: "discover" }); break;
      case "calendar":
        updateTour({ step: "discover-right" });
        setUi({ ideasTab: "discover" });
        navigate("/ideas");
        break;
      case "occasion": toCalendar(); break;
      case "gift-status": toOccasion(); break;
      default: break;
    }
  };
  const copy: Partial<Record<TourStep, {title:string; body:string; button?:string; action?:()=>void}>> = {
    "home-person": { title: "I'll show you around", body: "This + is where you add people. Give it a tap!" },
    "home-menu": { title: "That's it!", body: "Now choose Add person.", },
    "person-profile": {
      title: `Here's ${person?.name || "your person"}`,
      body: "Their profile is ready, and their birthday is already in Events.",
      button: "Let's find an idea", action: toDiscover,
    },
    "discover": {
      title: "First, try swiping left",
      body: "Not quite right? Swipe the card left, or tap ×.",
      button: "Skip this practice", action: () => updateTour({ step: "discover-right" }),
    },
    "discover-right": {
      title: "Now swipe right",
      body: "Like an idea? Swipe right or tap the heart to save it.",
    },
    "discover-recipient": {
      title: "Choose who it's for",
      body: `Save this idea for ${person?.name || "your person"} — or keep it for anyone.`,
    },
    "calendar": {
      title: "Birthday added!",
      body: `Open ${event?.name || "the birthday"} to plan a gift.`,
    },
    "occasion": {
      title: "Time to plan",
      body: "Your saved idea is right here. Choose it to add a To buy gift.",
      button: "Choose saved idea",
      action: () => { if (event) setUi({ giftPickerEventId: event.id }); },
    },
    "gift-status": {
      title: "Here's your gift",
      body: "Open its details to see everything and track the purchase.",
      button: gift ? "View gift" : undefined,
      action: () => { if (gift) openGiftPreview(gift.id); },
    },
  };
  const item=copy[tour.step];
  if (!item) return null;
  const canBack = ["home-menu","discover-right","calendar","occasion","gift-status"].includes(tour.step);
  const isInitial = ["home-person","home-menu"].includes(tour.step);
  return (
    <aside className={`tour-coach tour-coach-${tour.step} ${inline ? "is-inline" : "is-floating"}`}
      role="region" aria-label="Givvy walkthrough" data-tour-step={tour.step}>
      <div className="tour-coach-header">
        <span className="tour-coach-eyebrow">Quick tour · {phaseIndex(tour.step) + 1} of {phases.length}</span>
        <button type="button" className="tour-coach-close"
          aria-label={tour.preview ? "Exit tutorial preview" : "Skip tutorial"}
          onClick={finish}><X size={16}/></button>
      </div>
      <h2>{item.title}</h2>
      <p>{item.body}</p>
      {item.button && !giftPreviewId && (
        <button type="button" className="tour-coach-primary"
          onClick={item.action}>{item.button}<ArrowRight size={15}/></button>
      )}
      <div className="tour-coach-nav" role="group" aria-label="Tour steps">
        <button type="button" aria-label="Previous tour step" disabled={!canBack} onClick={back}>
          <ChevronLeft size={18}/>
        </button>
        <div className="tour-coach-dots" aria-label={`Step ${phaseIndex(tour.step)+1} of ${phases.length}`}>
          {phases.map((phase, index) => <span key={phase} className={index<=phaseIndex(tour.step) ? "is-active" : ""}/>)}
        </div>
        <button type="button" aria-label="Next tour step" onClick={next}
          title={isInitial ? "Continue the tour" : "Next step"}>
          <ChevronRight size={18}/>
        </button>
      </div>
    </aside>
  );
}

export function TourInline({ step }: { step: TourStep }) {
  const { tour, editor, giftPreviewId } = useApp();
  if (!tour || tour.step !== step || editor || giftPreviewId) return null;
  return <TourCoach inline/>;
}

function TourFinish() {
  const { tour, data, stopTour, commit } = useApp();
  const { status } = useAuth();
  const navigate = useNavigate();
  if (!tour || tour.step !== "complete") return null;
  const finish = (signUp: boolean) => {
    if (tour.preview) {
      stopTour();
      navigate(signUp ? "/account?preview=sign-up" : "/settings", {replace: true});
    } else if (commit(finishFirstRun(data))) {
      stopTour();
      navigate(signUp ? "/account?mode=sign-up&next=/" : "/", {replace: true});
    }
  };
  return (
    <div className="tour-finish-screen">
      <section className="tour-finish-card" role="dialog" aria-modal="true" aria-label="Tutorial complete">
        <div className="tour-finish-check"><Check size={32}/></div>
        <h2>You've got this!</h2>
        <p>{data.gifts.some(g => g.id === tour.giftId)
          ? "You've added a person, saved an idea and planned your first gift."
          : "You've explored how to keep people, ideas and occasions together. Your next gift plan is one step away."}</p>
        <div className="tour-finish-sync">
          <LockKeyhole size={20}/>
          <div><strong>Keep your gift plans with you</strong>
          <span>Create a free account to sync them across your devices. No payment needed.</span></div>
        </div>
        {(status === "guest" || tour.preview) && (
          <button type="button" className="tour-finish-signup" onClick={() => finish(true)}>
            Create free account <ArrowRight size={18}/>
          </button>
        )}
        <button type="button" className="tour-finish-guest" onClick={() => finish(false)}>
          {status === "guest" ? "Continue as guest" : "Go to Home"}
        </button>
        <small>You're always free to export your data from Settings.</small>
      </section>
    </div>
  );
}

/** Watches route-level transitions; inline tips live beside real UI targets. */
export function OnboardingGuide() {
  const { tour, data, updateTour, editor, giftPreviewId } = useApp();
  const location=useLocation();
  const event=data.events.find(e=>e.id===tour?.eventId);
  const person=data.people.find(p=>p.id===tour?.personId);
  const gift=data.gifts.find(g=>g.id===tour?.giftId);

  useEffect(()=>{
    if (!tour) return;
    if (tour.step==="person-profile" && person) {
      const birthday=data.events.find(e=>e.kind==="birthday" && e.people.length===1 && e.people[0]===person.id);
      if (birthday && birthday.id!==tour.eventId) updateTour({eventId:birthday.id});
    }
    if (tour.step==="calendar" && event && location.pathname===`/events/${event.id}`) updateTour({step:"occasion"});
    if (tour.step==="gift-status" && gift?.status==="bought" && !giftPreviewId) updateTour({step:"complete"});
  },[tour?.step,tour?.eventId,location.pathname,person?.id,event?.id,gift?.status,giftPreviewId]);

  if (!tour || location.pathname==="/onboarding") return null;
  if (tour.step==="complete") return <TourFinish/>;
  if (editor || giftPreviewId) return null;
  if (tour.step==="home-person" || tour.step==="home-menu") return <TourCoach/>;
  return null;
}
