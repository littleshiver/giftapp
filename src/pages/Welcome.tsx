import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { HomeBrand } from "../components/HomeBrand";

/** Public introduction. Gift data and app navigation are never mounted here. */
export function Welcome() {
  const [params] = useSearchParams();
  const requested = params.get("next") || "/";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  const query = encodeURIComponent(next);
  return <div className="guided-onboarding auth-welcome">
    <header className="guided-topbar"><HomeBrand /></header>
    <div className="guided-content">
      <section className="guided-stage guided-intro">
        <div className="guided-intro-accent" />
        <h1>All your gifts, in one place.</h1>
        <p>Remember birthdays and special occasions. Save gift ideas, plan what to buy and keep track of what’s ready.</p>
        <p>Create a free account to keep your gift plans safe and available across devices.</p>
        <div className="guided-actions">
          <Link className="guided-primary" to={`/account?mode=sign-up&next=${query}`}>
            Get started <ArrowRight size={18} />
          </Link>
          <Link className="guided-text-action" to={`/account?mode=sign-in&next=${query}`}>
            I already have an account
          </Link>
        </div>
      </section>
    </div>
  </div>;
}
