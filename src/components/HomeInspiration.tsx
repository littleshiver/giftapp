import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, X } from "lucide-react";
import blanket from "../assets/discovery/blanket-hires.jpg";
import romantic from "../assets/events/cover-romantic.jpg";
import winter from "../assets/events/cover-winter.jpg";

/** The full block navigates to Discover. Decorative Polaroids teach the
 * right/heart and left/X gesture without taking focus from the link. */
export function HomeInspiration() {
  const visual = useRef<HTMLDivElement>(null);
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    const element = visual.current;
    if (!element || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(({ isIntersecting }) => isIntersecting)) {
        setPlayed(true);
        observer.disconnect();
      }
    }, { threshold: 0.45 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <section className="home-inspiration" aria-labelledby="home-inspiration-title">
      <Link to="/ideas" data-ph="home-explore-ideas"
        className="home-inspiration-link home-inspiration-taparea">
        <div className="home-inspiration-copy">
          <h2 id="home-inspiration-title">Need inspiration?</h2>
          <p>We’ve collected gift ideas for every occasion.</p>
          <span className="home-inspiration-cta">
            Explore ideas <ArrowRight size={16} aria-hidden="true"/>
          </span>
        </div>
        <div ref={visual} data-played={played}
          className={`home-inspiration-visual ${played ? "is-played" : ""}`}
          aria-hidden="true">
          <div className="home-swipe-card home-swipe-back home-swipe-back-one">
            <div className="home-swipe-image"><img src={romantic} alt=""/></div>
            <span className="home-swipe-caption" />
          </div>
          <div className="home-swipe-card home-swipe-back home-swipe-back-two">
            <div className="home-swipe-image"><img src={winter} alt=""/></div>
            <span className="home-swipe-caption" />
          </div>
          <div className="home-swipe-card home-swipe-front">
            <div className="home-swipe-image">
              <img src={blanket} alt=""/>
              <span className="home-swipe-overlay home-swipe-like">
                <Heart size={34} strokeWidth={1.9} fill="currentColor"/>
              </span>
              <span className="home-swipe-overlay home-swipe-dislike">
                <X size={37} strokeWidth={2.7}/>
              </span>
            </div>
            <span className="home-swipe-caption" />
          </div>
        </div>
      </Link>
    </section>
  );
}
