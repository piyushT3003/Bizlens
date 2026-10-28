import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "../hooks/useTheme";

describe("Theme Switcher and Store", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to dark theme", () => {
    const { theme } = useThemeStore.getState();
    expect(theme).toBe("dark");
  });

  it("updates theme to light and persists to localStorage and documentElement", () => {
    useThemeStore.getState().setTheme("light");
    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("bizlens_theme")).toBe("light");
  });

  it("updates theme to hybrid and persists to localStorage and documentElement", () => {
    useThemeStore.getState().setTheme("hybrid");
    expect(useThemeStore.getState().theme).toBe("hybrid");
    expect(document.documentElement.getAttribute("data-theme")).toBe("hybrid");
    expect(localStorage.getItem("bizlens_theme")).toBe("hybrid");
  });

  it("updates theme to dark and persists", () => {
    useThemeStore.getState().setTheme("dark");
    expect(useThemeStore.getState().theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("bizlens_theme")).toBe("dark");
  });
});
