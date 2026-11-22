import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "../components/Primitives";
import { HomeBrand } from "../components/HomeBrand";
import { AccountProfile } from "./AccountProfile";
import { useAuth } from "../auth/AuthContext";
import {
  authErrorMessage,
  resetPassword,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "../auth/providers";

// Apple is only an actual sign-in option when configured by the owner.
const appleEnabled = import.meta.env.VITE_AUTH_APPLE === "1";
function GoogleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
function AppleMark() {
  return (
    <svg width="17" height="19" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
      <path d="M788 341c-6 4-108 62-108 190 0 149 131 202 135 203-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-164-40c-77 0-104 41-167 41s-106-57-156-128C46 790 0 664 0 544c0-193 125-295 249-295 66 0 121 43 162 43 40 0 102-46 177-46 29 0 131 3 200 95zM554 159c31-37 53-88 53-139 0-7-1-14-2-20-50 2-110 34-146 76-28 32-55 83-55 135 0 8 1 16 2 18 3 1 9 2 14 2 45 0 102-30 134-72z" />
    </svg>
  );
}

export function Account() {
  const { status } = useAuth();

  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Only authenticated users can access design-only previews.
  const preview = (status === "signed-in" || status === "testing") &&
    (params.get("preview") === "sign-in" || params.get("preview") === "sign-up");
  const requestedMode = params.get("preview") === "sign-up" || (!preview && params.get("mode") === "sign-up") ? "sign-up" : "sign-in";
  const requestedNext = params.get("next") || "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
  const [mode, setMode] = useState<"sign-in" | "sign-up">(requestedMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resetMode, setResetMode] = useState(false);

  const setScreen = (screen: "sign-in" | "sign-up") => {
    setMode(screen);
    setError("");
    setInfo("");
    setResetMode(false);
    setPassword("");
    setConfirm("");
    if (preview) navigate(`/account?preview=${screen}`, { replace: true });
  };

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
    setError("");
    setInfo("");
    if (mode === "sign-up" && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (preview) {
      setInfo(mode === "sign-up"
        ? "Preview only — your account wasn't created and nothing was saved."
        : "Preview only — no sign-in request was sent.");
      return;
    }
    void run(() => mode === "sign-in"
      ? signInWithEmail(email, password)
      : signUpWithEmail(email, password, name));
  };

  const providerClick = (provider: "google" | "apple") => {
    if (preview) {
      setError("");
      setInfo(`Preview only — ${provider === "google" ? "Google" : "Apple"} sign-in wasn't started.`);
      return;
    }
    void run(provider === "google" ? signInWithGoogle : signInWithApple);
  };

  // A design preview stays available regardless of Firebase credentials or
  // current signed-in account and must never change auth or persistent data.
  if (!preview && status === "disabled")
    return <div className="auth-unavailable">
      <HomeBrand />
      <h1>Sign-in is temporarily unavailable</h1>
      <p>Givvy requires an account. Authentication isn't configured for this build. Your existing data remains untouched.</p>
      <Link className="button-secondary" to="/welcome">Back</Link>
    </div>;

  if (!preview && (status==="signed-in" || status==="testing"))
    return <AccountProfile/>;

  return (
    <div className="auth-screen">
      <header className="auth-brand">
        <Link to={preview || status === "signed-in" || status === "testing" ? "/settings" : "/welcome"} className="auth-back"
          aria-label={preview ? "Back to Settings" : "Back"}>
          <ArrowLeft size={20} aria-hidden="true"/>
        </Link>
        <HomeBrand />
      </header>
      <div className="auth-bottom-sheet">
      <div className="auth-wave" aria-hidden="true">
        <svg viewBox="0 0 400 94" preserveAspectRatio="none">
          <path d="M0 51 C85 10 142 64 225 41 C302 19 351 35 400 48 L400 94 L0 94 Z" fill="var(--surface)" />
        </svg>
      </div>
      <section className="auth-panel" aria-label={mode === "sign-in" ? "Sign in" : "Create account"}>
        <h1>{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-intro">{mode === "sign-in"
          ? "Sign in to your Givvy account."
          : "Start planning more thoughtful gifts with Givvy."}</p>
        {preview && (
          <p className="auth-preview-badge" role="status">Design preview · no account changes</p>
        )}
        <form className="auth-form" onSubmit={submit}>
          {mode === "sign-up" && (
            <label className="auth-field">
              <span className="sr-only">Name</span>
              <UserRound size={19} aria-hidden="true"/>
              <input type="text" autoComplete="name" placeholder="Name" required
                maxLength={70} value={name} onChange={e => setName(e.target.value)}
                aria-label="Name"/>
            </label>
          )}
          <label className="auth-field">
            <span className="sr-only">Email</span>
            <Mail size={19} aria-hidden="true"/>
            <input type="email" autoComplete="email" placeholder="Email" required
              value={email} onChange={e => setEmail(e.target.value)} aria-label="Email"/>
          </label>
          <label className="auth-field">
            <span className="sr-only">Password</span>
            <LockKeyhole size={19} aria-hidden="true"/>
            <input type={showPassword ? "text" : "password"}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              placeholder="Password" required minLength={6} value={password}
              onChange={e => setPassword(e.target.value)} aria-label="Password"/>
            <button className="auth-eye" type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(v => !v)}>
              {showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}
            </button>
          </label>
          {mode === "sign-up" && (
            <label className="auth-field">
              <span className="sr-only">Confirm password</span>
              <LockKeyhole size={19} aria-hidden="true"/>
              <input type={showConfirm ? "text" : "password"} autoComplete="new-password"
                placeholder="Confirm password" required minLength={6} value={confirm}
                onChange={e => setConfirm(e.target.value)} aria-label="Confirm password"/>
              <button className="auth-eye" type="button"
                aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"}
                onClick={() => setShowConfirm(v => !v)}>
                {showConfirm ? <EyeOff size={19}/> : <Eye size={19}/>}
              </button>
            </label>
          )}
          {error && <p className="warning auth-feedback" role="alert">{error}</p>}
          {info && <p className="auth-feedback auth-info" role="status">{info}</p>}
          <Button data-ph={mode === "sign-in" ? "account-email-sign-in" : "account-email-sign-up"}
            className="button-full auth-primary" disabled={busy || (!preview && status === "loading")}>
            {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        {mode === "sign-in" && (
          <button data-ph="account-forgot-password" className="auth-forgot" type="button"
            disabled={busy} onClick={() => { setError("");setInfo("");setResetMode(true); }}>
            Forgot password?
          </button>
        )}
        {mode === "sign-in" && resetMode && (
          <div className="auth-reset" role="group" aria-label="Reset password">
            <p>Enter your email above, then request a reset link.</p>
            <button type="button" disabled={busy} onClick={() => {
              if (!email.trim()) { setError("Enter your email first.");return; }
              if (preview) { setInfo("Preview only — no reset email was sent.");setResetMode(false);return; }
              void run(() => resetPassword(email), "If an account exists for this email, a reset link is on its way.");
              setResetMode(false);
            }}>Send reset link</button>
          </div>
        )}
        {(
          <>
            <div className="auth-divider"><span>{mode === "sign-up" ? "Or sign up with" : "Or continue with"}</span></div>
            <div className="auth-providers">
              <button data-ph="account-google" className="auth-provider" type="button"
                disabled={busy || (!preview && status === "loading")} onClick={() => providerClick("google")}>
                <GoogleMark/> Continue with Google
              </button>
              {(appleEnabled || preview) && (
                <button data-ph="account-apple" className="auth-provider" type="button"
                  disabled={busy || (!preview && status === "loading")} onClick={() => providerClick("apple")}>
                  <AppleMark/> Continue with Apple
                </button>
              )}
            </div>
          </>
        )}
      </section>
      <div className="auth-switch">
        {mode === "sign-in" ? "New to Givvy?" : "Already have an account?"}
        <button data-ph="account-switch-mode" type="button"
          onClick={() => setScreen(mode === "sign-in" ? "sign-up" : "sign-in")}>
          {mode === "sign-in" ? "Create account" : "Sign in"}
        </button>
      </div>
      {preview && <Link to="/settings" className="auth-return">Back to Settings</Link>}
      </div>
    </div>
  );
}
