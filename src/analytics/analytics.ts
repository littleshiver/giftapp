import type { CaptureResult, PostHog } from "posthog-js";

/**
 * Product analytics (PostHog). Nothing is loaded or sent until the visitor
 * agrees in the consent banner; the choice is stored in this browser and can
 * be changed in Settings → Privacy.
 *
 * Privacy rules:
 * - Users are identified only by their Firebase uid (no email or name).
 * - Autocapture keeps click positions, tags and CSS classes (for heatmaps
 *   and click stats) but drops element text and label-like attributes
 *   (aria-label, title, alt, placeholder, value, style, src), because cards
 *   show friends' names, photos, birthdays and notes.
 * - Session replays mask every input and all text on the page.
 */
const env = import.meta.env;
const key = env.VITE_POSTHOG_KEY;
const host = env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com";

export const analyticsAvailable = Boolean(key);

export type Consent = "granted" | "denied" | null;
const CONSENT_KEY = "givvy.analytics-consent";
const listeners = new Set<() => void>();

export function getConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

// Attributes that can carry a friend's name or a note, e.g. aria-label="Mira".
const LABEL_ATTRS = /^attr__(aria-label|aria-description|title|alt|placeholder|value|name|style|src|srcset)$/;
const LABEL_ATTRS_IN_CHAIN =
  /attr__(?:aria-label|aria-description|title|alt|placeholder|value|name|style|src|srcset)="(?:[^"\\]|\\.)*"/g;

const CLICK_EVENTS = new Set(["$autocapture", "$rageclick", "$dead_click"]);
function scrubLabels(event: CaptureResult | null): CaptureResult | null {
  if (!event || !CLICK_EVENTS.has(event.event)) return event;
  const props = event.properties;
  if (typeof props.$elements_chain === "string")
    props.$elements_chain = props.$elements_chain.replace(LABEL_ATTRS_IN_CHAIN, "");
  if (Array.isArray(props.$elements))
    for (const el of props.$elements as Record<string, unknown>[])
      for (const k of Object.keys(el)) if (LABEL_ATTRS.test(k)) delete el[k];
  delete props.$el_text;
  return event;
}

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
let pendingUid: string | null | undefined;

function load(): Promise<PostHog | null> {
  if (!key) return Promise.resolve(null);
  if (!loading)
    loading = import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(key, {
          api_host: host,
          ui_host: host.includes("eu.") ? "https://eu.posthog.com" : "https://us.posthog.com",
          person_profiles: "identified_only",
          // Hash routes are tracked by AnalyticsTracker.
          capture_pageview: false,
          capture_pageleave: true,
          autocapture: true,
          enable_heatmaps: true,
          capture_dead_clicks: true,
          mask_all_text: true,
          before_send: scrubLabels,
          disable_session_recording: false,
          session_recording: {
            maskAllInputs: true,
            maskTextSelector: "*",
            blockSelector: "img, [data-ph-block]",
          },
        });
        client = posthog;
        if (pendingUid !== undefined) applyIdentity(pendingUid);
        return posthog;
      })
      .catch(() => null);
  return loading;
}

export function setConsent(value: "granted" | "denied") {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* private mode: the choice lasts for this visit only */
  }
  if (value === "granted") {
    load().then((ph) => {
      if (!ph) return;
      ph.opt_in_capturing();
      ph.startSessionRecording();
      capturePageview();
    });
  } else if (client) {
    client.stopSessionRecording();
    client.opt_out_capturing();
  }
  listeners.forEach((l) => l());
}

export function subscribeConsent(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Starts PostHog on page load for visitors who already agreed. */
export function initAnalytics() {
  if (getConsent() === "granted") load();
}

const ID_PATTERN = /\/(events|people)\/[^/]+/;
let lastPath = "";

/** Records a pageview for the current hash route. */
export function capturePageview(path?: string) {
  if (path !== undefined) lastPath = path;
  if (!client || getConsent() !== "granted") return;
  client.capture("$pageview", {
    // Route pattern without ids, handy for grouping in insights.
    route: lastPath.replace(ID_PATTERN, "/$1/:id") || "/",
  });
}

let identifiedUid: string | null = null;
function applyIdentity(uid: string | null) {
  if (!client) return;
  if (uid && uid !== identifiedUid) {
    client.identify(uid);
    identifiedUid = uid;
  } else if (!uid && identifiedUid) {
    client.reset();
    identifiedUid = null;
  }
}

/** Links events to the Firebase uid on sign-in; resets on sign-out. */
export function setAnalyticsUser(uid: string | null) {
  pendingUid = uid;
  applyIdentity(uid);
}

/** Named product events for funnels, e.g. track("onboarding_completed"). */
export function track(event: string, properties?: Record<string, string | number | boolean>) {
  if (client && getConsent() === "granted") client.capture(event, properties);
}
