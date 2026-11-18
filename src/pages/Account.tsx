import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, Mail } from "lucide-react";
import { Title } from "../components/UI";
import { Button, Field } from "../components/Primitives";
import { useApp } from "../state/AppState";
import { useAuth } from "../auth/AuthContext";
import {
  authErrorMessage,
  resetPassword,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
} from "../auth/providers";

// Sign in with Apple needs an Apple Developer account (Services ID + key).
// Turn the button on with VITE_AUTH_APPLE=1 once Apple is configured in Firebase.
const appleEnabled = import.meta.env.VITE_AUTH_APPLE === "1";

const providerNames: Record<string, string> = {
  "google.com": "Google",
  "apple.com": "Apple",
  password: "Email",
};

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
function AppleMark() {
  return (
    <svg width="16" height="17" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
      <path d="M788 341c-6 4-108 62-108 190 0 149 131 202 135 203-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-164-40c-77 0-104 41-167 41s-106-57-156-128C46 790 0 664 0 544c0-193 125-295 249-295 66 0 121 43 162 43 40 0 102-46 177-46 29 0 131 3 200 95zM554 159c31-37 53-88 53-139 0-7-1-14-2-20-50 2-110 34-146 76-28 32-55 83-55 135 0 8 1 16 2 18 3 1 9 2 14 2 45 0 102-30 134-72z" />
    </svg>
  );
}

export function Account() {
  const { status, user } = useAuth(),
    { personalData } = useApp(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    next = params.get("next") || "/settings",
    [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [info, setInfo] = useState("");
  const hasLocalData =
    personalData.people.length + personalData.events.length + personalData.gifts.length + personalData.ideas.length > 0;

  const run = async (action: () => Promise<void>, after?: string) => {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await action();
      if (after) setInfo(after);
      else navigate(next, { replace: true });
    } catch (err) {
      const message = authErrorMessage(err);
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(() =>
      mode === "sign-in"
        ? signInWithEmail(email, password)
        : signUpWithEmail(email, password),
    );
  };

  if (status === "disabled")
    return (
      <>
        <Title name="Account" subtitle="Sign in to keep your lists safe." />
        <section className="data-card">
          <h2>Sign-in isn't available yet</h2>
          <p>
            Accounts are coming soon. Until then everything you add stays in
            this browser — you can export a backup in Settings.
          </p>
          <Link data-ph="account-back-to-settings" className="button-secondary button-full" style={{ marginTop: 14 }} to="/settings">
            Back to Settings
          </Link>
        </section>
      </>
    );

  if (status === "signed-in" && user)
    return (
      <>
        <Title name="Account" subtitle="You're signed in." back="/settings" />
        <section className="data-card account-card">
          <h2>{user.displayName || user.email || "Your account"}</h2>
          {user.displayName && user.email && <p>{user.email}</p>}
          <p className="section-note">
            Signed in with{" "}
            {user.providers.map((p) => providerNames[p] || p).join(", ") || "email"}
            {user.providers.includes("password") && !user.emailVerified
              ? " · check your inbox to verify your email"
              : ""}
          </p>
          <p style={{ marginTop: 12 }}>
            Your people, occasions, gifts and ideas are saved to your account
            and available on any device where you sign in.
          </p>
          <Button data-ph="account-sign-out"
            variant="secondary"
            className="button-full"
            style={{ marginTop: 16 }}
            disabled={busy}
            onClick={() => run(signOutUser, "You're signed out. Your lists stay safe in your account.")}
          >
            <LogOut size={16} />
            Sign out
          </Button>
        </section>
      </>
    );

  return (
    <>
      <Title
        name={mode === "sign-in" ? "Sign in" : "Create account"}
        subtitle="Keep your gift plans safe and ready on any device."
        back={next}
      />
      {hasLocalData && (
        <div className="notice account-notice">
          Everything you've added so far stays with you after you sign in.
        </div>
      )}
      <section className="data-card account-card">
        <div className="account-providers">
          <Button data-ph="account-google"
            variant="outline"
            className="button-full"
            disabled={busy || status === "loading"}
            onClick={() => run(signInWithGoogle)}
          >
            <GoogleMark />
            Continue with Google
          </Button>
          {appleEnabled && (
          <Button data-ph="account-apple"
            className="button-full account-apple"
            disabled={busy || status === "loading"}
            onClick={() => run(signInWithApple)}
          >
            <AppleMark />
            Continue with Apple
          </Button>
          )}
        </div>
        <div className="account-divider"><span>or with email</span></div>
        <form onSubmit={submit}>
          <Field label="Email">
            <input
              className="control"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <input
              className="control"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <p className="warning" role="alert">{error}</p>}
          {info && <p className="section-note" role="status">{info}</p>}
          <Button data-ph={mode === "sign-in" ? "account-email-sign-in" : "account-email-sign-up"} className="button-full" disabled={busy || status === "loading"}>
            <Mail size={16} />
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        {mode === "sign-in" && (
          <button data-ph="account-forgot-password"
            type="button"
            className="ghostbutton button-full"
            disabled={busy}
            onClick={() => {
              if (!email.trim()) return setError("Enter your email first, then tap “Forgot password”.");
              run(() => resetPassword(email), "If an account exists for this email, a reset link is on its way.");
            }}
          >
            Forgot password?
          </button>
        )}
        <button data-ph="account-switch-mode"
          type="button"
          className="ghostbutton button-full"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError("");
            setInfo("");
          }}
        >
          {mode === "sign-in" ? "New to Givvy? Create an account" : "Already have an account? Sign in"}
        </button>
      </section>
    </>
  );
}
