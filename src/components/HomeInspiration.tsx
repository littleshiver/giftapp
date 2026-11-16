import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, X } from "lucide-react";
import mug from "../assets/discovery/mug.jpg";
import candle from "../assets/discovery/candle.jpg";

/** Decorative one-shot cue. It never loops or captures swipe gestures. */
export function HomeInspiration() {
  const visual = useRef<HTMLDivElement>(null);
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    const el = visual.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setPlayed(true);
        observer.disconnect();
      }
    }, { threshold: 0.55 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <section className="home-inspiration" aria-labelledby="home-inspiration-title">
      <div className="home-inspiration-copy">
        <h2 id="home-inspiration-title">Need inspiration?</h2>
        <p>Swipe through ideas. Save what you like.</p>
        <Link className="home-inspiration-link" to="/ideas">
          Explore ideas <ArrowRight size={17} aria-hidden="true"/>
        </Link>
      </div>
      <div ref={visual} className={"home-inspiration-visual" + (played ? " is-played" : "")}
        data-played={played} aria-hidden="true">
        <div className="home-swipe-card home-swipe-no">
          <img src={candle} alt=""/>
          <span className="home-swipe-icon home-swipe-x"><X size={18} strokeWidth={3}/></span>
        </div>
        <div className="home-swipe-card home-swipe-yes">
          <img src={mug} alt=""/>
          <span className="home-swipe-icon home-swipe-heart">
            <Heart size={18} strokeWidth={1.8} fill="currentColor"/>
          </span>
        </div>
      </div>
    </section>
  );
}
