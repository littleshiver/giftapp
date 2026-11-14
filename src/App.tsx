import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Navigation, CreateMenu } from "./components/UI";
import { EditorSheet } from "./components/EditorSheet";
import { Home } from "./pages/Home";
import { Events } from "./pages/Events";
import { People } from "./pages/People";
import { Ideas } from "./pages/Ideas";
import { Settings } from "./pages/Settings";
import { EventDetail, PersonDetail } from "./pages/Details";
import { useApp } from "./state/AppState";
export function App() {
  const { editor, warning, upgradeNotice, closeEditor } = useApp(),
    location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    closeEditor();
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <div inert={!!editor} aria-hidden={editor ? true : undefined}>
        <main className="app-main">
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
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/people" element={<People />} />
            <Route path="/people/:id" element={<PersonDetail />} />
            <Route path="/ideas" element={<Ideas />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Navigation />
        <CreateMenu />
      </div>
      {editor && (
        <EditorSheet
          key={`${editor.type}-${editor.id || "new"}-${editor.prefill?.id || ""}`}
        />
      )}
    </div>
  );
}
