import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authEnabled } from "./config";
import { getFirebaseAuth } from "./firebase";

export interface AccountUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  providers: string[];
  emailVerified: boolean;
}
export type AuthStatus = "disabled" | "loading" | "guest" | "signed-in" | "testing";
interface AuthState {
  status: AuthStatus;
  user: AccountUser | null;
}
const Context = createContext<AuthState>({ status: "disabled", user: null });

/** Browser-only test mode. This path cannot run in production builds. */
const e2eBypass = import.meta.env.DEV && import.meta.env.VITE_E2E_AUTH_BYPASS === "1";
function testingSession() {
  if (!e2eBypass) return false;
  try { return sessionStorage.getItem("givvy_e2e_require_auth") !== "1"; }
  catch { return false; }
}
/** Firebase sessions are the only source of real authentication. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    status: testingSession() ? "testing" : authEnabled ? "loading" : "disabled",
    user: null,
  }));
  useEffect(() => {
    if (e2eBypass || !authEnabled) return;
    let unsubscribe: (() => void) | undefined,
      cancelled = false;
    Promise.all([getFirebaseAuth(), import("firebase/auth")])
      .then(([auth, { onAuthStateChanged }]) => {
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, (u) =>
          setState(
            u
              ? {
                  status: "signed-in",
                  user: {
                    uid: u.uid,
                    email: u.email,
                    displayName: u.displayName,
                    providers: u.providerData.map((p) => p.providerId),
                    emailVerified: u.emailVerified,
                  },
                }
              : { status: "guest", user: null },
          ),
        );
      })
      .catch(() => !cancelled && setState({ status: "guest", user: null }));
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export const useAuth = () => useContext(Context);
