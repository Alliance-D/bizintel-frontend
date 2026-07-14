// Shared POI glyph definitions so the report map (which rasterises them into
// MapLibre icon images) and the map legend (which renders them inline) can
// never drift apart - one source for the paths, colours and disc shape.

// lucide-style 24x24 path bodies, drawn white on a coloured disc.
export const POI_GLYPHS: Record<string, string> = {
  transport: '<rect x="4" y="5" width="16" height="12" rx="2.5"/><path d="M4 11h16"/><circle cx="8.5" cy="20" r="1.5"/><circle cx="15.5" cy="20" r="1.5"/>',
  market: '<path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10 5.5 4h13L20 10"/><path d="M9 20v-5h6v5"/>',
  school: '<path d="M3 9 12 5l9 4-9 4z"/><path d="M7 11v4c0 1.2 2.2 2 5 2s5-.8 5-2v-4"/>',
  health: '<path d="M12 6v12M6 12h12"/>',
  anchor: '<circle cx="12" cy="12" r="5"/>',
  // per-category competitor glyphs ("shops like yours")
  pharmacy: '<rect x="4" y="9" width="16" height="6" rx="3"/><path d="M12 9v6"/>',
  restaurant: '<path d="M7 3v6a1.5 1.5 0 0 0 3 0V3"/><path d="M8.5 9v12"/><path d="M16 3c-1.3 0-2 1.7-2 4.5S15 12 16 12v9"/>',
  cafe: '<path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 9h2a3 3 0 0 1 0 6h-2"/><path d="M7 3v2M11 3v2"/>',
  grocery: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  salon: '<circle cx="7" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><path d="M9 8.5 20 4M9 15.5 20 20"/>',
  store: '<path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10 5.5 4h13L20 10"/>',
};

export const COMPETITOR_COLOR = "#B9543A";
// Complementary businesses (other categories nearby) - a distinct hue from the
// clay competitors and the gold/teal demand anchors.
export const COMPLEMENTARY_COLOR = "#5B63A8";
export const ANCHOR_COLORS: Record<string, string> = {
  transport: "#0E7A62", market: "#B08033", school: "#7A6A33", health: "#0E7A62", anchor: "#B08033",
};

export type AnchorIconKey = "transport" | "market" | "school" | "health" | "anchor";

export function anchorIconKey(categoryKey: string): AnchorIconKey {
  if (categoryKey === "transport") return "transport";
  if (categoryKey === "market") return "market";
  if (categoryKey === "school") return "school";
  if (categoryKey === "health") return "health";
  return "anchor";
}

export function competitorGlyphKey(category?: string): string {
  return category && POI_GLYPHS[category] ? category : "store";
}

// Full <svg> string used to build MapLibre icon images. A soft outer glow makes
// the pins read against the desaturated basemap; the solid disc + white glyph
// sits on top.
export function discSvgMarkup(color: string, glyph: string, glow = true): string {
  const defs = glow
    ? '<defs><filter id="poiGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>'
    : "";
  const glowEl = glow ? `<circle cx="26" cy="26" r="18" fill="${color}" opacity="0.5" filter="url(#poiGlow)"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">${defs}${glowEl}` +
    `<circle cx="26" cy="26" r="14" fill="${color}" stroke="#ffffff" stroke-width="2.6"/>` +
    `<g transform="translate(16.4,16.4) scale(0.8)" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>` +
    `</svg>`;
}

// Inline React version for legends (no glow needed at small size).
export function PoiGlyph({ color, glyph, size = 18 }: { color: string; glyph: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="26" cy="26" r="14" fill={color} stroke="#ffffff" strokeWidth="2.6" />
      <g transform="translate(16.4,16.4) scale(0.8)" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: glyph }} />
    </svg>
  );
}
