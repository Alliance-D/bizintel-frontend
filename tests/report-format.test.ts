import { describe, it, expect } from "vitest";
import { situationFromCounts, fmt, catLabel, catPluralEn, activityLabel, stripNear, nearLabel, type T } from "@/lib/report-format";
import { en, rw } from "@/lib/translations";

// Real dictionaries so the tests exercise the actual translation strings, the
// same way the running app resolves them.
const t: T = (k) => en[k] ?? k;
const tRw: T = (k) => rw[k] ?? en[k] ?? k;

describe("situationFromCounts", () => {
  it("calls a very-low-demand cell thin, not underserved", () => {
    expect(situationFromCounts(0.5, 0).verdictKey).toBe("report_verdict_thin");
  });
  it("flags oversupply as saturated", () => {
    expect(situationFromCounts(2, 3).labelKey).toBe("legend_saturated");
  });
  it("flags a wide positive gap as underserved", () => {
    expect(situationFromCounts(5, 1).labelKey).toBe("legend_underserved");
  });
  it("uses room-to-grow for a modest positive gap", () => {
    expect(situationFromCounts(3, 2.2).labelKey).toBe("legend_room_to_grow");
  });
  it("calls a near-matched cell balanced", () => {
    expect(situationFromCounts(3, 2.7).labelKey).toBe("legend_balanced");
  });
  it("never contradicts itself: the pill and label agree on saturation", () => {
    const s = situationFromCounts(1, 4);
    expect(s.pill).toBe("status-saturated");
    expect(s.labelKey).toBe("legend_saturated");
  });
});

describe("fmt", () => {
  it("renders an em dash for null/undefined", () => {
    expect(fmt(null)).toBe("—");
    expect(fmt(undefined)).toBe("—");
  });
  it("rounds to the requested precision", () => {
    expect(fmt(5)).toBe("5");
    expect(fmt(5.26, 1)).toBe("5.3");
  });
});

describe("catLabel", () => {
  it("translates known categories in English and Kinyarwanda", () => {
    expect(catLabel("pharmacy", t)).toBe("pharmacy");
    expect(catLabel("salon", tRw)).toBe("saloni");
  });
  it("falls back to a humanised label for unknown keys", () => {
    expect(catLabel("bakery", t)).toBe("Bakery");
  });
});

describe("catPluralEn", () => {
  it("pluralises a consonant+y ending correctly", () => {
    expect(catPluralEn("pharmacy")).toBe("pharmacies");
  });
  it("adds a plain s to regular labels", () => {
    expect(catPluralEn("restaurant")).toBe("restaurants");
    expect(catPluralEn("cafe")).toBe("cafes");
    expect(catPluralEn("supermarket")).toBe("supermarkets");
    expect(catPluralEn("salon")).toBe("salons");
  });
  it("does not double an existing plural", () => {
    expect(catPluralEn("shops")).toBe("shops");
  });
});

describe("activityLabel", () => {
  it("maps English levels through the translation layer", () => {
    expect(activityLabel("High", t)).toBe("High");
    expect(activityLabel("Medium", tRw)).toBe("Bigereranije");
  });
  it("recognises a Kinyarwanda-built value and re-resolves it", () => {
    expect(activityLabel("Byinshi", tRw)).toBe("Byinshi");
    expect(activityLabel("Byinshi", t)).toBe("High");
  });
  it("returns an em dash for a missing value", () => {
    expect(activityLabel(null, t)).toBe("—");
  });
});

describe("landmark naming", () => {
  it("strips a baked-in connector from older reports", () => {
    expect(stripNear("near Kubadive")).toBe("Kubadive");
    expect(stripNear("hafi ya Kwa Pisi")).toBe("Kwa Pisi");
    expect(stripNear(null)).toBeNull();
  });
  it("adds the connector in the active language", () => {
    expect(nearLabel("Kubadive", t)).toBe("near Kubadive");
    expect(nearLabel("Kubadive", tRw)).toBe("hafi ya Kubadive");
  });
  it("returns null when there is no landmark", () => {
    expect(nearLabel(null, t)).toBeNull();
  });
});
