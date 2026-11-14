import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Navigation } from "./components/UI";
import { EditorSheet } from "./components/EditorSheet";
import { Home } from "./pages/Home";
import { Events } from "./pages/Events";
import { People } from "./pages/People";
import { Ideas } from "./pages/Ideas";
import { Settings } from "./pages/Settings";
import { EventDetail, PersonDetail } from "./pages/Details";
import { useApp } from "./state/AppState";
export function App() {
  const { editor, warning, closeEditor } = useApp(),
    location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    closeEditor();
  }, [location.pathname]);
  return (
    <div className="app">
      <main className="page">
        {warning && (
          <div className="notebox" role="alert">
            {warning}
          </div>
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
      {location.pathname !== "/settings" && <Navigation />}
      {editor && <EditorSheet key={`${editor.type}-${editor.id || "new"}`} />}
    </div>
  );
}
