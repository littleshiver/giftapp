import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppData, Editor } from "../domain/models";
import { today } from "../utils/format";
import { ensureBirthdayOccasions } from "../domain/birthdays";
import { load, write } from "../persistence/storage";
import { emptyDemo, filledDemo } from "../domain/demo";

export type PreviewMode = "my" | "empty" | "filled";
const PREVIEW_KEY = "givvy_preview_mode";
interface UiState {
  selectedEvent: string;
  mode: string;
  selected: string;
  month: string;
  suggestionIndex: number;
  filterPerson: string;
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
  editor: Editor | null;
  openEditor: (e: Editor) => void;
  closeEditor: () => void;
  notify: (s: string) => void;
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
    updateUi((prev) => ({ ...prev, selectedEvent: "", filterPerson: "all" }));
    try {
      if (mode === "my") sessionStorage.removeItem(PREVIEW_KEY);
      else sessionStorage.setItem(PREVIEW_KEY, mode);
    } catch { /* Preview still works without session storage. */ }
  };
  const [editor, setEditor] = useState<Editor | null>(null),
    [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = (s: string) => {
    setToast(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3700);
  };
  const commit = (next: AppData, recovery = false) => {
    // Sandbox edits never touch the real browser storage or migration keys.
    const ready = ensureBirthdayOccasions(next);
    if (previewMode !== "my") {
      setPreviewData(ready);
      return true;
    }
    if (blocked && !recovery) {
      notify(
        "Storage needs recovery. Import a valid backup in Settings first.",
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
        editor,
        openEditor,
        closeEditor: () => setEditor(null),
        notify,
        warning,
      }}
    >
      {children}
      {toast && (
        <div role="status" className="toast">
          {toast}
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
