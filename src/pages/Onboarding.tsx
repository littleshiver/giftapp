import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Button, Field } from "../components/Primitives";
import { useApp } from "../state/AppState";
import { useAuth } from "../auth/AuthContext";
import { applySetup, holidays, type SetupDraft } from "../domain/onboarding";
import { track } from "../analytics/analytics";
export function Onboarding() {
  const { data, commit, notify } = useApp(),
    auth = useAuth(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    preview = params.has("preview"),
    [step, setStep] = useState(0),
    [draft, setDraft] = useState<SetupDraft>({
      holidays: data.settings.holidays || [
        ...(data.settings.christmas ? ["Christmas"] : []),
        ...(data.settings.hanukkah ? ["Hanukkah"] : []),
      ],
      name: "",
      birthday: "",
      budget: data.settings.birthdayBudget,
    }),
    [error, setError] = useState("");
  // Funnel events for analytics (no form contents are sent).
  useEffect(() => {
    if (!preview) track("onboarding_step_viewed", { step: step + 1 });
  }, [step, preview]);
  const change = (patch: Partial<SetupDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));
  const finish = () => {
    try {
      if (commit(applySetup(data, draft))) {
        if (!preview) track("onboarding_completed", { added_birthday: Boolean(draft.birthday) });
        notify("Your preferences were added ✓");
        navigate("/");
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <>
      <div className="overline">GIVVY · GETTING STARTED</div>
      {step === 0 ? (
        <>
          <div className="welcome-card">
            <div
              style={{
                fontSize: 35,
                fontWeight: 850,
                letterSpacing: -1.3,
                marginBottom: 30,
              }}
            >
              Givvy.
            </div>
            <h1>Thoughtful gifts, without the chaos.</h1>
            <p>
              Keep people, occasions and good ideas in one calm little place.
            </p>
          </div>
          <Button className="button-full" onClick={() => setStep(1)}>
            Get started
            <ArrowRight size={17} />
          </Button>
          <Button
            variant="secondary"
            className="button-full"
            style={{ marginTop: 10 }}
            onClick={() => {
              if (preview) navigate("/settings");
              else if (
                commit({
                  ...data,
                  settings: { ...data.settings, onboardingComplete: true },
                })
              ) {
                track("onboarding_skipped");
                navigate("/");
              }
            }}
          >
            {preview ? "Back to Settings" : "Explore first"}
          </Button>
          {!preview && auth.status === "guest" && (
            <Link
              className="ghostbutton button-full"
              style={{ marginTop: 10 }}
              to="/account?next=/onboarding"
            >
              I already have an account
            </Link>
          )}
        </>
      ) : step === 1 ? (
        <>
          <div className="onboard-step">
            <h2>What do you celebrate?</h2>
            <p>
              Choose the occasions you care about. You can always change them
              later.
            </p>
          </div>
          {holidays.map((name) => (
            <label className="onboard-option checkline" key={name}>
              <input
                type="checkbox"
                checked={draft.holidays.includes(name)}
                onChange={(e) =>
                  change({
                    holidays: e.target.checked
                      ? [...draft.holidays, name]
                      : draft.holidays.filter((x) => x !== name),
                  })
                }
              />
              <span>{name}</span>
            </label>
          ))}
          <Button
            className="button-full"
            style={{ marginTop: 20 }}
            onClick={() => setStep(2)}
          >
            Continue
            <ArrowRight size={16} />
          </Button>
          <button
            className="ghostbutton button-full"
            onClick={() => setStep(0)}
          >
            Back
          </button>
        </>
      ) : step === 2 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(3);
          }}
        >
          <div className="onboard-step">
            <h2>Who is on your list?</h2>
            <p>Add one person to begin. Birthdays are optional.</p>
          </div>
          <Field label="Name">
            <input
              className="control"
              maxLength={70}
              value={draft.name}
              onChange={(e) => change({ name: e.target.value })}
              placeholder="e.g. Anna"
            />
          </Field>
          <Field label="Birthday (optional)">
            <input
              className="control"
              type="date"
              value={draft.birthday}
              onChange={(e) => change({ birthday: e.target.value })}
            />
          </Field>
          <Button className="button-full">
            Continue
            <ArrowRight size={16} />
          </Button>
          <button
            className="ghostbutton button-full"
            type="button"
            onClick={() => setStep(1)}
          >
            Back
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            finish();
          }}
        >
          <div className="onboard-step">
            <h2>Set a starting budget</h2>
            <p>
              Choose a default for birthdays. Every person and occasion can have
              a different budget.
            </p>
          </div>
          <Field label="Birthday budget (₽)">
            <input
              className="control"
              type="number"
              min="0"
              required
              value={draft.budget}
              onChange={(e) => change({ budget: Number(e.target.value) })}
            />
          </Field>
          {error && (
            <p className="warning" role="alert">
              {error}
            </p>
          )}
          <Button className="button-full">
            Finish setup
            <Check size={17} />
          </Button>
          <button
            className="ghostbutton button-full"
            type="button"
            onClick={() => setStep(2)}
          >
            Back
          </button>
        </form>
      )}
      <div className="onboarding-progress" aria-label={`Step ${step + 1} of 4`}>
        {[0, 1, 2, 3].map((i) => (
          <i className={i === step ? "active" : ""} key={i} />
        ))}
      </div>
    </>
  );
}
