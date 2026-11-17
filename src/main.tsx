import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AppProvider } from "./state/AppState";
import { App } from "./App";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/reminders.css";
createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <AppProvider>
      <App />
    </AppProvider>
  </HashRouter>,
);
