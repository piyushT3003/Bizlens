/**
 * BIZLENS QUANTUM HORIZON DESIGN TOKENS
 * Single source of truth for colors, elevations, glows, and theme system values.
 * Ad-hoc hex values outside this file are strictly forbidden.
 */

export const brandTokens = {
  orange: "#FF7A1A",
  ember: "#FF9A3C",
  amberHighlight: "#FFB347",
  deepOrangeText: "#C2410C", // Contrast-verified for WCAG AA text on light surfaces
  burnt: "#7C2D12",
} as const;

export const statusTokens = {
  positive: {
    dark: "#22C55E",
    light: "#15803D",
    bgDark: "rgba(34, 197, 94, 0.12)",
    bgLight: "rgba(21, 128, 61, 0.10)",
  },
  warning: {
    dark: "#EAB308",
    light: "#A16207",
    bgDark: "rgba(234, 179, 8, 0.12)",
    bgLight: "rgba(161, 98, 7, 0.10)",
  },
  critical: {
    dark: "#EF4444",
    light: "#B91C1C",
    bgDark: "rgba(239, 68, 68, 0.12)",
    bgLight: "rgba(185, 28, 28, 0.10)",
  },
  neutral: {
    dark: "#94A3B8",
    light: "#475569",
    bgDark: "rgba(148, 163, 184, 0.12)",
    bgLight: "rgba(71, 85, 105, 0.10)",
  },
} as const;

export const chartTokens = {
  primaryOrange: "#FF7A1A",
  secondaryAmber: "#FFB347",
  comparisonTeal: {
    dark: "#2DD4BF",
    light: "#0F766E",
  },
} as const;

export interface SurfaceTheme {
  base: string;
  surface: string;
  surfaceSubtle: string;
  card: string;
  border: string;
  borderHover: string;
  text: string;
  textMuted: string;
  shadow: string;
  glowSm: string;
  glowMd: string;
  glowLg: string;
  brandText: string;
}

export const themeTokens: Record<"dark" | "light" | "hybrid", SurfaceTheme> = {
  dark: {
    base: "#07070A",
    surface: "#0E0B09",
    surfaceSubtle: "#16120E",
    card: "rgba(255, 140, 40, 0.05)",
    border: "rgba(255, 140, 40, 0.18)",
    borderHover: "rgba(255, 140, 40, 0.40)",
    text: "#FFF4EA",
    textMuted: "#B8A89A",
    shadow: "0 8px 32px 0 rgba(0, 0, 0, 0.6)",
    glowSm: "0 0 10px rgba(255, 122, 26, 0.25)",
    glowMd: "0 0 20px rgba(255, 122, 26, 0.40)",
    glowLg: "0 0 35px rgba(255, 122, 26, 0.55)",
    brandText: brandTokens.amberHighlight,
  },
  light: {
    base: "#FFF8F2",
    surface: "#FFFFFF",
    surfaceSubtle: "#FDF1E7",
    card: "#FFFFFF",
    border: "#F1DCCB",
    borderHover: "#E5B899",
    text: "#1A1210",
    textMuted: "#6B5B52",
    shadow: "0 8px 24px -4px rgba(124, 45, 18, 0.06)",
    glowSm: "0 0 8px rgba(255, 122, 26, 0.15)",
    glowMd: "0 0 16px rgba(255, 122, 26, 0.25)",
    glowLg: "0 0 24px rgba(255, 122, 26, 0.35)",
    brandText: brandTokens.deepOrangeText,
  },
  hybrid: {
    // Dark chrome (sidebar, top bar, hero canvas) with clean light content cards
    base: "#07070A",
    surface: "#FFFFFF",
    surfaceSubtle: "#FDF1E7",
    card: "#FFFFFF",
    border: "rgba(255, 140, 40, 0.22)",
    borderHover: "rgba(255, 140, 40, 0.45)",
    text: "#1A1210",
    textMuted: "#6B5B52",
    shadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
    glowSm: "0 0 10px rgba(255, 122, 26, 0.25)",
    glowMd: "0 0 20px rgba(255, 122, 26, 0.40)",
    glowLg: "0 0 35px rgba(255, 122, 26, 0.55)",
    brandText: brandTokens.deepOrangeText,
  },
};
