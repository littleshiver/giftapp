import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, Heart, Lightbulb, ShoppingBasket, Sparkles } from "lucide-react";
import { HomeBrand } from "../components/HomeBrand";
import { Button } from "../components/Primitives";
import { discoverySuggestions } from "../domain/discovery";
import { finishFirstRun } from "../domain/onboardingJourney";
import { useApp } from "../state/AppState";
import { useAuth } from "../auth/AuthContext";

/** One genuine welcome page. The rest of the tour happens inside real routes,
 * authentic FAB, real editor sheets, Discover, People and Events. */
export function Onboarding() {
  const { data, commit, startTour } = useApp();
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preview = params.has("preview");
  const start = () => {
    startTour(preview);
    navigate("/", { replace: true });
  };
  const explore = () => {
    if (preview) {
      navigate("/settings", { replace: true });
    } else if (commit(finishFirstRun(data))) {
      navigate("/", { replace: true });
    }
  };
  return (
    <div className="guided-onboarding">
      <header className="guided-topbar">
        <HomeBrand/>
        <button type="button" className="guided-skip"
          data-ph={preview ? "onboarding-back-to-settings" : "onboarding-explore-first"}
          onClick={explore}>{preview ? "Exit preview" : "Skip"}</button>
      </header>
      <div className="guided-content">
        <section className="guided-stage guided-intro">
          <div className="guided-kicker"><Sparkles size={15}/> Gifting made lighter</div>
          <h1>Great gifts, from first thought to finally bought.</h1>
          <p>Remember your people, collect ideas, plan occasions and keep your budget in sight. All in one place.</p>
          <div className="guided-intro-flow" aria-label="Your gift planning journey">
            <div className="guided-flow-snapshot guided-flow-idea">
              <img src={discoverySuggestions[1].image} alt="Cozy throw blanket"/>
              <Heart size={17} fill="currentColor" aria-hidden="true"/>
            </div>
            <div className="guided-flow-snapshot guided-flow-person">
              <span aria-hidden="true">👤</span>
              <strong>Someone special</strong>
              <small>Remember what they love</small>
            </div>
            <div className="guided-flow-snapshot guided-flow-gift">
              <ShoppingBasket size={24} aria-hidden="true"/>
              <strong>Ready to give</strong>
              <small>Plan, buy, done</small>
            </div>
          </div>
          <div className="guided-intro-steps">
            <span><Lightbulb size={15}/> Find an idea</span>
            <span><CalendarDays size={15}/> Pick an occasion</span>
            <span><Check size={15}/> Track the gift</span>
          </div>
          <div className="guided-actions">
            <Button type="button" data-ph="onboarding-get-started"
              className="button-full guided-primary" onClick={start}>
              Try in the app <ArrowRight size={17}/>
            </Button>
            <button type="button" className="guided-text-action" onClick={explore}>
              {preview ? "Back to Settings" : "Explore on my own"}
            </button>
            {!preview && auth.status === "guest" && (
              <Link to="/account?next=/" className="guided-text-action">
                Already have an account? Sign in
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
