// Color tokens lifted straight from the extension's popup.css so the
// demo matches the real product surface.
export const C = {
  canvas: "#ffffff",
  stone: "#eeece7",
  paleGreen: "#edfce9",
  paleBlue: "#f1f5ff",
  nearBlack: "#17171c",
  ink: "#212121",
  muted: "#93939f",
  slate: "#75758a",
  hairline: "#d9d9dd",
  borderLight: "#e5e7eb",
  cardBorder: "#f2f2f2",
  deepGreen: "#003c33",
  navy: "#071829",
  blue: "#1863dc",
  focusBlue: "#4c6ee6",
  coral: "#ff7759",
  softCoral: "#ffad9b",
  error: "#b30000",
} as const;

export const FONT = {
  display: '"Inter", "Cairo", system-ui, sans-serif',
  body: '"Inter", "Cairo", system-ui, sans-serif',
  arabic: '"Cairo", "Inter", system-ui, sans-serif',
} as const;

// Severity → accent color
export const SEV = {
  high: C.coral,
  medium: "#e0a000",
  low: C.blue,
} as const;
