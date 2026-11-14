import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppData, Editor } from "../domain/models";
import { today } from "../utils/format";
import { load, write } from "../persistence/storage";
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
  const [loaded] = useState(load),
    [data, setData] = useState(loaded.data),
    [upgradeNotice, setUpgradeNotice] = useState(loaded.upgraded),
    [blocked, setBlocked] = useState(loaded.blocked),
    [warning, setWarning] = useState(loaded.warning);
  const [editor, setEditor] = useState<Editor | null>(null),
    [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = (s: string) => {
    setToast(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3700);
  };
  const commit = (next: AppData, recovery = false) => {
    if (blocked && !recovery) {
      notify(
        "Storage needs recovery. Import a valid backup in Settings first.",
      );
      return false;
    }
    try {
      write(next);
      setData(next);
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
      !data.events.some((event) =>
        event.people.some((id) => data.people.some((p) => p.id === id)),
      )
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
