import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AppProvider } from "./state/AppState";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { AnalyticsTracker } from "./analytics/AnalyticsTracker";
import { initAnalytics } from "./analytics/analytics";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/reminders.css";
import "./styles/people-events.css";
import "./styles/design-refresh.css";
import "./styles/portrait-gallery.css";
import "./styles/ideas-refresh.css";
import "./styles/notifications.css";
import "./styles/analytics.css";
import "./styles/home-polish.css";
import "./styles/home-iteration.css";
import "./styles/home-approved-v4.css";
import "./styles/auth.css";
import "./styles/onboarding-v2.css";
import "./styles/onboarding-tour.css";
import "./styles/home-budget-auth-v6.css";
initAnalytics();
createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <AuthProvider>
      <AnalyticsTracker />
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </HashRouter>,
);

import "./styles/event-detail-v2.css";
import "./styles/event-overview-polish.css";
import "./styles/gift-onboarding-polish.css";

import "./styles/settings.css";
import "./styles/empty-states.css";
