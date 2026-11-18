import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  analyticsAvailable,
  capturePageview,
  getConsent,
  setAnalyticsUser,
  setConsent,
  subscribeConsent,
} from "./analytics";

export const useAnalyticsConsent = () =>
  useSyncExternalStore(subscribeConsent, getConsent, () => null);

/** Sends hash-route pageviews, keeps the Firebase uid in sync, asks for consent. */
export function AnalyticsTracker() {
  const location = useLocation(),
    auth = useAuth(),
    consent = useAnalyticsConsent();
  useEffect(() => {
    capturePageview(location.pathname);
  }, [location.pathname]);
  useEffect(() => {
    if (auth.status === "signed-in") setAnalyticsUser(auth.user?.uid ?? null);
    else if (auth.status === "guest") setAnalyticsUser(null);
  }, [auth.status, auth.user?.uid]);
  if (!analyticsAvailable || consent !== null) return null;
  return (
    <div className="consent-banner" role="dialog" aria-label="Analytics consent">
      <p>
        Help us improve Givvy? We'd like to collect anonymous usage stats, like
        which buttons get tapped. Names, dates and notes are never recorded.
      </p>
      <div className="consent-actions">
        <button data-ph="consent-deny" type="button" className="button-secondary" onClick={() => setConsent("denied")}>
          No thanks
        </button>
        <button data-ph="consent-allow" type="button" className="button-primary" onClick={() => setConsent("granted")}>
          Allow
        </button>
      </div>
    </div>
  );
}
