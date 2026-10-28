import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#FF7A1A",
          ember: "#FF9A3C",
          amber: "#FFB347",
          deepOrange: "#C2410C",
          burnt: "#7C2D12",
        },
        surface: {
          base: "var(--bg-base)",
          main: "var(--bg-surface)",
          subtle: "var(--bg-surface-subtle)",
          card: "var(--bg-card)",
          border: "var(--border-color)",
          borderHover: "var(--border-hover)",
          drawer: "var(--bg-drawer)",
          modal: "var(--bg-modal)",
          tile: "var(--bg-tile)",
          tileElevated: "var(--bg-tile-elevated)",
          tileSubtle: "var(--bg-tile-subtle)",
          tileHover: "var(--bg-tile-hover)",
        },
        text: {
          main: "var(--text-main)",
          muted: "var(--text-muted)",
        },
        status: {
          positive: "var(--status-positive)",
          positiveBg: "var(--status-positive-bg)",
          warning: "var(--status-warning)",
          warningBg: "var(--status-warning-bg)",
          critical: "var(--status-critical)",
          criticalBg: "var(--status-critical-bg)",
          neutral: "var(--status-neutral)",
          neutralBg: "var(--status-neutral-bg)",
        },
        chart: {
          teal: "var(--chart-teal)",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        glowSm: "var(--glow-sm)",
        glowMd: "var(--glow-md)",
        glowLg: "var(--glow-lg)",
      },
    },
  },
  plugins: [],
};

export default config;
