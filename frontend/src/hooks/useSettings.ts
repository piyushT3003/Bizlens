import { create } from "zustand";
import {
  api,
  SettingsData,
  SettingsUpdatePayload,
  ProfileData,
  PreferencesData,
  APIKeyStatusData,
  FacetCompletionData,
} from "@/lib/api";
import { useThemeStore, ThemeMode } from "./useTheme";

const DEFAULT_PROFILE: ProfileData = {
  display_name: "Piyush Toddale",
  email: "piyush@bizlens.ai",
  role: "Lead Analytics Architect",
  status: "active",
  created_at: new Date().toISOString(),
};

const DEFAULT_PREFERENCES: PreferencesData = {
  currency: "INR",
  number_grouping: "lakh_crore",
  fiscal_year_start_month: 4,
  date_format_default: "DD/MM/YYYY",
  timezone: "Asia/Kolkata",
  week_start: 1,
  theme: "dark",
  accent_intensity: 1.0,
  motion_level: "full",
  density: "comfortable",
  ai_detail_level: "balanced",
  gemini_consent: true,
  gemini_consent_at: new Date().toISOString(),
  anomaly_threshold_pct: 15.0,
  email_digests: true,
  webhook_url: "",
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function getCurrencySymbol(curr?: string): string {
  if (!curr) return "₹";
  return CURRENCY_SYMBOLS[curr.toUpperCase()] || curr;
}

export function formatCurrencyAmount(
  val: number,
  currencyCode: string = "INR",
  grouping: string = "lakh_crore"
): string {
  const sym = getCurrencySymbol(currencyCode);
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const sign = isNegative ? "-" : "";

  if (grouping === "lakh_crore") {
    if (absVal >= 10_000_000) {
      return `${sign}${sym}${(absVal / 10_000_000).toFixed(2)} Cr`;
    } else if (absVal >= 100_000) {
      return `${sign}${sym}${(absVal / 100_000).toFixed(2)}L`;
    } else if (absVal >= 1_000) {
      return `${sign}${sym}${(absVal / 1_000).toFixed(1)}k`;
    }
    return `${sign}${sym}${absVal.toLocaleString("en-IN")}`;
  } else {
    // international
    if (absVal >= 1_000_000_000) {
      return `${sign}${sym}${(absVal / 1_000_000_000).toFixed(2)}B`;
    } else if (absVal >= 1_000_000) {
      return `${sign}${sym}${(absVal / 1_000_000).toFixed(2)}M`;
    } else if (absVal >= 1_000) {
      return `${sign}${sym}${(absVal / 1_000).toFixed(1)}k`;
    }
    return `${sign}${sym}${absVal.toLocaleString("en-US")}`;
  }
}

export function computeFacets(
  profile: ProfileData,
  preferences: PreferencesData,
  keyStatus?: APIKeyStatusData
): { completion_percentage: number; facets: FacetCompletionData } {
  const profileComplete = Boolean(profile.display_name?.trim() && profile.role?.trim());
  const appearanceComplete = Boolean(preferences.theme && preferences.motion_level && preferences.density);
  const dataLocaleComplete = Boolean(preferences.currency && preferences.number_grouping && preferences.timezone);
  const aiVaultComplete = Boolean(keyStatus?.is_configured);
  const notificationsComplete = Boolean(preferences.email_digests || preferences.webhook_url);
  const securityComplete = true; // Always active

  const facets: FacetCompletionData = {
    profile: profileComplete,
    appearance: appearanceComplete,
    data_locale: dataLocaleComplete,
    ai_vault: aiVaultComplete,
    notifications: notificationsComplete,
    security: securityComplete,
  };

  const trueCount = Object.values(facets).filter(Boolean).length;
  const completion_percentage = Math.round((trueCount / 6) * 100);

  return { completion_percentage, facets };
}

function applyDOMPreferences(prefs: PreferencesData) {
  if (typeof document === "undefined") return;

  // Motion level: Default to "full" so all 3D card flips, shockwaves, and ambient animations run smoothly
  const motionVal = prefs.motion_level || "full";
  document.documentElement.setAttribute("data-motion", motionVal);

  // Density: Reflect density (comfortable by default) safely into DOM without altering root scale
  const densityVal = prefs.density || "comfortable";
  document.documentElement.setAttribute("data-density", densityVal);

  // Accent Intensity
  if (prefs.accent_intensity !== undefined) {
    document.documentElement.style.setProperty("--accent-intensity", String(prefs.accent_intensity));
  }

  // Theme sync
  if (prefs.theme && ["dark", "light", "hybrid", "system"].includes(prefs.theme)) {
    useThemeStore.getState().setTheme(prefs.theme as ThemeMode);
  }
}

function loadInitialSettings(): SettingsData {
  let profile = { ...DEFAULT_PROFILE };
  let preferences = { ...DEFAULT_PREFERENCES, density: "comfortable" };
  let keyStatus: APIKeyStatusData = {
    provider: "google_gemini",
    is_configured: false,
    source: "none",
    is_valid: true,
  };

  if (typeof window !== "undefined") {
    // 0. Auto-purge any stale test/unknown name, USD currency pollution, or compact/reduced motion anomalies
    const rawStoredName = localStorage.getItem("bizlens_display_name");
    if (rawStoredName && (rawStoredName.includes("Alexander") || rawStoredName.includes("Offline"))) {
      localStorage.removeItem("bizlens_display_name");
      localStorage.removeItem("bizlens_settings");
    }
    const rawStoredCurrency = localStorage.getItem("bizlens_currency");
    if (rawStoredCurrency === "USD") {
      localStorage.removeItem("bizlens_currency");
      localStorage.removeItem("bizlens_number_grouping");
      localStorage.removeItem("bizlens_settings");
    }
    const rawStoredMotion = localStorage.getItem("bizlens_motion_level");
    if (rawStoredMotion === "reduced" || rawStoredMotion === "off") {
      localStorage.removeItem("bizlens_motion_level");
      localStorage.removeItem("bizlens_settings");
    }
    const rawStoredDensity = localStorage.getItem("bizlens_density");
    if (rawStoredDensity === "compact") {
      localStorage.removeItem("bizlens_density");
      localStorage.removeItem("bizlens_settings");
    }

    // 1. Try saved settings json
    try {
      const raw = localStorage.getItem("bizlens_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.profile?.display_name && !parsed.profile.display_name.includes("Alexander") && !parsed.profile.display_name.includes("Offline")) {
          profile = { ...profile, ...parsed.profile };
        }
        if (parsed.preferences) {
          // Guard against stale USD or reduced motion pollution
          if (parsed.preferences.currency === "USD") {
            parsed.preferences.currency = "INR";
            parsed.preferences.number_grouping = "lakh_crore";
          }
          if (parsed.preferences.motion_level === "reduced" || parsed.preferences.motion_level === "off") {
            parsed.preferences.motion_level = "full";
          }
          if (parsed.preferences.density === "compact") {
            parsed.preferences.density = "comfortable";
          }
          preferences = { ...preferences, ...parsed.preferences };
        }
        if (parsed.key_status) keyStatus = { ...keyStatus, ...parsed.key_status };
      }
    } catch (e) {
      console.warn("Failed to parse cached settings:", e);
    }

    // 2. Check atomic localStorage overrides with sanitization
    const storedName = localStorage.getItem("bizlens_display_name");
    if (storedName && !storedName.includes("Alexander") && !storedName.includes("Offline")) {
      profile.display_name = storedName;
    } else {
      profile.display_name = DEFAULT_PROFILE.display_name;
    }

    const storedRole = localStorage.getItem("bizlens_role");
    if (storedRole) profile.role = storedRole;

    const storedCurrency = localStorage.getItem("bizlens_currency");
    if (storedCurrency && storedCurrency !== "USD") {
      preferences.currency = storedCurrency;
    } else {
      preferences.currency = "INR";
    }

    const storedGrouping = localStorage.getItem("bizlens_number_grouping");
    if (storedGrouping && preferences.currency === "INR") {
      preferences.number_grouping = "lakh_crore";
    } else if (storedGrouping) {
      preferences.number_grouping = storedGrouping;
    } else {
      preferences.number_grouping = "lakh_crore";
    }

    const storedMotion = localStorage.getItem("bizlens_motion_level");
    if (storedMotion && storedMotion === "full") {
      preferences.motion_level = storedMotion;
    } else {
      preferences.motion_level = "full";
    }

    const storedDensity = localStorage.getItem("bizlens_density");
    if (storedDensity && storedDensity === "comfortable") {
      preferences.density = storedDensity;
    } else {
      preferences.density = "comfortable";
    }

    const storedAccent = localStorage.getItem("bizlens_accent_intensity");
    if (storedAccent) {
      const parsed = parseFloat(storedAccent);
      if (!isNaN(parsed)) preferences.accent_intensity = parsed;
    }

    const storedTheme = localStorage.getItem("bizlens_theme");
    if (storedTheme) preferences.theme = storedTheme;

    const localKey = localStorage.getItem("bizlens_gemini_api_key") || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
    if (localKey) {
      keyStatus = {
        provider: "google_gemini",
        is_configured: true,
        source: "custom_vault",
        masked_key: `${localKey.slice(0, 6)}...****${localKey.slice(-4)}`,
        is_valid: true,
        message: "Configured via Local Vault",
      };
    }

    // Apply DOM effects immediately on startup
    applyDOMPreferences(preferences);
  }

  const { completion_percentage, facets } = computeFacets(profile, preferences, keyStatus);

  return {
    profile,
    preferences,
    key_status: keyStatus,
    completion_percentage,
    facets,
  };
}

interface SettingsState {
  settings: SettingsData;
  preferences: PreferencesData;
  profile: ProfileData;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastSavedAt: Date | null;

  // Actions
  fetchSettings: () => Promise<SettingsData>;
  saveSettings: (payload: Partial<SettingsUpdatePayload>) => Promise<SettingsData>;
  setProfileField: (field: keyof ProfileData, value: any) => void;
  setPreferenceField: (field: keyof PreferencesData, value: any) => void;
  setKeyStatus: (status: APIKeyStatusData) => void;
  formatCurrency: (val: number, overrideCurrency?: string) => string;
  getSymbol: () => string;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initialSettings = loadInitialSettings();

  return {
    settings: initialSettings,
    preferences: initialSettings.preferences,
    profile: initialSettings.profile,
    isLoading: false,
    isSaving: false,
    error: null,
    lastSavedAt: null,

    fetchSettings: async () => {
      set({ isLoading: true, error: null });
      try {
        const remoteData = await api.getSettings();
        if (remoteData) {
          // Merge with any local custom key if remote has none
          const localKey =
            typeof window !== "undefined"
              ? localStorage.getItem("bizlens_gemini_api_key") || (import.meta as any).env?.VITE_GEMINI_API_KEY || ""
              : "";

          let effectiveKeyStatus = remoteData.key_status;
          if (!effectiveKeyStatus?.is_configured && localKey) {
            effectiveKeyStatus = {
              provider: "google_gemini",
              is_configured: true,
              source: "custom_vault",
              masked_key: `${localKey.slice(0, 6)}...****${localKey.slice(-4)}`,
              is_valid: true,
              message: "Configured via Local Vault",
            };
          }

          const merged: SettingsData = {
            ...remoteData,
            key_status: effectiveKeyStatus,
          };

          const { completion_percentage: computedPct, facets: computedFacets } = computeFacets(
            merged.profile,
            merged.preferences,
            effectiveKeyStatus
          );
          merged.completion_percentage = remoteData.completion_percentage !== undefined ? remoteData.completion_percentage : computedPct;
          merged.facets = remoteData.facets || computedFacets;

          if (typeof window !== "undefined") {
            localStorage.setItem("bizlens_settings", JSON.stringify(merged));
            localStorage.setItem("bizlens_display_name", merged.profile.display_name);
            if (merged.profile.role) localStorage.setItem("bizlens_role", merged.profile.role);
            localStorage.setItem("bizlens_currency", merged.preferences.currency);
            localStorage.setItem("bizlens_number_grouping", merged.preferences.number_grouping);
            localStorage.setItem("bizlens_motion_level", merged.preferences.motion_level);
            localStorage.setItem("bizlens_density", merged.preferences.density);
            localStorage.setItem("bizlens_accent_intensity", String(merged.preferences.accent_intensity));
          }

          applyDOMPreferences(merged.preferences);
          set({ settings: merged, preferences: merged.preferences, profile: merged.profile, isLoading: false });
          return merged;
        }
      } catch (err: any) {
        console.warn("Backend settings fetch unavailable, using resilient local storage state:", err?.message);
      }
      set({ isLoading: false });
      return get().settings;
    },

    saveSettings: async (payload: Partial<SettingsUpdatePayload>) => {
      set({ isSaving: true, error: null });
      const current = get().settings;

      // Optimistically create new state
      const updatedProfile: ProfileData = {
        ...current.profile,
        ...(payload.display_name !== undefined ? { display_name: payload.display_name } : {}),
      };

      const updatedPrefs: PreferencesData = {
        ...current.preferences,
        ...(payload.currency !== undefined ? { currency: payload.currency } : {}),
        ...(payload.number_grouping !== undefined ? { number_grouping: payload.number_grouping } : {}),
        ...(payload.fiscal_year_start_month !== undefined ? { fiscal_year_start_month: payload.fiscal_year_start_month } : {}),
        ...(payload.date_format_default !== undefined ? { date_format_default: payload.date_format_default } : {}),
        ...(payload.timezone !== undefined ? { timezone: payload.timezone } : {}),
        ...(payload.week_start !== undefined ? { week_start: payload.week_start } : {}),
        ...(payload.theme !== undefined ? { theme: payload.theme } : {}),
        ...(payload.accent_intensity !== undefined ? { accent_intensity: payload.accent_intensity } : {}),
        ...(payload.motion_level !== undefined ? { motion_level: payload.motion_level } : {}),
        ...(payload.density !== undefined ? { density: payload.density } : {}),
        ...(payload.ai_detail_level !== undefined ? { ai_detail_level: payload.ai_detail_level } : {}),
        ...(payload.gemini_consent !== undefined ? { gemini_consent: payload.gemini_consent } : {}),
        ...(payload.anomaly_threshold_pct !== undefined ? { anomaly_threshold_pct: payload.anomaly_threshold_pct } : {}),
        ...(payload.email_digests !== undefined ? { email_digests: payload.email_digests } : {}),
        ...(payload.webhook_url !== undefined ? { webhook_url: payload.webhook_url } : {}),
      };

      const { completion_percentage, facets } = computeFacets(
        updatedProfile,
        updatedPrefs,
        current.key_status
      );

      const optimisticSettings: SettingsData = {
        profile: updatedProfile,
        preferences: updatedPrefs,
        key_status: current.key_status,
        completion_percentage,
        facets,
      };

      // 1. Immediately persist to localStorage and DOM (only store modified keys atomically)
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("bizlens_settings", JSON.stringify(optimisticSettings));
          if (payload.display_name !== undefined) {
            localStorage.setItem("bizlens_display_name", updatedProfile.display_name);
          }
          if (payload.role !== undefined) {
            localStorage.setItem("bizlens_role", updatedProfile.role);
          }
          if (payload.currency !== undefined) {
            localStorage.setItem("bizlens_currency", updatedPrefs.currency);
          }
          if (payload.number_grouping !== undefined) {
            localStorage.setItem("bizlens_number_grouping", updatedPrefs.number_grouping);
          }
          if (payload.motion_level !== undefined) {
            localStorage.setItem("bizlens_motion_level", updatedPrefs.motion_level);
          }
          if (payload.density !== undefined) {
            localStorage.setItem("bizlens_density", updatedPrefs.density);
          }
          if (payload.accent_intensity !== undefined) {
            localStorage.setItem("bizlens_accent_intensity", String(updatedPrefs.accent_intensity));
          }
          if (payload.theme !== undefined) {
            localStorage.setItem("bizlens_theme", updatedPrefs.theme);
          }
        } catch (e) {
          console.error("Failed to write to localStorage:", e);
        }
      }

      applyDOMPreferences(updatedPrefs);
      set({
        settings: optimisticSettings,
        preferences: optimisticSettings.preferences,
        profile: optimisticSettings.profile,
        isSaving: false,
        lastSavedAt: new Date(),
      });

      // 2. Best-effort async synchronization to backend using specific payload
      try {
        const remoteResult = await api.updateSettings(payload as SettingsUpdatePayload);
        if (remoteResult) {
          const finalResult: SettingsData = {
            ...remoteResult,
            key_status: current.key_status.is_configured ? current.key_status : remoteResult.key_status,
          };
          const f = computeFacets(finalResult.profile, finalResult.preferences, finalResult.key_status);
          finalResult.completion_percentage = f.completion_percentage;
          finalResult.facets = f.facets;

          if (typeof window !== "undefined") {
            localStorage.setItem("bizlens_settings", JSON.stringify(finalResult));
          }
          set({
            settings: finalResult,
            preferences: finalResult.preferences,
            profile: finalResult.profile,
          });
          return finalResult;
        }
      } catch (syncErr: any) {
        // Backend synchronization error: Logged silently so user action always succeeds
        console.warn("Backend settings sync failed, offline/standalone mode retained settings locally:", syncErr?.message);
      }

      return optimisticSettings;
    },

    setProfileField: (field, value) => {
      set((state) => {
        const profile = { ...state.settings.profile, [field]: value };
        const { completion_percentage, facets } = computeFacets(
          profile,
          state.settings.preferences,
          state.settings.key_status
        );
        const updated = {
          ...state.settings,
          profile,
          completion_percentage,
          facets,
        };
        if (typeof window !== "undefined") {
          localStorage.setItem("bizlens_settings", JSON.stringify(updated));
          if (field === "display_name") localStorage.setItem("bizlens_display_name", String(value));
          if (field === "role") localStorage.setItem("bizlens_role", String(value));
        }
        return {
          settings: updated,
          profile,
          preferences: state.settings.preferences,
        };
      });
    },

    setPreferenceField: (field, value) => {
      set((state) => {
        const preferences = { ...state.settings.preferences, [field]: value };
        const { completion_percentage, facets } = computeFacets(
          state.settings.profile,
          preferences,
          state.settings.key_status
        );
        const updated = {
          ...state.settings,
          preferences,
          completion_percentage,
          facets,
        };
        applyDOMPreferences(preferences);
        if (typeof window !== "undefined") {
          localStorage.setItem("bizlens_settings", JSON.stringify(updated));
          if (typeof value === "string" || typeof value === "number") {
            localStorage.setItem(`bizlens_${field}`, String(value));
          }
        }
        return {
          settings: updated,
          preferences,
          profile: state.settings.profile,
        };
      });
    },

    setKeyStatus: (keyStatus) => {
      set((state) => {
        const { completion_percentage, facets } = computeFacets(
          state.settings.profile,
          state.settings.preferences,
          keyStatus
        );
        const updated = {
          ...state.settings,
          key_status: keyStatus,
          completion_percentage,
          facets,
        };
        if (typeof window !== "undefined") {
          localStorage.setItem("bizlens_settings", JSON.stringify(updated));
        }
        return { settings: updated };
      });
    },

    formatCurrency: (val: number, overrideCurrency?: string) => {
      const prefs = get().settings.preferences;
      return formatCurrencyAmount(val, overrideCurrency || prefs.currency, prefs.number_grouping);
    },

    getSymbol: () => {
      return getCurrencySymbol(get().settings.preferences.currency);
    },
  };
});
