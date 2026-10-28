import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { InsightsPage } from "../pages/app/InsightsPage";

// Mock the API client
vi.mock("@/lib/api", () => {
  return {
    api: {
      getDatasets: vi.fn().mockResolvedValue([
        {
          id: "demo-dataset-id",
          name: "Sample Retail Q3",
          row_count: 10000,
          quality_score: 1.0,
          active_version_id: "v1-id",
        },
      ]),
      getFindings: vi.fn().mockResolvedValue({
        dataset_id: "demo-dataset-id",
        dataset_name: "Sample Retail Q3",
        version_id: "v1-id",
        version_number: 1,
        total_findings: 3,
        opportunities_count: 1,
        risks_count: 1,
        efficiencies_count: 0,
        anomalies_count: 1,
        high_priority_count: 1,
        open_count: 2,
        applied_count: 1,
        total_impact_at_risk: 44100000.0,
        total_impact_at_risk_formatted: "₹4.41 Cr at Risk",
        total_upside_potential: 596000.0,
        total_upside_potential_formatted: "+₹5.96 L Upside",
        findings: [
          {
            id: "f-1",
            version_id: "v1-id",
            dataset_id: "demo-dataset-id",
            dataset_name: "Sample Retail Q3",
            title: "Category Concentration Risk: Electronics (44.6%)",
            kind: "risk",
            priority: "high",
            evidence: {
              metric: "Category Revenue Share",
              dimension: "Category",
              segment_value: "Electronics",
              baseline_value: 24728203.6,
              observed_value: 44100000.0,
              delta_pct: 44.6,
              impact_amount: 44100000.0,
              impact_formatted: "₹4.41 Cr at Risk",
              impact_type: "risk",
              confidence_score: 0.98,
              sample_size: 4460,
              formula_name: "Revenue Concentration Ratio",
              duckdb_sql: "SELECT category, SUM(revenue) FROM ds GROUP BY category",
              execution_ms: 1.45,
            },
            interpretation: "Single category Electronics accounts for ₹4.41 Cr (44.6% of total catalog revenue).",
            potential_action: "Establish inventory buffer policies for Electronics while cross-selling secondary categories.",
            status: "open",
            status_history: [
              {
                status: "open",
                timestamp: "2026-10-04T00:00:00Z",
                note: "Automatically discovered by BizLens Analytics Engine",
              },
            ],
            created_at: "2026-10-04T00:00:00Z",
            updated_at: "2026-10-04T00:00:00Z",
          },
          {
            id: "f-2",
            version_id: "v1-id",
            dataset_id: "demo-dataset-id",
            dataset_name: "Sample Retail Q3",
            title: "High-Margin Expansion Opportunity: Beauty (70.2% Margin)",
            kind: "opportunity",
            priority: "medium",
            evidence: {
              metric: "Segment Gross Margin",
              dimension: "Category",
              segment_value: "Beauty",
              baseline_value: 44.0,
              observed_value: 70.2,
              delta_pct: 26.2,
              impact_amount: 596000.0,
              impact_formatted: "+₹5.96 L Upside",
              impact_type: "upside",
              confidence_score: 0.94,
              sample_size: 1200,
              formula_name: "Segment Profitability Index",
              duckdb_sql: "SELECT category, margin_pct FROM ds GROUP BY category",
              execution_ms: 1.2,
            },
            interpretation: "Category Beauty generates exceptional gross margin of 70.2%.",
            potential_action: "Allocate marketing budget and featured checkout placement to Beauty.",
            status: "applied",
            status_history: [
              {
                status: "applied",
                timestamp: "2026-10-04T00:00:00Z",
                note: "Pinned to Decision Support workspace",
              },
            ],
            created_at: "2026-10-04T00:00:00Z",
            updated_at: "2026-10-04T00:00:00Z",
          },
          {
            id: "f-3",
            version_id: "v1-id",
            dataset_id: "demo-dataset-id",
            dataset_name: "Sample Retail Q3",
            title: "Volume Spike Outlier: 2024-07-02 (+43% vs. Median)",
            kind: "anomaly",
            priority: "medium",
            evidence: {
              metric: "Daily Revenue Outlier",
              dimension: "Date",
              segment_value: "2024-07-02",
              baseline_value: 120000.0,
              observed_value: 171600.0,
              delta_pct: 43.0,
              impact_amount: 51600.0,
              impact_formatted: "+₹51.6 K Anomaly Spike",
              impact_type: "anomaly",
              confidence_score: 0.96,
              sample_size: 180,
              formula_name: "Tukey IQR Anomaly Detection",
              duckdb_sql: "SELECT date, SUM(revenue) FROM ds GROUP BY date",
              execution_ms: 1.1,
            },
            interpretation: "On 2024-07-02, revenue surged to ₹1.71 L across 180 transactions.",
            potential_action: "Audit promotions active on 2024-07-02 to replicate growth.",
            status: "open",
            status_history: [],
            created_at: "2026-10-04T00:00:00Z",
            updated_at: "2026-10-04T00:00:00Z",
          },
        ],
      }),
      updateFindingStatus: vi.fn().mockImplementation((id, status) =>
        Promise.resolve({
          id,
          status,
          status_history: [{ status, timestamp: new Date().toISOString() }],
        })
      ),
      pinFindingToDecisions: vi.fn().mockImplementation((id) =>
        Promise.resolve({
          id,
          status: "applied",
          status_history: [{ status: "applied", note: "Pinned to Decisions" }],
        })
      ),
      explainFinding: vi.fn().mockResolvedValue({
        finding_id: "f-1",
        title: "Category Concentration Risk: Electronics (44.6%)",
        kind: "risk",
        explanation: "Strategic context explanation",
        strategic_context: "Electronics drives 44.6% of revenue exposing the firm to inventory shocks.",
        risk_assessment: "Financial impact evaluated at ₹4.41 Cr at Risk with 98% statistical confidence.",
        action_steps: [
          "Establish inventory buffers for Electronics.",
          "Cross-sell Beauty lines.",
          "Track weekly in Decision Support.",
        ],
        verified_facts: ["Fact summary"],
        guardrail_result: "passed",
        model_used: "Deterministic Local Engine",
        latency_ms: 12.5,
      }),
    },
  };
});

describe("InsightsPage Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page header, title, and RULES.md certified badge", async () => {
    render(
      <BrowserRouter>
        <InsightsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Strategic Intelligence/i)).toBeDefined();
    expect(screen.getByText("Business Insights")).toBeDefined();
    expect(screen.getByText(/RULES\.md Certified/)).toBeDefined();
  });

  it("renders executive briefing hero cards with quantified impact and confidence", async () => {
    render(
      <BrowserRouter>
        <InsightsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Active Discoveries")).toBeDefined();
      expect(screen.getByText("Quantified Risk Exposure")).toBeDefined();
      expect(screen.getByText("Growth & Upside Potential")).toBeDefined();
      expect(screen.getByText("Statistical Confidence")).toBeDefined();
    });

    expect(screen.getAllByText("₹4.41 Cr at Risk").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+₹5.96 L Upside").length).toBeGreaterThan(0);
  });

  it("renders finding cards with archetype badges, titles, and fact badges", async () => {
    render(
      <BrowserRouter>
        <InsightsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Category Concentration Risk: Electronics (44.6%)")).toBeDefined();
      expect(screen.getByText("High-Margin Expansion Opportunity: Beauty (70.2% Margin)")).toBeDefined();
      expect(screen.getByText("Volume Spike Outlier: 2024-07-02 (+43% vs. Median)")).toBeDefined();
    });

    expect(screen.getByText("Concentration Risk")).toBeDefined();
    expect(screen.getByText("Strategic Opportunity")).toBeDefined();
    expect(screen.getByText("Statistical Anomaly")).toBeDefined();
  });

  it("filters findings when clicking archetype chips", async () => {
    render(
      <BrowserRouter>
        <InsightsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Category Concentration Risk: Electronics (44.6%)")).toBeDefined();
    });

    // Click 'Opportunities (1)' tab
    const oppTab = screen.getByText("Opportunities (1)");
    fireEvent.click(oppTab);

    // Only the opportunity card should be visible
    expect(screen.getByText("High-Margin Expansion Opportunity: Beauty (70.2% Margin)")).toBeDefined();
    expect(screen.queryByText("Category Concentration Risk: Electronics (44.6%)")).toBeNull();
  });

  it("triggers AI explain modal when 'Explain with AI' is clicked", async () => {
    render(
      <BrowserRouter>
        <InsightsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Explain with AI").length).toBeGreaterThan(0);
    });

    const explainBtn = screen.getAllByText("Explain with AI")[0];
    fireEvent.click(explainBtn);

    await waitFor(() => {
      expect(screen.getByText("BizLens AI Strategic Advisor")).toBeDefined();
      expect(screen.getByText("Strategic Context")).toBeDefined();
      expect(screen.getByText("Risk & Opportunity Sizing")).toBeDefined();
    });
  });

  it("opens Executive Hero Visual Summary modals when clicking hero metric cards", async () => {
    render(
      <BrowserRouter>
        <InsightsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Active Discoveries")).toBeDefined();
      expect(screen.getByText("Quantified Risk Exposure")).toBeDefined();
      expect(screen.getByText("Growth & Upside Potential")).toBeDefined();
      expect(screen.getByText("Statistical Confidence")).toBeDefined();
    });

    // 1. Click 'Quantified Risk Exposure' card
    const riskHeroCard = screen.getByText("Quantified Risk Exposure");
    fireEvent.click(riskHeroCard);

    await waitFor(() => {
      expect(screen.getByText("Quantified Risk & Capital Protection Audit")).toBeDefined();
      expect(screen.getByText("Capital & Margin Risk Exposure")).toBeDefined();
      expect(screen.getByText("Filter Board to Risks (1)")).toBeDefined();
    });

    // Close modal
    const closeBtn = screen.getAllByRole("button").find(b => b.querySelector("svg.lucide-x"));
    if (closeBtn) fireEvent.click(closeBtn);

    // 2. Click 'Growth & Upside Potential' card
    const upsideHeroCard = screen.getByText("Growth & Upside Potential");
    fireEvent.click(upsideHeroCard);

    await waitFor(() => {
      expect(screen.getByText("Growth & Upside Expansion Roadmap")).toBeDefined();
      expect(screen.getByText("High-Margin Expansion & Profit Engines")).toBeDefined();
      expect(screen.getByText("Filter Board to Opportunities (1)")).toBeDefined();
    });
  });
});
