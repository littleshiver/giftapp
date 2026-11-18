import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Navigation, CreateMenu } from "./components/UI";
import { EditorSheet } from "./components/EditorSheet";
import { Onboarding } from "./pages/Onboarding";
import { Components } from "./pages/Components";
import { Home } from "./pages/Home";
import { Events } from "./pages/Events";
import { People } from "./pages/People";
import { Ideas } from "./pages/Ideas";
import { Settings } from "./pages/Settings";
import { Account } from "./pages/Account";
import { EventDetail, PersonDetail } from "./pages/Details";
import { useApp } from "./state/AppState";
export function App() {
  const { data, editor, warning, upgradeNotice, closeEditor, openEditor } = useApp(),
    location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    closeEditor();
    // Deep-linked Home gift actions land on the real occasion page first,
    // then open its existing editor sheet. This also works on reload/back.
    const occasionId = location.pathname.match(/^\/events\/([^/]+)$/)?.[1];
    if (!occasionId || !data.events.some((e) => e.id === occasionId)) return;
    const query = new URLSearchParams(location.search);
    const giftId = query.get("gift");
    if (giftId && data.gifts.some((g) => g.id === giftId && g.eventId === occasionId)) {
      openEditor({ type: "gift", id: giftId });
    } else if (query.get("addGift") === "1") {
      openEditor({ type: "gift", eventId: occasionId });
    }
  }, [location.pathname, location.search]);
  return (
    <div className="app-shell">
      <div inert={!!editor} aria-hidden={editor ? true : undefined}>
        <main className={location.pathname === "/" ? "app-main app-main-home" : "app-main"}>
          {warning && (
            <div className="notice" role="alert">
              {warning}
            </div>
          )}
          {upgradeNotice && (
            <details className="notice">
              <summary>Saved data upgrade preview</summary>
              <p>
                Your old storage is untouched. Ideas are now independent;
                Planned becomes To buy and Given becomes Bought. Original
                records remain in backups. A version 3 copy is written only when
                you save a change.
              </p>
              <Link to="/settings">Review and export backups</Link>
            </details>
          )}
          <Routes>
            <Route
              path="/"
              element={
                !warning &&
                !data.settings.onboardingComplete &&
                !data.people.length &&
                !data.events.length &&
                !data.gifts.length &&
                !data.ideas.length ? (
                  <Navigate to="/onboarding" replace />
                ) : (
                  <Home />
                )
              }
            />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/people" element={<People />} />
            <Route path="/people/:id" element={<PersonDetail />} />
            <Route path="/ideas" element={<Ideas />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/account" element={<Account />} />
            {import.meta.env.DEV && (
              <Route path="/components" element={<Components />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        {location.pathname !== "/onboarding" && (
          <>
            <Navigation />
            <CreateMenu />
          </>
        )}
      </div>
      {editor && (
        <EditorSheet
          key={`${editor.type}-${editor.id || "new"}-${editor.prefill?.id || ""}`}
        />
      )}
    </div>
  );
}
