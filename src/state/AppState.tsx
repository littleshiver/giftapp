import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppData, Editor } from "../domain/models";
import { today } from "../utils/format";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { ensureBirthdayOccasions } from "../domain/birthdays";
import { load, write } from "../persistence/storage";
import { initialData } from "../domain/initial";
import { useAuth } from "../auth/AuthContext";
import {
  hasContent,
  loadRemote,
  mergeGuestInto,
  subscribe,
  writeDiff,
} from "../sync/cloud";

export type SyncStatus = "local" | "loading" | "synced" | "saving" | "error";
const ACCOUNT_CACHE = (uid: string) => `givvy_account_${uid}`;
const GUEST_BACKUP_KEY = "givvy_guest_backup_v3";
function readCache(uid: string): AppData | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_CACHE(uid));
    return raw ? (JSON.parse(raw) as AppData) : null;
  } catch {
    return null;
  }
}
function writeCache(uid: string, data: AppData) {
  try {
    localStorage.setItem(ACCOUNT_CACHE(uid), JSON.stringify(data));
  } catch {
    /* Cache is optional; Firestore keeps its own offline copy. */
  }
}
import { emptyDemo, filledDemo } from "../domain/demo";

export type PreviewMode = "my" | "empty" | "filled";
export type TourStep = "home-person" | "person-profile" | "discover" | "calendar" | "occasion" | "gift-status" | "complete";
export interface TourState {
  step: TourStep;
  preview: boolean;
  /** Return to the exact Settings sandbox the user was using before preview. */
  restoreMode: PreviewMode;
  peopleBefore: string[];
  personId?: string;
  eventId?: string;
  ideaId?: string;
  giftId?: string;
}
const TOUR_KEY = "givvy_guided_tour_v2";
const PREVIEW_KEY = "givvy_preview_mode";
interface UiState {
  selectedEvent: string;
  mode: string;
  selected: string;
  month: string;
  suggestionIndex: number;
  filterPerson: string;
  ideasTab: "discover" | "saved";
  greetingDismissed: boolean;
  /** UI-only request: open recipient / saved-idea chooser from global FAB. */
  giftPickerEventId: string;
}
interface State {
  upgradeNotice: boolean;
  ui: UiState;
  setUi: (patch: Partial<UiState>) => void;
  data: AppData;
  personalData: AppData;
  previewMode: PreviewMode;
  setPreviewMode: (mode: PreviewMode) => void;
  commit: (data: AppData, recovery?: boolean) => boolean;
  /** "local" for guests; otherwise the state of the account sync. */
  syncStatus: SyncStatus;
  editor: Editor | null;
  tour: TourState | null;
  startTour: (preview: boolean) => void;
  updateTour: (patch: Partial<TourState>) => void;
  stopTour: () => void;
  openEditor: (e: Editor) => void;
  closeEditor: () => void;
  notify: (
    s: string,
    tone?: "success" | "error" | "info",
    options?: { persistent?: boolean },
  ) => void;
  warning: string;
}
const Context = createContext<State | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [ui, updateUi] = useState<UiState>(() => ({
    selectedEvent: "",
    mode: "calendar",
    selected: today(),
    month: today(),
    suggestionIndex: 0,
    filterPerson: "all",
    ideasTab: "discover",
    greetingDismissed: false,
    giftPickerEventId: "",
  }));
  const setUi = (patch: Partial<UiState>) =>
    updateUi((current) => ({ ...current, ...patch }));
  const [loaded] = useState(() => {
    const result = load();
    return { ...result, data: ensureBirthdayOccasions(result.data) };
  }),
    [personalData, setPersonalData] = useState(loaded.data),
    [upgradeNotice, setUpgradeNotice] = useState(loaded.upgraded),
    [blocked, setBlocked] = useState(loaded.blocked),
    [warning, setWarning] = useState(loaded.warning);
  const auth = useAuth(),
    uid = auth.status === "signed-in" ? auth.user!.uid : null,
    [syncStatus, setSyncStatus] = useState<SyncStatus>(
      auth.status === "loading" ? "loading" : "local",
    ),
    /** Last version known to be in Firestore: the base for diffs. */
    remote = useRef<AppData | null>(null),
    accountUid = useRef<string | null>(null);
  useEffect(() => {
    if (auth.status === "loading") return;
    if (!uid) {
      if (accountUid.current) {
        // Signed out: show this browser's guest data again (empty after a
        // migration), never the previous account's lists.
        accountUid.current = null;
        remote.current = null;
        setEditor(null);
        setPersonalData(ensureBirthdayOccasions(load().data));
      }
      setSyncStatus("local");
      return;
    }
    accountUid.current = uid;
    let stop: (() => void) | undefined,
      cancelled = false;
    setSyncStatus("loading");
    const cached = readCache(uid);
    if (cached) setPersonalData(ensureBirthdayOccasions(cached));
    (async () => {
      const current = await loadRemote(uid);
      if (cancelled) return;
      const guest = load();
      if (
        !guest.blocked &&
        (hasContent(guest.data) || (!current && guest.data.settings.onboardingComplete))
      ) {
        // Everything entered as a guest (including onboarding) moves into
        // the account, then the guest copy is cleared so it can't be merged
        // into a different account later. A raw backup stays in this browser.
        const merged = ensureBirthdayOccasions(mergeGuestInto(current, guest.data));
        await writeDiff(uid, current, merged);
        try {
          localStorage.setItem(GUEST_BACKUP_KEY, JSON.stringify({ version: 3, data: guest.data }));
          write(initialData());
        } catch {
          /* Backup is best-effort. */
        }
        if (hasContent(guest.data)) notify("Your lists are now saved to your account ✓");
      } else if (!current) {
        await writeDiff(uid, null, initialData());
      }
      if (cancelled) return;
      stop = await subscribe(
        uid,
        (data) => {
          remote.current = data;
          const ready = ensureBirthdayOccasions(data);
          setPersonalData(ready);
          writeCache(uid, ready);
          setSyncStatus("synced");
        },
        () => setSyncStatus("error"),
      );
      if (cancelled) stop();
    })().catch(() => !cancelled && setSyncStatus("error"));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [uid, auth.status]);
  const [previewMode, changePreviewMode] = useState<PreviewMode>(() => {
    try {
      const mode = sessionStorage.getItem(PREVIEW_KEY);
      return mode === "empty" || mode === "filled" ? mode : "my";
    } catch {
      return "my";
    }
  });
  const [previewData, setPreviewData] = useState<AppData>(() =>
    previewMode === "filled" ? filledDemo() : emptyDemo(),
  );
  const data = previewMode === "my" ? personalData : previewData;
  const setPreviewMode = (mode: PreviewMode) => {
    if (mode === previewMode) return;
    setEditor(null);
    changePreviewMode(mode);
    setPreviewData(mode === "filled" ? filledDemo() : emptyDemo());
    updateUi((prev) => ({ ...prev, selectedEvent: "", filterPerson: "all", giftPickerEventId: "" }));
    try {
      if (mode === "my") sessionStorage.removeItem(PREVIEW_KEY);
      else sessionStorage.setItem(PREVIEW_KEY, mode);
    } catch { /* Preview still works without session storage. */ }
  };
  const [tour, setTour] = useState<TourState | null>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(TOUR_KEY) || "null");
      return saved && typeof saved.step === "string" &&
        Array.isArray(saved.peopleBefore) ? saved as TourState : null;
    } catch { return null; }
  });
  const persistTour = (next: TourState | null) => {
    setTour(next);
    try {
      if (next) sessionStorage.setItem(TOUR_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(TOUR_KEY);
    } catch { /* Session-only guide still works without storage. */ }
  };
  const startTour = (preview: boolean) => {
    const next: TourState = {
      step: "home-person", preview, restoreMode: previewMode,
      peopleBefore: preview ? [] : data.people.map(person => person.id),
    };
    if (preview) setPreviewMode("empty");
    setEditor(null);
    persistTour(next);
  };
  const updateTour = (patch: Partial<TourState>) => {
    if (tour) persistTour({ ...tour, ...patch });
  };
  const stopTour = () => {
    if (tour?.preview) setPreviewMode(tour.restoreMode);
    persistTour(null);
  };
  const [editor, setEditor] = useState<Editor | null>(null),
    [toast, setToast] = useState<{
      message: string;
      tone: "success" | "error" | "info";
      persistent: boolean;
    } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = (
    s: string,
    tone: "success" | "error" | "info" = "info",
    options?: { persistent?: boolean },
  ) => {
    // Transient feedback is hands-free; actionable/error notices persist
    // with an explicit dismiss control. Any caller can override the default.
    const persistent = options?.persistent ?? tone === "error";
    clearTimeout(timer.current);
    setToast({ message: s, tone, persistent });
    if (!persistent) timer.current = setTimeout(() => setToast(null), 3500);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  const commit = (next: AppData, recovery = false) => {
    // Sandbox edits never touch the real browser storage or migration keys.
    const ready = ensureBirthdayOccasions(next);
    if (previewMode !== "my") {
      setPreviewData(ready);
      return true;
    }
    if (uid && accountUid.current === uid) {
      setPersonalData(ready);
      writeCache(uid, ready);
      const base = remote.current;
      remote.current = ready;
      setSyncStatus("saving");
      writeDiff(uid, base, ready)
        .then(() => setSyncStatus("synced"))
        .catch(() => {
          if (remote.current === ready) remote.current = base;
          setSyncStatus("error");
          notify("Couldn't save to your account. Changes are kept and will retry.", "error");
        });
      return true;
    }
    if (blocked && !recovery) {
      notify(
        "Storage needs recovery. Import a valid backup in Settings first.",
        "error",
      );
      return false;
    }
    try {
      write(ready);
      setPersonalData(ready);
      setUpgradeNotice(false);
      setBlocked(false);
      setWarning("");
      return true;
    } catch {
      setWarning(
        "Browser storage is full or blocked. Changes were not saved. Export a backup in Settings.",
      );
      notify("Couldn’t save your changes", "error");
      return false;
    }
  };
  const openEditor = (e: Editor) => {
    if (
      e.type === "gift" &&
      !e.id &&
      (!data.events.length || !data.people.length)
    ) {
      notify("Add a person to an occasion first.");
      return;
    }
    setEditor(e);
  };
  return (
    <Context.Provider
      value={{
        upgradeNotice,
        ui,
        setUi,
        data,
        personalData,
        previewMode,
        setPreviewMode,
        commit,
        syncStatus,
        editor,
        tour,
        startTour,
        updateTour,
        stopTour,
        openEditor,
        closeEditor: () => setEditor(null),
        notify,
        warning,
      }}
    >
      {children}
      {toast && (
        <div key={toast.message + toast.tone + toast.persistent} role={toast.tone === "error" ? "alert" : "status"}
          className={`toast app-toast toast-${toast.tone}`}>
          <span className="app-toast-symbol" aria-hidden="true">
            {toast.tone === "success" ? <CheckCircle2 size={20}/> :
              toast.tone === "error" ? <AlertCircle size={20}/> : <Info size={20}/>}
          </span>
          <span className="app-toast-message">{toast.message}</span>
          {toast.persistent && (
            <button type="button" className="app-toast-dismiss" aria-label="Dismiss notification"
              onClick={() => { clearTimeout(timer.current); setToast(null); }}>
              ×
            </button>
          )}
        </div>
      )}
    </Context.Provider>
  );
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw Error("AppProvider missing");
  return value;
}
