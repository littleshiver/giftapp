import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, X } from "lucide-react";
import mug from "../assets/discovery/mug.jpg";
import candle from "../assets/discovery/candle.jpg";
import blanket from "../assets/discovery/blanket.jpg";

/** A miniature, non-interactive Discover demo. The SAME top snapshot tilts
 * toward a red full-image heart overlay, resets, then tilts toward a neutral
 * full-image X overlay. Its neighbors stay behind it; no arrows, buttons
 * or translation over the adjacent copy. */
export function HomeInspiration() {
  const visual = useRef<HTMLDivElement>(null);
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    const element = visual.current;
    if (!element || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setPlayed(true);
        observer.disconnect();
      }
    }, { threshold: .45 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <section className="home-inspiration" aria-labelledby="home-inspiration-title">
      <div className="home-inspiration-copy">
        <h2 id="home-inspiration-title">Need inspiration?</h2>
        <p>Discover gift ideas. Swipe right to save, left to skip.</p>
        <Link data-ph="home-explore-ideas" className="section-link home-inspiration-link" to="/ideas">
          Explore ideas <ArrowRight size={16} aria-hidden="true"/>
        </Link>
      </div>
      <div ref={visual} data-played={played}
        className={`home-inspiration-visual ${played ? "is-played" : ""}`}
        aria-hidden="true">
        <div className="home-swipe-card home-swipe-back home-swipe-back-one">
          <img src={candle} alt=""/>
        </div>
        <div className="home-swipe-card home-swipe-back home-swipe-back-two">
          <img src={blanket} alt=""/>
        </div>
        <div className="home-swipe-card home-swipe-front">
          <div className="home-swipe-image">
            <img src={mug} alt=""/>
          </div>
          <span className="home-swipe-caption" aria-hidden="true"/>
          <span className="home-swipe-overlay home-swipe-like">
            <Heart size={34} strokeWidth={1.9} fill="currentColor"/>
          </span>
          <span className="home-swipe-overlay home-swipe-dislike">
            <X size={37} strokeWidth={2.7}/>
          </span>
        </div>
      </div>
    </section>
  );
}
