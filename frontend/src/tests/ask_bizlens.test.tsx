import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AskPage } from "@/pages/app/AskPage";
import { api } from "@/lib/api";

// Mock API
vi.mock("@/lib/api", () => ({
  getApiUrl: (url: string) => url,
  API_BASE_URL: "",
  api: {
    getDatasets: vi.fn().mockResolvedValue([
      {
        id: "ds_test_1",
        name: "Retail Q3 Demo",
        row_count: 5000,
        column_count: 8,
        status: "ready",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]),
    getAIConsent: vi.fn().mockResolvedValue({ consented: true, consent_at: new Date().toISOString() }),
    grantAIConsent: vi.fn().mockResolvedValue({ consented: true, consent_at: new Date().toISOString() }),
    getChatSessions: vi.fn().mockResolvedValue([
      {
        id: "sess_1",
        title: "Q3 Profitability Review",
        context_type: "current_dataset",
        dataset_ref: "ds_test_1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages_count: 2,
      },
    ]),
    getChatSession: vi.fn().mockResolvedValue({
      id: "sess_1",
      title: "Q3 Profitability Review",
      context_type: "current_dataset",
      dataset_ref: "ds_test_1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages_count: 2,
      messages: [
        {
          id: "m1",
          session_id: "sess_1",
          role: "user",
          blocks: [{ tag: "USER_QUERY", content: "Summarize revenue and margins", fact_ids: [] }],
          evidence_refs: [],
          created_at: new Date().toISOString(),
        },
        {
          id: "m2",
          session_id: "sess_1",
          role: "assistant",
          blocks: [
            {
              tag: "CALCULATED FACT",
              content: "• Total Revenue: ₹9.89 Cr\n• Gross Margin: 44.0%",
              fact_ids: ["total_revenue", "gross_margin_pct"],
            },
            {
              tag: "INTERPRETATION",
              content: "Profitability is healthy across Q3.",
              fact_ids: ["total_revenue"],
            },
            {
              tag: "RECOMMENDATION",
              content: "• Consider maintaining inventory buffer for key items.",
              fact_ids: [],
            },
          ],
          evidence_refs: ["total_revenue", "gross_margin_pct"],
          show_your_work: {
            fact_set: [
              { id: "total_revenue", label: "Total Revenue", formatted_value: "₹9.89 Cr", value: 98900000 },
            ],
            engine_query_ms: 3.2,
            guardrail_result: { passed: true, total_extracted: 2, violations: [] },
            model_used: "Deterministic Engine",
            context_mode: "current_dataset",
            pii_detected: false,
          },
          created_at: new Date().toISOString(),
        },
      ],
    }),
    getSuggestedPrompts: vi.fn().mockResolvedValue([
      { id: "sp_1", prompt: "Summarize our overall revenue and profitability performance.", category: "Performance" },
      { id: "sp_2", prompt: "What were our top-performing product categories by revenue?", category: "Breakdown" },
    ]),
    createChatSession: vi.fn().mockResolvedValue({
      id: "sess_2",
      title: "New Analysis",
      context_type: "current_dataset",
      messages_count: 0,
      messages: [],
    }),
    renameChatSession: vi.fn().mockResolvedValue({ id: "sess_1", title: "Renamed Session" }),
    deleteChatSession: vi.fn().mockResolvedValue({ message: "Deleted" }),
    askBizLens: vi.fn().mockResolvedValue({
      id: "m3",
      session_id: "sess_1",
      role: "assistant",
      blocks: [
        { tag: "CALCULATED FACT", content: "• Total Orders: 10,000", fact_ids: [] },
      ],
      evidence_refs: [],
      created_at: new Date().toISOString(),
    }),
  },
}));

describe("Ask BizLens Verification (Phase 7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Chat with BizLens header, context switcher, and conversation sidebar", async () => {
    render(
      <BrowserRouter>
        <AskPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Chat with BizLens")).toBeInTheDocument();
    expect(screen.getByText("Current Dataset")).toBeInTheDocument();
    expect(screen.getByText("General AI")).toBeInTheDocument();
    expect(screen.getByText("Conversations")).toBeInTheDocument();
    expect(screen.getByText("Get Smarter with AI")).toBeInTheDocument();
  });

  it("renders conversation history and tagged blocks in assistant bubble", async () => {
    render(
      <BrowserRouter>
        <AskPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Q3 Profitability Review")).toBeInTheDocument();
      expect(screen.getByText("Summarize revenue and margins")).toBeInTheDocument();
      expect(screen.getByText(/Total Revenue: ₹9.89 Cr/)).toBeInTheDocument();
      expect(screen.getByText(/Profitability is healthy across Q3/)).toBeInTheDocument();
      expect(screen.getByText(/Consider maintaining inventory buffer/)).toBeInTheDocument();
    });
  });

  it("renders Show Your Work Lineage with engine execution ms and DuckDB fact", async () => {
    render(
      <BrowserRouter>
        <AskPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Show Your Work Lineage")).toBeInTheDocument();
      expect(screen.getByText("(3.2ms)")).toBeInTheDocument();
      expect(screen.getByText("View Evidence")).toBeInTheDocument();
    });
  });

  it("allows switching context mode between Current Dataset and General AI", async () => {
    render(
      <BrowserRouter>
        <AskPage />
      </BrowserRouter>
    );

    const generalBtn = screen.getByRole("button", { name: /General AI/i });
    fireEvent.click(generalBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask any strategic business or analytics question/i)).toBeInTheDocument();
    });
  });

  it("renders ThinkingCard with elapsed thought duration and expandable thought process", async () => {
    render(
      <BrowserRouter>
        <AskPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Thought for/i)).toBeInTheDocument();
      expect(screen.getByText(/View thought process/i)).toBeInTheDocument();
    });

    const viewThoughtBtn = screen.getByText(/View thought process/i);
    fireEvent.click(viewThoughtBtn);

    await waitFor(() => {
      expect(screen.getByText(/Guardrail:/i)).toBeInTheDocument();
      expect(screen.getByText(/Latency:/i)).toBeInTheDocument();
    });
  });

  it("renders casual/general conversational responses cleanly without forced fact boxes", async () => {
    const mockCasualSession = {
      id: "sess_casual",
      title: "Casual Discussion",
      context_type: "general",
      dataset_ref: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages_count: 2,
      messages: [
        {
          id: "m_user_casual",
          session_id: "sess_casual",
          role: "user",
          blocks: [{ tag: "USER_QUERY", content: "Hello! Who are you?", fact_ids: [] }],
          evidence_refs: [],
          created_at: new Date().toISOString(),
        },
        {
          id: "m_asst_casual",
          session_id: "sess_casual",
          role: "assistant",
          blocks: [
            {
              tag: "INTERPRETATION",
              content: "Hello! I am BizLens AI, powered by Google Gemini and deterministic DuckDB engines.",
              fact_ids: [],
            },
          ],
          evidence_refs: [],
          show_your_work: {
            fact_set: [],
            engine_query_ms: 0.0,
            guardrail_result: { passed: true, total_extracted: 0, violations: [] },
            model_used: "Google Gemini 3.5 Flash",
            context_mode: "general",
            pii_detected: false,
          },
          created_at: new Date().toISOString(),
        },
      ],
    };

    (api.getChatSession as any).mockResolvedValueOnce(mockCasualSession);

    render(
      <BrowserRouter>
        <AskPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Hello! I am BizLens AI/i)).toBeInTheDocument();
      // Should not contain [CALCULATED FACT] since there are no dataset facts
      expect(screen.queryByText(/\[CALCULATED FACT\]/i)).not.toBeInTheDocument();
    });
  });
});
