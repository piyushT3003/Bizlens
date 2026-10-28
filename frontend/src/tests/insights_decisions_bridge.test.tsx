import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { InsightsPage } from "@/pages/app/InsightsPage";
import { DecisionsPage } from "@/pages/app/DecisionsPage";
import { api } from "@/lib/api";

// Mock API
vi.mock("@/lib/api", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    api: {
      ...actual.api,
      getDatasets: vi.fn().mockResolvedValue([
        {
          id: "ds-retail-q3",
          name: "Sample Retail Q3",
          row_count: 11106,
          status: "ready",
        },
      ]),
      getFindings: vi.fn().mockResolvedValue({
        dataset_id: "ds-retail-q3",
        dataset_name: "Sample Retail Q3",
        version_id: "ds-retail-q3-v1",
        version_number: 1,
        total_findings: 3,
        opportunities_count: 1,
        risks_count: 1,
        efficiencies_count: 1,
        anomalies_count: 0,
        high_priority_count: 1,
        open_count: 2,
        applied_count: 1,
        total_impact_at_risk: 75000,
        total_impact_at_risk_formatted: "₹75,000",
        total_upside_potential: 115000,
        total_upside_potential_formatted: "₹1,15,000",
        findings: [
          {
            id: "f-open-1",
            version_id: "ds-retail-q3-v1",
            dataset_id: "ds-retail-q3",
            dataset_name: "Sample Retail Q3",
            title: "Dynamic Pricing Alignment",
            kind: "opportunity",
            priority: "high",
            interpretation: "Pricing elasticity indicates +₹8.2L upside opportunity.",
            potential_action: "Calibrate regional rate cards.",
            status: "open",
            status_history: [
              { status: "open", timestamp: new Date().toISOString(), user: "System", note: "Init" },
            ],
            evidence: {
              metric: "margin",
              dimension: "category",
              impact_amount: 82000,
              impact_formatted: "+₹82,000",
              impact_type: "opportunity",
              confidence_score: 0.94,
              sample_size: 11106,
              formula_name: "margin_impact",
              duckdb_sql: "SELECT category, SUM(revenue) FROM dataset GROUP BY 1",
              execution_ms: 1.2,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "f-applied-1",
            version_id: "ds-retail-q3-v1",
            dataset_id: "ds-retail-q3",
            dataset_name: "Sample Retail Q3",
            title: "Regional Surcharge Hedging",
            kind: "risk",
            priority: "medium",
            interpretation: "Logistics fuel surcharge drag.",
            potential_action: "Establish carrier contract buffers.",
            status: "applied",
            status_history: [
              { status: "applied", timestamp: new Date().toISOString(), user: "System", note: "Pinned" },
            ],
            evidence: {
              metric: "freight_cost",
              dimension: "region",
              impact_amount: 35000,
              impact_formatted: "-₹35,000",
              impact_type: "risk",
              confidence_score: 0.92,
              sample_size: 11106,
              formula_name: "freight_drag",
              duckdb_sql: "SELECT region, SUM(freight) FROM dataset GROUP BY 1",
              execution_ms: 1.5,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      }),
      pinFindingToDecisions: vi.fn().mockImplementation((id: string) => {
        return Promise.resolve({
          id,
          version_id: "ds-retail-q3-v1",
          dataset_id: "ds-retail-q3",
          dataset_name: "Sample Retail Q3",
          title: "Dynamic Pricing Alignment",
          kind: "opportunity",
          priority: "high",
          interpretation: "Pricing elasticity indicates +₹8.2L upside opportunity.",
          potential_action: "Calibrate regional rate cards.",
          status: "applied",
          status_history: [
            { status: "applied", timestamp: new Date().toISOString(), user: "User", note: "Pinned" },
          ],
          evidence: {
            metric: "margin",
            dimension: "category",
            impact_amount: 82000,
            impact_formatted: "+₹82,000",
            impact_type: "opportunity",
            confidence_score: 0.94,
            sample_size: 11106,
            formula_name: "margin_impact",
            duckdb_sql: "SELECT category, SUM(revenue) FROM dataset GROUP BY 1",
            execution_ms: 1.2,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }),
      updateFindingStatus: vi.fn().mockImplementation((id: string, newStatus: string) => {
        return Promise.resolve({
          id,
          version_id: "ds-retail-q3-v1",
          dataset_id: "ds-retail-q3",
          dataset_name: "Sample Retail Q3",
          title: "Regional Surcharge Hedging",
          kind: "risk",
          priority: "medium",
          interpretation: "Logistics fuel surcharge drag.",
          potential_action: "Establish carrier contract buffers.",
          status: newStatus,
          status_history: [
            { status: newStatus, timestamp: new Date().toISOString(), user: "User", note: "Status updated" },
          ],
          evidence: {
            metric: "freight_cost",
            dimension: "region",
            impact_amount: 35000,
            impact_formatted: "-₹35,000",
            impact_type: "risk",
            confidence_score: 0.92,
            sample_size: 11106,
            formula_name: "freight_drag",
            duckdb_sql: "SELECT region, SUM(freight) FROM dataset GROUP BY 1",
            execution_ms: 1.5,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }),
    },
  };
});

describe("Business Insights <-> Decision Support Parallel Bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Parallel Decision Support synchronization banner in InsightsPage", async () => {
    render(
      <BrowserRouter>
        <InsightsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Parallel Decision Support Synchronization")).toBeInTheDocument();
      expect(screen.getByText("DuckDB Real-Time Stream")).toBeInTheDocument();
      expect(screen.getByText(/1 Active/i)).toBeInTheDocument();
      expect(screen.getAllByText(/2 Open/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Open Decision Support →")).toBeInTheDocument();
    });
  });

  it("displays Decision Support status badges and action links on cards", async () => {
    render(
      <BrowserRouter>
        <InsightsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Applied card should show active banner
      expect(screen.getByText("Active in Decision Pipeline")).toBeInTheDocument();
      // Open card should have Send to Decisions button
      expect(screen.getByText("Send to Decisions")).toBeInTheDocument();
    });
  });

  it("promotes an open finding to Decision Pipeline when Send to Decisions is clicked", async () => {
    render(
      <BrowserRouter>
        <InsightsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Send to Decisions")).toBeInTheDocument();
    });

    const sendBtn = screen.getByText("Send to Decisions");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(api.pinFindingToDecisions).toHaveBeenCalledWith("f-open-1");
    });
  });

  it("renders DecisionsPage with real findings, stream count, and deep-link readiness", async () => {
    render(
      <BrowserRouter>
        <DecisionsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Strategic Decision Support Workspace")).toBeInTheDocument();
      expect(screen.getByText("Business Insights")).toBeInTheDocument();
      expect(screen.getByText("Total Findings Stream")).toBeInTheDocument();
      expect(screen.getByText("In Execution Pipeline")).toBeInTheDocument();
    });
  });
});
