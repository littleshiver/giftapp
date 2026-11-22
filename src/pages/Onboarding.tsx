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
          <h1>Your first gift plan starts here.</h1>
          <p>Let’s make your first gift plan. Add someone you care about, then explore ideas and occasions together.</p>
          <p>Or skip the guide and explore Givvy at your own pace.</p>
          <div className="guided-actions">
            <Button type="button" data-ph="onboarding-get-started"
              className="button-full guided-primary" onClick={start}>
              Start guided tour <ArrowRight size={18}/>
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
