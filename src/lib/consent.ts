/**
 * Cookie consent for optional marketing tags (Google Analytics 4, Meta pixel).
 *
 * Nothing here runs unless VITE_GA_MEASUREMENT_ID or VITE_META_PIXEL_ID is set
 * at build time: without them the site sets no cookies that need consent and
 * no banner is shown. With them, no tag is loaded until the visitor accepts
 * (AEPD guidance: rejecting must be as easy as accepting, and nothing before).
 */

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || "";
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID?.trim() || "";

/** True when there is at least one tag that needs consent. */
export const CONSENT_NEEDED = !!(GA_ID || PIXEL_ID);
export const HAS_ANALYTICS = !!GA_ID;
export const HAS_MARKETING = !!PIXEL_ID;

export interface Consent {
  analytics: boolean;
  marketing: boolean;
  /** ISO date the choice was made; asked again after a year. */
  at: string;
}

const KEY = "adm-consent-v1";
const MAX_AGE_MS = 365 * 24 * 3600 * 1000;
const OPEN_EVENT = "adm:open-consent";

export function getConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Consent;
    if (Date.now() - new Date(c.at).getTime() > MAX_AGE_MS) return null;
    return c;
  } catch {
    return null;
  }
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }): Consent {
  const c: Consent = { ...choice, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // Private mode: the choice lasts this visit only.
  }
  // Withdrawing consent: tags already loaded can't be unloaded, so reload
  // the page to stop them (their cookies expire on their own).
  const before = loaded;
  if ((before.ga && !c.analytics) || (before.pixel && !c.marketing)) {
    window.location.reload();
    return c;
  }
  applyConsent(c);
  return c;
}

/** The footer's "Configurar cookies" link reopens the banner. */
export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenConsentSettings(fn: () => void): () => void {
  window.addEventListener(OPEN_EVENT, fn);
  return () => window.removeEventListener(OPEN_EVENT, fn);
}

// ---------------------------------------------------------------- loading

type Fn = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Fn;
    fbq?: Fn & { callMethod?: Fn; queue?: unknown[]; loaded?: boolean; version?: string; push?: Fn };
    _fbq?: unknown;
  }
}

const loaded = { ga: false, pixel: false };

function addScript(src: string) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function loadGa() {
  if (loaded.ga || !GA_ID) return;
  loaded.ga = true;
  window.dataLayer = window.dataLayer || [];
  // gtag needs the real `arguments` object, not an array.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });
  addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`);
}

function loadPixel() {
  if (loaded.pixel || !PIXEL_ID) return;
  loaded.pixel = true;
  // Meta's standard bootstrap, without the inline <script> (CSP).
  const fbq: NonNullable<Window["fbq"]> = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  addScript("https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", PIXEL_ID);
  fbq("track", "PageView");
}

/** Loads whatever the visitor accepted. Safe to call more than once. */
export function applyConsent(c: Consent | null = getConsent()) {
  if (!c) return;
  if (c.analytics) loadGa();
  if (c.marketing) {
    loadPixel();
    window.gtag?.("consent", "update", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
  }
}

/** SPA navigation: GA4 tracks history changes itself; the pixel needs a nudge. */
export function trackPageView() {
  if (loaded.pixel) window.fbq?.("track", "PageView");
}
