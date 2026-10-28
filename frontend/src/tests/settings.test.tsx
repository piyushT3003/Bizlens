import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsPage } from "@/pages/app/SettingsPage";
import * as apiModule from "@/lib/api";

// Mock API module
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

const mockSettingsData: apiModule.SettingsData = {
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
  completion_percentage: 92,
  facets: {
    profile: true,
    appearance: true,
    data_locale: true,
    ai_vault: true,
    notifications: true,
    security: true,
  },
};

const mockSessions: apiModule.SessionData[] = [
  {
    id: "sess-1",
    user_agent: "Chrome / macOS (Active)",
    ip: "127.0.0.1",
    created_at: "2026-10-04T00:00:00Z",
    is_current: true,
  },
  {
    id: "sess-2",
    user_agent: "Mobile Safari / iOS",
    ip: "192.168.1.10",
    created_at: "2026-10-03T18:00:00Z",
    is_current: false,
  },
];

const mockAuditLogs: apiModule.AuditLogData[] = [
  {
    id: "audit-1",
    action: "update_settings",
    resource_type: "user_settings",
    ip: "127.0.0.1",
    created_at: "2026-10-04T02:00:00Z",
    metadata: { updated_fields: ["currency", "theme"] },
  },
  {
    id: "audit-2",
    action: "session_authenticated",
    resource_type: "auth",
    ip: "127.0.0.1",
    created_at: "2026-10-04T01:00:00Z",
    metadata: { status: "success" },
  },
];

describe("SettingsPage Component (Panels 9 & 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiModule.api.getSettings).mockResolvedValue(mockSettingsData);
    vi.mocked(apiModule.api.updateSettings).mockResolvedValue({
      ...mockSettingsData,
      preferences: { ...mockSettingsData.preferences, currency: "USD" },
    });
    vi.mocked(apiModule.api.getApiKeyStatus).mockResolvedValue(mockSettingsData.key_status);
    vi.mocked(apiModule.api.testApiKey).mockResolvedValue({
      is_valid: true,
      message: "Google Gemini API key verified successfully.",
      model: "gemini-2.5-flash",
    });
    vi.mocked(apiModule.api.updateApiKey).mockResolvedValue(mockSettingsData.key_status);
    vi.mocked(apiModule.api.getSessions).mockResolvedValue(mockSessions);
    vi.mocked(apiModule.api.revokeSession).mockResolvedValue({ revoked: true, session_id: "sess-2" });
    vi.mocked(apiModule.api.getAuditLogs).mockResolvedValue(mockAuditLogs);
  });

  it("renders page header and Configuration Crystal with completion percentage", async () => {
    render(
      <MemoryRouter initialEntries={["/app/settings"]}>
        <SettingsPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Platform Settings")).toBeInTheDocument();
    expect(screen.getByText("PANEL 9: CONFIGURATION CRYSTAL")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("92% Complete")).toBeInTheDocument();
    });

    expect(screen.getByText("Zero Plaintext Exposure (ADR-005)")).toBeInTheDocument();
  });

  it("updates user profile name and calls updateSettings", async () => {
    render(
      <MemoryRouter initialEntries={["/app/settings?tab=profile"]}>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Piyush Toddale")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("Piyush Toddale");
    fireEvent.change(nameInput, { target: { value: "Piyush T." } });
    expect(screen.getByDisplayValue("Piyush T.")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /save preferences/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiModule.api.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: "Piyush T.",
        })
      );
    });
  });

  it("switches to Data & Locale tab and changes currency", async () => {
    render(
      <MemoryRouter initialEntries={["/app/settings?tab=data"]}>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Data & Locale Preferences")).toBeInTheDocument();
    });

    const currencySelect = screen.getByDisplayValue(/INR \(₹ Indian Rupee\)/i);
    expect(currencySelect).toBeInTheDocument();

    fireEvent.change(currencySelect, { target: { value: "USD" } });

    const saveBtn = screen.getByRole("button", { name: /save preferences/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiModule.api.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: "USD",
        })
      );
    });
  });

  it("renders AI tab with RULES.md contract and key vault controls", async () => {
    render(
      <MemoryRouter initialEntries={["/app/settings?tab=ai"]}>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Google Gemini AI Configuration & Key Vault")).toBeInTheDocument();
    });

    expect(screen.getByText(/RULES\.md Non-Negotiable Contract/i)).toBeInTheDocument();
    expect(screen.getByText("AIzaSy...****4321")).toBeInTheDocument();

    // Open vault modal
    const configureBtn = screen.getByRole("button", { name: /replace custom key/i });
    fireEvent.click(configureBtn);

    expect(screen.getByText("Configure Gemini API Key")).toBeInTheDocument();

    const keyInput = screen.getByPlaceholderText("AIzaSy...");
    fireEvent.change(keyInput, { target: { value: "AIzaSyNewValidKey12345678" } });

    const testBtn = screen.getByRole("button", { name: /test key syntax/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(apiModule.api.testApiKey).toHaveBeenCalledWith("AIzaSyNewValidKey12345678");
      expect(screen.getByText(/Google Gemini API key verified successfully/i)).toBeInTheDocument();
    });
  });

  it("renders Account tab with active sessions and audit logs", async () => {
    render(
      <MemoryRouter initialEntries={["/app/settings?tab=account"]}>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Active Authentication Sessions")).toBeInTheDocument();
    });

    expect(screen.getByText("Chrome / macOS (Active)")).toBeInTheDocument();
    expect(screen.getByText("Mobile Safari / iOS")).toBeInTheDocument();
    expect(screen.getByText("Security & Changes Audit Trail")).toBeInTheDocument();
    expect(screen.getByText("update_settings")).toBeInTheDocument();

    // Revoke non-current session
    const revokeBtn = screen.getByRole("button", { name: /revoke/i });
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(apiModule.api.revokeSession).toHaveBeenCalledWith("sess-2");
    });
  });
});
