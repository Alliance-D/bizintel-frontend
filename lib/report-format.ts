import { categoryLabel } from "@/lib/categories";
import type { TranslationKey } from "@/lib/translations";

// Pure presentation helpers for the report view. Kept out of the component so
// the wording rules (bands, category/activity/landmark labels, number
// formatting) can be unit tested without rendering React or touching the DOM.

export type T = (k: TranslationKey) => string;

export type Situation = { pill: string; labelKey: TranslationKey; verdictKey: TranslationKey; badgeKey: TranslationKey };

// Derives the situation shown to the user from the ABSOLUTE expected-vs-observed
// counts - the same numbers the capacity bar and narrative use - so the verdict,
// the status pill and the bar can never contradict each other. (The gap
// PERCENTILE is a city-wide relative ranking, right for the map/insights, but it
// can call a slightly-oversupplied cell "underserved" just because it ranks high
// within its category - which would fight the bar that plainly shows it over
// capacity.)
export function situationFromCounts(expected: number, observed: number): Situation {
  const room = expected - observed;
  if (expected < 0.75 && Math.abs(room) < 1)
    return { pill: "status-balanced", labelKey: "report_status_low_demand", verdictKey: "report_verdict_thin", badgeKey: "report_gap_low_badge" };
  if (room <= -0.75)
    return { pill: "status-saturated", labelKey: "legend_saturated", verdictKey: "report_verdict_saturated", badgeKey: "report_gap_over_badge" };
  if (room >= 1.5)
    return { pill: "status-under", labelKey: "legend_underserved", verdictKey: "report_verdict_underserved", badgeKey: "report_gap_room_badge" };
  if (room >= 0.5)
    return { pill: "status-emerging", labelKey: "legend_room_to_grow", verdictKey: "report_verdict_room", badgeKey: "report_gap_room_badge" };
  return { pill: "status-balanced", labelKey: "legend_balanced", verdictKey: "report_verdict_balanced", badgeKey: "report_gap_balanced_badge" };
}

export function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });
}

// Category, activity and landmark labels are translated on the client from
// stable tokens (a category key, an English/Kinyarwanda level word, a bare
// landmark name) rather than from prose baked at report-build time - so they
// flip instantly on the language toggle without waiting on a re-fetch.
const CAT_KEY: Record<string, TranslationKey> = {
  pharmacy: "cat_pharmacy", restaurant: "cat_restaurant", cafe: "cat_cafe", grocery: "cat_grocery", salon: "cat_salon",
};
export function catLabel(key: string | undefined, t: T): string {
  const tk = key ? CAT_KEY[key] : undefined;
  return tk ? t(tk) : categoryLabel(key || "");
}

// Capitalised display form of the translated category label, for chips,
// selectors and headings (catLabel returns the lowercase form used in prose).
export function catTitle(key: string | undefined, t: T): string {
  const s = catLabel(key, t);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// English plural of a category label ("pharmacy" -> "pharmacies"). Kinyarwanda
// templates don't append a plural suffix, so in RW callers pass the singular
// label straight through instead of calling this.
export function catPluralEn(label: string): string {
  if (/[bcdfghjklmnpqrstvwxz]y$/i.test(label)) return label.slice(0, -1) + "ies";
  return /s$/i.test(label) ? label : label + "s";
}

const ACTIVITY_KEY: Record<string, TranslationKey> = {
  high: "activity_high", medium: "activity_medium", low: "activity_low",
  byinshi: "activity_high", bigereranije: "activity_medium", bike: "activity_low",
};
export function activityLabel(v: string | null | undefined, t: T): string {
  if (!v) return "—";
  const tk = ACTIVITY_KEY[v.trim().toLowerCase()];
  return tk ? t(tk) : v;
}

// The backend returns a bare landmark name (e.g. "Kubadive"); the "near"/"hafi ya"
// connector is added here so it translates. The strip guards against older
// reports that baked the connector into the stored name.
export function stripNear(s: string | null | undefined): string | null {
  if (!s) return null;
  const n = s.replace(/^(near\s+|hafi ya\s+)/i, "").trim();
  return n || null;
}
export function nearLabel(s: string | null | undefined, t: T): string | null {
  const n = stripNear(s);
  return n ? t("loc_near").replace("{name}", n) : null;
}
