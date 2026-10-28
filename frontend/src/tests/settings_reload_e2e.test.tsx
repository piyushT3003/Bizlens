import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsPage } from "@/pages/app/SettingsPage";
import * as apiModule from "@/lib/api";
import { useSettingsStore } from "@/hooks/useSettings";

// Mock Three.js visual scenes which require WebGL
vi.mock("@/components/visuals/CrystalScene", () => ({
  CrystalScene: ({ initial, completionPct }: { initial: string; completionPct: number }) => (
    <div data-testid="mock-crystal-scene">
      <span data-testid="crystal-initial">{initial}</span>
      <span data-testid="crystal-completion">{completionPct}%</span>
    </div>
  ),
}));

vi.mock("@/components/visuals/AICore", () => ({
  AICore: () => <div data-testid="mock-ai-core">Mock AI Core</div>,
}));

vi.mock("@/components/visuals/HelixScene", () => ({
  HelixScene: () => <div data-testid="mock-helix">Mock Helix</div>,
}));

vi.mock("@/components/visuals/WorldGlowMap", () => ({
  WorldGlowMap: () => <div data-testid="mock-world-map">Mock World Map</div>,
}));

vi.mock("@/components/visuals/IsoCubeMap", () => ({
  IsoCubeMap: () => <div data-testid="mock-iso-cube">Mock Iso Cube</div>,
}));

// Mock API
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
      getApiKeyStatus: vi.fn(),
      updateApiKey: vi.fn(),
      testApiKey: vi.fn(),
      getSessions: vi.fn(),
      revokeSession: vi.fn(),
      getAuditLogs: vi.fn(),
    },
  };
});

const validSettingsData: apiModule.SettingsData = {
  profile: {
    display_name: "Piyush Toddale",
    email: "piyush@bizlens.ai",
    role: "Lead Analytics Architect",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
  },
  preferences: {
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
    gemini_consent_at: "2026-01-01T00:00:00Z",
    anomaly_threshold_pct: 15.0,
    email_digests: true,
    webhook_url: "",
  },
  key_status: {
    provider: "google_gemini",
    is_configured: true,
    source: "custom_vault",
    masked_key: "AIzaSy...****4321",
    is_valid: true,
    message: "Using encrypted user vault API key.",
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
};

describe("Settings Navigation, Reload & Scale Verification", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-motion");
    document.documentElement.removeAttribute("data-density");
    document.documentElement.style.removeProperty("--accent-intensity");
    vi.mocked(apiModule.api.getSettings).mockResolvedValue(validSettingsData);
    vi.mocked(apiModule.api.updateSettings).mockResolvedValue(validSettingsData);
    vi.mocked(apiModule.api.getSessions).mockResolvedValue([]);
    vi.mocked(apiModule.api.getAuditLogs).mockResolvedValue([]);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-motion");
    document.documentElement.removeAttribute("data-density");
    document.documentElement.style.removeProperty("--accent-intensity");
  });

  it("renders AppShell and SettingsPage with Piyush Toddale, initial 'P', and 100% scale", async () => {
    render(
      <MemoryRouter initialEntries={["/app/settings"]}>
        <Routes>
          <Route path="/app" element={<AppShell />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // 1. Settings page title
    await waitFor(() => {
      expect(screen.getByText("Platform Settings")).toBeInTheDocument();
    });

    // 2. Verify display name input shows "Piyush Toddale" (NOT Alexander)
    const displayNameInput = screen.getByLabelText(/Display Name/i) as HTMLInputElement;
    expect(displayNameInput.value).toBe("Piyush Toddale");
    expect(displayNameInput.value).not.toContain("Alexander");

    // 3. Verify Configuration Crystal initial is "P"
    const crystalInitial = screen.getByTestId("crystal-initial");
    expect(crystalInitial.textContent).toBe("P");
    expect(crystalInitial.textContent).not.toBe("A");

    // 4. Verify TopBar and Sidebar show "Piyush"
    const piyushElements = screen.getAllByText("Piyush");
    expect(piyushElements.length).toBeGreaterThanOrEqual(1);

    // 5. Verify DOM density is set cleanly without shrinking root scale
    const densityAttr = document.documentElement.getAttribute("data-density");
    expect(["comfortable", "compact"]).toContain(densityAttr);
    // Ensure documentElement has NO inline font-size shrink
    expect(document.documentElement.style.fontSize).not.toBe("13.5px");
  });

  it("automatically purges stale 'Alexander Vance' from localStorage on reload", async () => {
    // Simulate stale/polluted storage before reload
    localStorage.setItem("bizlens_display_name", "Alexander Vance");
    localStorage.setItem(
      "bizlens_settings",
      JSON.stringify({
        profile: { display_name: "Alexander Vance", email: "alexander@test.com" },
        preferences: { density: "compact" },
      })
    );

    // Re-initialize store as would happen on full browser reload
    const store = useSettingsStore.getState();
    await store.fetchSettings();

    render(
      <MemoryRouter initialEntries={["/app/settings"]}>
        <Routes>
          <Route path="/app" element={<AppShell />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Platform Settings")).toBeInTheDocument();
    });

    // Verify name has been purified to Piyush Toddale
    const displayNameInput = screen.getByLabelText(/Display Name/i) as HTMLInputElement;
    expect(displayNameInput.value).toBe("Piyush Toddale");
    expect(displayNameInput.value).not.toContain("Alexander");

    // Verify Crystal initial is "P"
    expect(screen.getByTestId("crystal-initial").textContent).toBe("P");
  });

  it("switches across all tabs smoothly without error or layout mutation", async () => {
    render(
      <MemoryRouter initialEntries={["/app/settings"]}>
        <Routes>
          <Route path="/app" element={<AppShell />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Platform Settings")).toBeInTheDocument();
    });

    // 1. Click Appearance & Theme tab
    const appearanceTab = screen.getByRole("button", { name: /Appearance & Theme/i });
    fireEvent.click(appearanceTab);
    await waitFor(() => {
      expect(screen.getByText("Theme Mode System")).toBeInTheDocument();
      expect(screen.getByText("UI Density")).toBeInTheDocument();
    });

    // 2. Click Data & Locale tab
    const dataTab = screen.getByRole("button", { name: /Data & Locale/i });
    fireEvent.click(dataTab);
    await waitFor(() => {
      expect(screen.getByText("Data & Locale Preferences")).toBeInTheDocument();
      expect(screen.getByText("Default Currency")).toBeInTheDocument();
    });

    // 3. Click AI Configuration tab
    const aiTab = screen.getByRole("button", { name: /AI Configuration/i });
    fireEvent.click(aiTab);
    await waitFor(() => {
      expect(screen.getByText("Google Gemini AI Configuration & Key Vault")).toBeInTheDocument();
    });

    // 4. Click Notifications tab (target the settings nav tab)
    const notifButtons = screen.getAllByRole("button", { name: /Notifications/i });
    const notifTab = notifButtons.find((btn) => btn.textContent?.includes("Notifications"));
    expect(notifTab).toBeDefined();
    fireEvent.click(notifTab!);
    await waitFor(() => {
      expect(screen.getByText("Notifications & Alert Triggers")).toBeInTheDocument();
    });

    // 5. Click Account & Privacy tab
    const accountTab = screen.getByRole("button", { name: /Account & Privacy/i });
    fireEvent.click(accountTab);
    await waitFor(() => {
      expect(screen.getByText("Active Authentication Sessions")).toBeInTheDocument();
    });
  });

  it("updating user display name in profile tab strictly retains INR currency, lakh_crore grouping, and full motion", async () => {
    render(
      <MemoryRouter initialEntries={["/app/settings?tab=profile"]}>
        <Routes>
          <Route path="/app" element={<AppShell />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Platform Settings")).toBeInTheDocument();
    });

    // 1. Change display name
    const displayNameInput = screen.getByLabelText(/Display Name/i) as HTMLInputElement;
    fireEvent.change(displayNameInput, { target: { value: "Piyush Tandale" } });

    // 2. Click Save Preferences
    const saveButton = screen.getByRole("button", { name: /Save Preferences/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiModule.api.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: "Piyush Tandale",
        })
      );
    });

    // Verify updateSettings was NOT called with currency: "USD" or motion_level: "reduced"
    const lastCall = vi.mocked(apiModule.api.updateSettings).mock.calls.at(-1);
    expect(lastCall?.[0]?.currency).toBeUndefined();
    expect(lastCall?.[0]?.motion_level).toBeUndefined();

    // Verify store state retains INR and full motion
    const store = useSettingsStore.getState();
    expect(store.preferences.currency).toBe("INR");
    expect(store.preferences.number_grouping).toBe("lakh_crore");
    expect(store.preferences.motion_level).toBe("full");
    expect(document.documentElement.getAttribute("data-motion")).toBe("full");
  });
});
