import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronLeft, ChevronRight, LockKeyhole, X } from "lucide-react";
import { useApp, type TourStep } from "../state/AppState";
import { finishFirstRun } from "../domain/onboardingJourney";

const phases: TourStep[] = [
  "home-person", "person-profile", "discover", "calendar", "occasion", "gift-status", "complete",
];
function phaseIndex(step: TourStep): number {
  if (step === "home-menu") return 0;
  if (step === "discover-right" || step === "discover-recipient") return 2;
  return Math.max(0, phases.indexOf(step));
}

export function TourCoach() {
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
    <aside className={`tour-coach tour-coach-${tour.step} is-floating`}
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

type Rect = { left: number; top: number; right: number; bottom: number };
const targetSelectors: Partial<Record<TourStep, string[]>> = {
  "home-person": [".fab"],
  "home-menu": ['[data-ph="create-person"]'],
  "person-profile": [".person-profile-panel"],
  "discover": [".ideas-discovery-card", ".ideas-reaction.ideas-dislike"],
  "discover-right": [".ideas-discovery-card", ".ideas-reaction.ideas-like"],
  "discover-recipient": [".ideas-discovery-card"],
  "calendar": ['[data-guided-event="true"]'],
  "occasion": [".event-saved-ideas-choose"],
  "gift-status": ['[data-tour-gift="true"] .product-open'],
};

/** One viewport-level overlay. It never changes the geometry of a real page.
 * The cutout uses actual client rects and leaves pointer/swipe events untouched. */
function Spotlight({ step, children }: {step: TourStep; children: ReactNode}) {
  const location = useLocation();
  const coach = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{rect: Rect | null; top: number; left: number; visible: boolean} | null>(null);

  useLayoutEffect(() => {
    const shell = document.querySelector(".app-shell");
    if (!shell) return;
    let frame = 0;
    let lastTarget: Element | null = null;
    const update = () => {
      frame = 0;
      const w = window.innerWidth, h = window.innerHeight;
      const panel = coach.current;
      if (!panel) return;
      const visible = !shell.querySelector(".overlay");
      const candidates = (targetSelectors[step] || []).map(selector => shell.querySelector(selector))
        .filter((element): element is HTMLElement => element instanceof HTMLElement && element.getClientRects().length > 0);
      if (!candidates.length && step === "occasion") {
        const fallback = shell.querySelector(".event-gift-groups");
        if (fallback instanceof HTMLElement) candidates.push(fallback);
      }
      // The actual action is the priority; in Discover the whole card is also
      // exposed for gestures. Do not scroll or move its normal fixed stage.
      const target = candidates[candidates.length - 1];
      const discover = step.startsWith("discover");
      const nav = shell.querySelector("nav")?.getBoundingClientRect();
      const safeBottom = nav && nav.top > h / 2 ? nav.top - 8 : h - 12;
      if (visible && target && target !== lastTarget) {
        lastTarget = target;
        const r = target.getBoundingClientRect();
        if (!discover && (r.top < 12 || r.bottom > safeBottom)) {
          target.scrollIntoView({block:"center", inline:"nearest", behavior:"auto"});
        }
      }
      const rects = candidates.map(element => element.getBoundingClientRect());
      const clip = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
      const rect: Rect | null = rects.length ? {
        left: clip(Math.min(...rects.map(r=>r.left))-7,0,w),
        top: clip(Math.min(...rects.map(r=>r.top))-7,0,h),
        right: clip(Math.max(...rects.map(r=>r.right))+7,0,w),
        bottom: clip(Math.max(...rects.map(r=>r.bottom))+7,0,h),
      } : null;
      const pw = panel.offsetWidth || Math.min(330,w-24), ph = panel.offsetHeight || 150;
      const maxTop = Math.max(10,h-ph-12);
      let top = 12;
      if (rect) {
        const above = rect.top-ph-12, below = rect.bottom+12;
        if (above >= 10) top = above;
        else if (below+ph <= safeBottom) top = below;
        else if (below+ph <= h-10) top = below;
        else {
          // On a short phone, overlap non-interactive content rather than
          // scaling Discover or covering its reaction buttons.
          const action = target.getBoundingClientRect();
          top = action.top-ph-12 >= 10 ? action.top-ph-12 : action.bottom+12;
        }
      }
      top = clip(top,10,maxTop);
      const center = rect ? (rect.left+rect.right)/2 : w/2;
      const left = clip(center-pw/2,12,Math.max(12,w-pw-12));
      const next = {rect,top,left,visible};
      setLayout(old => JSON.stringify(old)===JSON.stringify(next) ? old : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = new ResizeObserver(schedule);
    resize.observe(shell);
    if (coach.current) resize.observe(coach.current);
    const mutation = new MutationObserver(schedule);
    mutation.observe(shell,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style","data-guided-event","data-tour-gift"]});
    window.addEventListener("scroll",schedule,true);
    window.addEventListener("resize",schedule);
    window.visualViewport?.addEventListener("resize",schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect(); mutation.disconnect();
      window.removeEventListener("scroll",schedule,true);
      window.removeEventListener("resize",schedule);
      window.visualViewport?.removeEventListener("resize",schedule);
    };
  },[step,location.pathname]);

  const rect = layout?.rect;
  return createPortal(
    <div className="tour-spotlight-layer" style={{visibility:layout?.visible ? "visible" : "hidden"}}>
      {rect && <div className="tour-spotlight-cutout" aria-hidden="true"
        style={{left:rect.left,top:rect.top,width:Math.max(0,rect.right-rect.left),height:Math.max(0,rect.bottom-rect.top)}}/>}
      {!rect && <div className="tour-spotlight-fallback" aria-hidden="true"/>}
      <div ref={coach} className="tour-spotlight-coach" style={{top:layout?.top ?? 12,left:layout?.left ?? 12}}>
        {children}
      </div>
    </div>,document.body);
}

function TourFinish() {
  const { tour, data, stopTour, commit } = useApp();
  const navigate = useNavigate();
  if (!tour || tour.step !== "complete") return null;
  const finish = () => {
    if (tour.preview) {
      stopTour();
      navigate("/settings", {replace: true});
    } else if (commit(finishFirstRun(data))) {
      stopTour();
      navigate("/", {replace: true});
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
          <div><strong>Your gifts, all in one place</strong>
          <span>{tour.preview ? "Preview finished — your personal data is unchanged." : "Your plans are saved to your account and available on your other devices."}</span></div>
        </div>
        <button type="button" className="tour-finish-guest" onClick={finish}>
          Go to Home <ArrowRight size={18}/>
        </button>
        <small>You're always free to export your data from Settings.</small>
      </section>
    </div>
  );
}

/** Watches real route transitions; the tour is exclusively a viewport overlay. */
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
  return <Spotlight key={tour.step} step={tour.step}><TourCoach/></Spotlight>;
}
