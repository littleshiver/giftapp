import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { HomeBrand } from "../components/HomeBrand";
import { Button } from "../components/Primitives";
import { finishFirstRun } from "../domain/onboardingJourney";
import { useApp } from "../state/AppState";

/** One quiet introduction. All interactive training happens in the real app. */
export function Onboarding() {
  const { data, commit, startTour } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preview = params.has("preview");
  const start = () => {
    startTour(preview);
    navigate("/", { replace: true });
  };
  const explore = () => {
    if (!preview && commit(finishFirstRun(data))) navigate("/", { replace: true });
  };
  return (
    <div className="guided-onboarding">
      <header className="guided-topbar"><HomeBrand /></header>
      <div className="guided-content">
        <section className="guided-stage guided-intro">
          <div className="guided-intro-accent" aria-hidden="true"/>
          <h1>All your gifts, in one place.</h1>
          <p>Remember birthdays and special occasions. Find gifts, save ideas for later and decide who they're for.</p>
          <p>Plan what to buy and keep track of what's ready before the big day.</p>
          <div className="guided-actions">
            <Button type="button" data-ph="onboarding-get-started"
              className="button-full guided-primary" onClick={start}>
              Try in the app <ArrowRight size={18}/>
            </Button>
            {!preview && (
              <button type="button" className="guided-text-action" onClick={explore}>
                Explore on my own
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
