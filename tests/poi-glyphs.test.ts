import { describe, it, expect } from "vitest";
import { POI_GLYPHS, competitorGlyphKey, anchorIconKey } from "@/components/platform/poiGlyphs";

describe("competitorGlyphKey", () => {
  it("uses the searched category's own glyph when one exists", () => {
    expect(competitorGlyphKey("pharmacy")).toBe("pharmacy");
    expect(competitorGlyphKey("salon")).toBe("salon");
  });
  it("falls back to a generic store glyph for anything unmapped", () => {
    expect(competitorGlyphKey("bakery")).toBe("store");
    expect(competitorGlyphKey(undefined)).toBe("store");
  });
  it("only ever returns a key that exists in POI_GLYPHS", () => {
    for (const c of ["pharmacy", "restaurant", "cafe", "grocery", "salon", "unknown", undefined]) {
      expect(POI_GLYPHS[competitorGlyphKey(c)]).toBeTruthy();
    }
  });
});

describe("anchorIconKey", () => {
  it("maps each known POI type to its own icon", () => {
    expect(anchorIconKey("transport")).toBe("transport");
    expect(anchorIconKey("market")).toBe("market");
    expect(anchorIconKey("school")).toBe("school");
    expect(anchorIconKey("health")).toBe("health");
  });
  it("groups everything else under the generic anchor icon", () => {
    expect(anchorIconKey("finance")).toBe("anchor");
    expect(anchorIconKey("commercial_support")).toBe("anchor");
  });
  it("always resolves to a defined glyph", () => {
    for (const c of ["transport", "market", "school", "health", "finance"]) {
      expect(POI_GLYPHS[anchorIconKey(c)]).toBeTruthy();
    }
  });
});
