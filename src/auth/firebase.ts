import type { Auth } from "firebase/auth";
import { firebaseConfig } from "./config";

let pending: Promise<Auth> | null = null;

/**
 * Firebase is loaded lazily so guests who never open the account screen
 * don't pay for the SDK on first paint.
 *
 * initializeAuth (instead of getAuth) lets us pick persistence explicitly.
 * IndexedDB persistence is what Firebase recommends inside Capacitor
 * WebViews, so the same setup keeps working when the app is wrapped.
 */
export function getFirebaseAuth(): Promise<Auth> {
  if (!firebaseConfig) return Promise.reject(Error("Firebase is not configured"));
  pending ??= (async () => {
    const [{ initializeApp }, auth] = await Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
    ]);
    const app = initializeApp(firebaseConfig);
    return auth.initializeAuth(app, {
      persistence: [auth.indexedDBLocalPersistence, auth.browserLocalPersistence],
      popupRedirectResolver: auth.browserPopupRedirectResolver,
    });
  })();
  return pending;
}
