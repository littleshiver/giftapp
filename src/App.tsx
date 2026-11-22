import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Navigation, CreateMenu } from "./components/UI";
import { EditorSheet } from "./components/EditorSheet";
import { GiftPreviewSheet, GiftDetailPage } from "./components/GiftPreview";
import { Onboarding } from "./pages/Onboarding";
import { OnboardingGuide } from "./components/OnboardingGuide";
import { Components } from "./pages/Components";
import { Home } from "./pages/Home";
import { Events } from "./pages/Events";
import { People } from "./pages/People";
import { Ideas } from "./pages/Ideas";
import { Settings } from "./pages/Settings";
import { SettingsBudgets, SettingsHolidays, SettingsAbout, SettingsDeveloper } from "./pages/SettingsSections";
import { Account } from "./pages/Account";
import { EventDetail, PersonDetail } from "./pages/Details";
import { useApp } from "./state/AppState";
import { useAuth } from "./auth/AuthContext";
import { Welcome } from "./pages/Welcome";
function AuthLoading({ failed }: { failed?: boolean }) {
  return <div className="auth-gate-loading" role={failed ? "alert" : "status"}>
    <strong>{failed ? "Could not load your account" : "Getting your gifts ready…"}</strong>
    <p>{failed ? "Check your connection and try again. Your saved gifts have not been deleted." : "Your plans are being loaded securely."}</p>
    {failed && <button type="button" className="button-secondary" onClick={() => window.location.reload()}>Try again</button>}
  </div>;
}

/** Only verified Firebase sessions can enter the real app. */
export function App() {
  const auth = useAuth();
  const { accountDataUid, syncStatus, data, tour } = useApp();
  const location = useLocation();
  if (auth.status === "loading") return <AuthLoading />;
  if (auth.status !== "signed-in" && auth.status !== "testing") {
    const intended = location.pathname + location.search;
    return <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/account" element={<Account />} />
      <Route path="*" element={<Navigate to={`/welcome?next=${encodeURIComponent(intended)}`} replace />} />
    </Routes>;
  }
  // Do not render old guest records or data from another account while loading.
  if (auth.status === "signed-in" && auth.user && accountDataUid !== auth.user.uid)
    return <AuthLoading failed={syncStatus === "error"} />;
  // New accounts go through the tour even when opening a deep link.
  if (auth.status === "signed-in" && syncStatus !== "loading" && !tour && !data.settings.onboardingComplete &&
      !data.people.length && !data.events.length && !data.gifts.length &&
      !data.ideas.length && location.pathname !== "/onboarding" && location.pathname !== "/account")
    return <Navigate to="/onboarding" replace />;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { data, editor, giftPreviewId, closeGiftPreview, openGiftPreview, ui, tour, warning, upgradeNotice, closeEditor, openEditor, syncStatus, budgetsEnabled } = useApp(),
    location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    closeEditor();
    closeGiftPreview();
    // Deep-linked Home gift actions land on the real occasion page first,
    // then open its read-only gift sheet. This also works on reload/back.
    const occasionId = location.pathname.match(/^\/events\/([^/]+)$/)?.[1];
    if (!occasionId || !data.events.some((e) => e.id === occasionId)) return;
    const query = new URLSearchParams(location.search);
    const giftId = query.get("gift");
    if (giftId && data.gifts.some((g) => g.id === giftId && g.eventId === occasionId)) {
      openGiftPreview(giftId);
    } else if (query.get("addGift") === "1") {
      openEditor({ type: "gift", eventId: occasionId });
    }
  }, [location.pathname, location.search]);
  return (
    <div className="app-shell" data-guided-step={tour?.step || undefined} data-budgets={budgetsEnabled ? "on" : "off"}>
      <div inert={!!(editor || giftPreviewId || tour?.step === "complete")} aria-hidden={editor || giftPreviewId || tour?.step === "complete" ? true : undefined}>
        <main className={[
          "app-main",
          location.pathname === "/" ? "app-main-home" : "",
          location.pathname === "/ideas" ? "app-main-ideas" : "",
          location.pathname.startsWith("/people/") ? "app-main-profile" : "",
          location.pathname.startsWith("/events/") ? "app-main-event-detail" : "",
        ].filter(Boolean).join(" ")}>
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
              <Link data-ph="upgrade-review-backups" to="/settings">Review and export backups</Link>
            </details>
          )}
          <Routes>
            <Route
              path="/"
              element={
                !warning &&
                !tour &&
                // Wait for a signed-in account to load before deciding the
                // user is new (a fresh device starts with an empty cache).
                syncStatus !== "loading" &&
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
            <Route path="/gifts/:id" element={<GiftDetailPage />} />
            <Route path="/people" element={<People />} />
            <Route path="/people/:id" element={<PersonDetail />} />
            <Route path="/ideas" element={<Ideas />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/budgets" element={<SettingsBudgets />} />
            <Route path="/settings/holidays" element={<SettingsHolidays />} />
            <Route path="/settings/about" element={<SettingsAbout />} />
            <Route path="/settings/developer" element={<SettingsDeveloper />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/account" element={<Account />} />
            <Route path="/welcome" element={<Navigate to="/" replace />} />
            {import.meta.env.DEV && (
              <Route path="/components" element={<Components />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        {location.pathname !== "/onboarding" && (
          <>
            <Navigation />
            {/* Account is a settings screen: no "add" action there. */}
            {location.pathname !== "/account" && !location.pathname.startsWith("/settings") && !(location.pathname === "/ideas" && ui.ideasTab === "discover") && <CreateMenu />}
          </>
        )}
      </div>
      <OnboardingGuide />
      <GiftPreviewSheet />
      {editor && (
        <EditorSheet
          key={`${editor.type}-${editor.id || "new"}-${editor.prefill?.id || ""}`}
        />
      )}
    </div>
  );
}
