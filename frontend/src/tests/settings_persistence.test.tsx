import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  useSettingsStore,
  formatCurrencyAmount,
  getCurrencySymbol,
  computeFacets,
} from "@/hooks/useSettings";
import * as apiModule from "@/lib/api";

describe("Settings Store & Persistence Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-motion");
    document.documentElement.removeAttribute("data-density");
    document.documentElement.style.removeProperty("--accent-intensity");
    vi.spyOn(apiModule.api, "updateSettings").mockImplementation(async (payload) => ({
      profile: {
        display_name: payload.display_name || "Piyush Toddale",
        email: "piyush@bizlens.ai",
        role: "Lead Analytics Architect",
        status: "active",
        created_at: new Date().toISOString(),
      },
      preferences: {
        currency: payload.currency || "INR",
        number_grouping: payload.number_grouping || "lakh_crore",
        fiscal_year_start_month: 4,
        date_format_default: "DD/MM/YYYY",
        timezone: "Asia/Kolkata",
        week_start: 1,
        theme: payload.theme || "dark",
        accent_intensity: payload.accent_intensity ?? 1.0,
        motion_level: payload.motion_level || "full",
        density: payload.density || "comfortable",
        ai_detail_level: "balanced",
        gemini_consent: true,
        gemini_consent_at: new Date().toISOString(),
        anomaly_threshold_pct: 15.0,
        email_digests: true,
      },
      key_status: {
        provider: "google_gemini",
        is_configured: true,
        source: "environment",
        is_valid: true,
      },
      completion_percentage: 100,
      facets: {
        profile: true,
        appearance: true,
        data_locale: true,
        ai_vault: true,
        notifications: true,
        security: true,
      },
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute("data-motion");
    document.documentElement.removeAttribute("data-density");
    document.documentElement.style.removeProperty("--accent-intensity");
  });

  it("initializes with default settings and reflects in DOM", () => {
    const store = useSettingsStore.getState();
    expect(store.settings.profile.display_name).toBe("Piyush Toddale");
    expect(store.settings.preferences.currency).toBe("INR");
    expect(store.settings.preferences.motion_level).toBe("full");
    expect(store.settings.preferences.density).toBe("comfortable");
  });

  it("formats currency correctly for Indian and International systems", () => {
    // Indian Lakh/Crore
    expect(formatCurrencyAmount(12400000, "INR", "lakh_crore")).toBe("₹1.24 Cr");
    expect(formatCurrencyAmount(580000, "INR", "lakh_crore")).toBe("₹5.80L");
    expect(formatCurrencyAmount(45000, "INR", "lakh_crore")).toBe("₹45.0k");

    // International System
    expect(formatCurrencyAmount(1250000000, "USD", "international")).toBe("$1.25B");
    expect(formatCurrencyAmount(12400000, "USD", "international")).toBe("$12.40M");
    expect(formatCurrencyAmount(850000, "EUR", "international")).toBe("€850.0k");
    expect(formatCurrencyAmount(45000, "GBP", "international")).toBe("£45.0k");
  });

  it("persists preference updates to localStorage and synchronizes DOM attributes", async () => {
    const store = useSettingsStore.getState();

    await store.saveSettings({
      display_name: "Piyush Toddale (Updated)",
      motion_level: "reduced",
      density: "compact",
      accent_intensity: 1.25,
      currency: "USD",
      number_grouping: "international",
    });

    const updated = useSettingsStore.getState().settings;
    expect(updated.profile.display_name).toBe("Piyush Toddale (Updated)");
    expect(updated.preferences.motion_level).toBe("reduced");
    expect(updated.preferences.density).toBe("compact");
    expect(updated.preferences.accent_intensity).toBe(1.25);
    expect(updated.preferences.currency).toBe("USD");

    // Check localStorage
    expect(localStorage.getItem("bizlens_display_name")).toBe("Piyush Toddale (Updated)");
    expect(localStorage.getItem("bizlens_motion_level")).toBe("reduced");
    expect(localStorage.getItem("bizlens_density")).toBe("compact");
    expect(localStorage.getItem("bizlens_accent_intensity")).toBe("1.25");
    expect(localStorage.getItem("bizlens_currency")).toBe("USD");

    // Check DOM attribute reflection
    expect(document.documentElement.getAttribute("data-motion")).toBe("reduced");
    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    expect(document.documentElement.style.getPropertyValue("--accent-intensity")).toBe("1.25");
  });

  it("handles offline backend failure gracefully during saveSettings without throwing", async () => {
    const store = useSettingsStore.getState();

    // Mock API to simulate network disconnect
    const apiModule = await import("@/lib/api");
    vi.spyOn(apiModule.api, "updateSettings").mockRejectedValue(new Error("Failed to fetch"));

    // Saving should still succeed from user perspective and save to local storage
    const result = await store.saveSettings({
      display_name: "Offline Analyst",
      currency: "EUR",
    });

    expect(result.profile.display_name).toBe("Offline Analyst");
    expect(result.preferences.currency).toBe("EUR");
    expect(localStorage.getItem("bizlens_display_name")).toBe("Offline Analyst");
    expect(localStorage.getItem("bizlens_currency")).toBe("EUR");
  });

  it("computes facet completion accurately based on active state", () => {
    const profile = {
      display_name: "Piyush Toddale",
      email: "piyush@bizlens.ai",
      role: "Lead Architect",
      status: "active",
      created_at: "2026-01-01",
    };
    const prefs = {
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
      anomaly_threshold_pct: 15.0,
      email_digests: true,
      webhook_url: "",
    };
    const keyStatusUnconfigured = {
      provider: "google_gemini",
      is_configured: false,
      source: "none",
      is_valid: true,
    };

    const res1 = computeFacets(profile, prefs, keyStatusUnconfigured);
    expect(res1.facets.ai_vault).toBe(false);
    expect(res1.completion_percentage).toBe(83); // 5 of 6

    const keyStatusConfigured = {
      provider: "google_gemini",
      is_configured: true,
      source: "custom_vault",
      is_valid: true,
    };
    const res2 = computeFacets(profile, prefs, keyStatusConfigured);
    expect(res2.facets.ai_vault).toBe(true);
    expect(res2.completion_percentage).toBe(100); // 6 of 6
  });
});
