import { create } from "zustand";

export type ThemeMode = "dark" | "light" | "hybrid" | "system";
export type ActiveTheme = "dark" | "light" | "hybrid";

interface ThemeState {
  theme: ThemeMode;
  activeTheme: ActiveTheme;
  setTheme: (theme: ThemeMode) => void;
}

const resolveActiveTheme = (theme: ThemeMode): ActiveTheme => {
  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    return "dark";
  }
  return theme;
};

export const useThemeStore = create<ThemeState>((set) => {
  let initialTheme: ThemeMode = "dark";
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("bizlens_theme") as ThemeMode | null;
    if (saved && ["dark", "light", "hybrid", "system"].includes(saved)) {
      initialTheme = saved;
    }
  }

  const initialActive = resolveActiveTheme(initialTheme);
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", initialActive);
  }

  return {
    theme: initialTheme,
    activeTheme: initialActive,
    setTheme: (newTheme: ThemeMode) => {
      const active = resolveActiveTheme(newTheme);
      if (typeof window !== "undefined") {
        localStorage.setItem("bizlens_theme", newTheme);
        document.documentElement.setAttribute("data-theme", active);
      }
      set({ theme: newTheme, activeTheme: active });
    },
  };
});
