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
export type AuthStatus = "disabled" | "loading" | "guest" | "signed-in";
interface AuthState {
  status: AuthStatus;
  user: AccountUser | null;
}
const Context = createContext<AuthState>({ status: "disabled", user: null });

/**
 * Tracks the Firebase session. Signing in never touches local gift data:
 * whatever a guest added (including onboarding) stays in this browser and
 * will be uploaded to the account when cloud sync is added.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: authEnabled ? "loading" : "disabled",
    user: null,
  });
  useEffect(() => {
    if (!authEnabled) return;
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
