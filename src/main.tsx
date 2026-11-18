import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AppProvider } from "./state/AppState";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthContext";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/reminders.css";
import "./styles/people-events.css";
import "./styles/design-refresh.css";
import "./styles/portrait-gallery.css";
createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </HashRouter>,
);
