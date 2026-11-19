import { getFirebaseAuth } from "./firebase";

/**
 * All sign-in methods go through this module, so the UI never talks to
 * provider SDKs directly.
 *
 * Web (GitHub Pages): Google and Apple use signInWithPopup. Popups are the
 * reliable choice here because the site and the Firebase authDomain are on
 * different origins, where redirect sign-in is broken by browser storage
 * partitioning (Safari, Chrome).
 *
 * Native (Capacitor, later): popups don't work in a WebView and Apple requires
 * native Sign in with Apple. The plan is to swap the bodies of signInWithGoogle
 * / signInWithApple for @capacitor-firebase/authentication: sign in natively,
 * then pass the returned idToken to signInWithCredential on this same Firebase
 * JS Auth instance. Everything else (email/password, onAuthStateChanged, the
 * uid used for data) stays the same.
 */
export async function signInWithGoogle() {
  const auth = await getFirebaseAuth(),
    { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth"),
    provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(auth, provider);
}

export async function signInWithApple() {
  const auth = await getFirebaseAuth(),
    { OAuthProvider, signInWithPopup } = await import("firebase/auth"),
    provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  await signInWithPopup(auth, provider);
}

export async function signInWithEmail(email: string, password: string) {
  const auth = await getFirebaseAuth(),
    { signInWithEmailAndPassword } = await import("firebase/auth");
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpWithEmail(email: string, password: string, name = "") {
  const auth = await getFirebaseAuth(),
    { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } = await import(
      "firebase/auth"
    ),
    result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) await updateProfile(result.user, { displayName: name.trim() });
  // Verification is best-effort; an unverified account can still use the app.
  sendEmailVerification(result.user).catch(() => undefined);
}

export async function resetPassword(email: string) {
  const auth = await getFirebaseAuth(),
    { sendPasswordResetEmail } = await import("firebase/auth");
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser() {
  const auth = await getFirebaseAuth(),
    { signOut } = await import("firebase/auth");
  await signOut(auth);
}

const messages: Record<string, string> = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/user-not-found": "Email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
  "auth/weak-password": "Use at least 6 characters for the password.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
  "auth/popup-blocked": "The browser blocked the sign-in window. Allow pop-ups and try again.",
  "auth/account-exists-with-different-credential":
    "This email is already used with another sign-in method. Use that method instead.",
  "auth/operation-not-allowed": "This sign-in method isn't enabled yet.",
  "auth/unauthorized-domain": "This site isn't allowed to sign in yet (authorized domains).",
};

/** Returns null for user-cancelled flows, which need no message. */
export function authErrorMessage(err: unknown): string | null {
  const code = (err as { code?: string })?.code ?? "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request")
    return null;
  return messages[code] ?? "Something went wrong. Please try again.";
}
