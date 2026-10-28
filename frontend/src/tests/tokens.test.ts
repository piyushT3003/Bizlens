import { describe, it, expect } from "vitest";
import { brandTokens, statusTokens, chartTokens, themeTokens } from "../design/tokens";
import fs from "fs";
import path from "path";

describe("Design System Tokens", () => {
  it("contains all brand tokens per Quantum Horizon spec", () => {
    expect(brandTokens.orange).toBe("#FF7A1A");
    expect(brandTokens.ember).toBe("#FF9A3C");
    expect(brandTokens.amberHighlight).toBe("#FFB347");
    expect(brandTokens.deepOrangeText).toBe("#C2410C");
    expect(brandTokens.burnt).toBe("#7C2D12");
  });

  it("contains complete status tokens for both dark and light modes", () => {
    const statuses = ["positive", "warning", "critical", "neutral"] as const;
    statuses.forEach((status) => {
      expect(statusTokens[status]).toBeDefined();
      expect(statusTokens[status].dark).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(statusTokens[status].light).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(statusTokens[status].bgDark).toContain("rgba(");
      expect(statusTokens[status].bgLight).toContain("rgba(");
    });
  });

  it("contains complete chart tokens", () => {
    expect(chartTokens.primaryOrange).toBe("#FF7A1A");
    expect(chartTokens.secondaryAmber).toBe("#FFB347");
    expect(chartTokens.comparisonTeal.dark).toBe("#2DD4BF");
    expect(chartTokens.comparisonTeal.light).toBe("#0F766E");
  });

  it("supports Dark, Light, and Hybrid theme surface definitions", () => {
    const themes = ["dark", "light", "hybrid"] as const;
    themes.forEach((th) => {
      const theme = themeTokens[th];
      expect(theme).toBeDefined();
      expect(theme.base).toBeDefined();
      expect(theme.surface).toBeDefined();
      expect(theme.card).toBeDefined();
      expect(theme.border).toBeDefined();
      expect(theme.text).toBeDefined();
      expect(theme.textMuted).toBeDefined();
      expect(theme.glowSm).toBeDefined();
      expect(theme.glowMd).toBeDefined();
      expect(theme.glowLg).toBeDefined();
    });
  });

  it("audits codebase for unauthorized ad-hoc raw hex codes outside tokens and canvas visualizers", () => {
    // Only tokens.ts and 3D Three.js canvas shaders/visualizers (which feed Hex numbers into WebGL) may define hex values.
    // Standard UI components must consume Tailwind semantic classes or CSS variables.
    const componentsDir = path.resolve(__dirname, "../components/ui");
    if (!fs.existsSync(componentsDir)) return;

    const files = fs.readdirSync(componentsDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
    const hexPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

    const violations: { file: string; match: string }[] = [];

    files.forEach((file) => {
      const content = fs.readFileSync(path.join(componentsDir, file), "utf-8");
      const matches = content.match(hexPattern);
      if (matches) {
        matches.forEach((m) => {
          violations.push({ file, match: m });
        });
      }
    });

    expect(
      violations,
      `Found ad-hoc hex values in UI components: ${JSON.stringify(violations, null, 2)}. Use tokens or CSS variables!`
    ).toHaveLength(0);
  });
});
