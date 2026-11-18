import type { FirebaseOptions } from "firebase/app";

/**
 * Firebase web config comes from Vite env vars (see .env.example).
 * These values are public identifiers, not secrets: access is enforced by
 * Firebase Auth authorized domains and, later, Firestore security rules.
 * When they are missing the app keeps working in guest mode.
 */
const env = import.meta.env;
const config: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
};

export const firebaseConfig: FirebaseOptions | null =
  config.apiKey && config.authDomain && config.projectId && config.appId
    ? config
    : null;

export const authEnabled = firebaseConfig !== null;
