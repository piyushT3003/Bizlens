import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ReportsPage } from "../pages/app/ReportsPage";

// Mock the API client
vi.mock("@/lib/api", () => {
  return {
    getApiUrl: (url: string) => url,
    API_BASE_URL: "",
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
      getReports: vi.fn().mockResolvedValue([
        {
          id: "report-123",
          dataset_id: "demo-dataset-id",
          dataset_name: "Sample Retail Q3",
          version_id: "v1-id",
          type: "executive_summary",
          title: "Q3 Executive Management Review",
          registry_version: "v1.0",
          status: "ready",
          has_pdf: true,
          has_csv: true,
          created_at: new Date().toISOString(),
        },
      ]),
      getReport: vi.fn().mockResolvedValue({
        id: "report-123",
        dataset_id: "demo-dataset-id",
        dataset_name: "Sample Retail Q3",
        version_id: "v1-id",
        type: "executive_summary",
        title: "Q3 Executive Management Review",
        registry_version: "v1.0",
        status: "ready",
        has_pdf: true,
        has_csv: true,
        created_at: new Date().toISOString(),
        facts_snapshot: {
          version_number: 1,
          content_hash: "eed550f8abcdef1234",
          metrics: {
            total_revenue: {
              label: "Total Revenue",
              formatted_value: "₹9.89 Cr",
              unit: "currency",
              status: "positive",
            },
            total_orders: {
              label: "Total Orders",
              formatted_value: "10,000",
              unit: "count",
              status: "positive",
            },
          },
          breakdown: [
            {
              dimension_value: "Electronics",
              revenue: 3500000,
              share_pct: 35.4,
              rank: 1,
            },
          ],
          narrative_blocks: [
            {
              tag: "CALCULATED FACT",
              content: "Total verified Revenue reached ₹9.89 Cr across 10,000 certified orders.",
              fact_ids: ["total_revenue"],
            },
          ],
        },
        filters: {},
        pdf_download_url: "/api/v1/reports/report-123/download/pdf",
        csv_download_url: "/api/v1/reports/report-123/download/csv",
      }),
      generateReport: vi.fn(),
      deleteReport: vi.fn(),
      regenerateReport: vi.fn(),
      refreshReport: vi.fn(),
      getDatasetPeriods: vi.fn().mockResolvedValue({
        dataset_id: "demo-dataset-id",
        dataset_name: "Sample Retail Q3",
        version_id: "v1-id",
        version_number: 1,
        has_date_column: true,
        date_column: "order_date",
        min_date: "2024-07-01",
        max_date: "2024-09-30",
        fiscal_year_start_month: 4,
        fiscal_year_label: "April - March (India FY)",
        available_months: [
          { key: "2024-07", label: "July 2024", start: "2024-07-01", end: "2024-07-31" },
        ],
        available_quarters: [
          { key: "2024_Q2", label: "FY2024-25 Q2 (Jul - Sep 2024)", start: "2024-07-01", end: "2024-09-30" },
        ],
        available_categories: ["Electronics", "Fashion"],
        available_regions: ["North", "South"],
        capabilities: {
          executive_summary: { available: true },
          kpis: { available: true },
          charts: { available: true },
          insights: { available: true },
          recommendations: { available: true },
          risks: { available: true },
          trends: { available: true },
          supporting_analysis: { available: true },
        },
      }),
      getReportPdfUrl: vi.fn((id: string) => `/api/v1/reports/${id}/download/pdf`),
      getReportCsvUrl: vi.fn((id: string) => `/api/v1/reports/${id}/download/csv`),
    },
  };
});

describe("ReportsPage Component", () => {
  it("renders Management Reports header and configuration options", async () => {
    render(<ReportsPage />);

    expect(screen.getByText("Audit & Governance")).toBeInTheDocument();
    expect(screen.getByText("Executive Management Reports")).toBeInTheDocument();
    expect(screen.getAllByText("Executive Summary")[0]).toBeInTheDocument();
    expect(screen.getByText("Financial Performance")).toBeInTheDocument();
    expect(screen.getByText("Category Breakdown")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/Sample Retail Q3/i)[0]).toBeInTheDocument();
    });
  });

  it("renders live snapshot preview with verified facts when report is loaded", async () => {
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Q3 Executive Management Review")[0]).toBeInTheDocument();
      expect(screen.getByText("₹9.89 Cr")).toBeInTheDocument();
      expect(screen.getByText("10,000")).toBeInTheDocument();
      expect(screen.getAllByText("Electronics")[0]).toBeInTheDocument();
      expect(screen.getByText(/Total verified Revenue reached ₹9.89 Cr/i)).toBeInTheDocument();
    });
  });

  it("provides PDF and CSV download triggers", async () => {
    render(<ReportsPage />);

    await waitFor(() => {
      const pdfBtn = screen.getByRole("button", { name: /^pdf$/i });
      const csvBtn = screen.getByRole("button", { name: /^csv$/i });
      expect(pdfBtn).toBeInTheDocument();
      expect(csvBtn).toBeInTheDocument();
    });
  });

  it("filters snapshot archive by active dataset and toggles all datasets", async () => {
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Active Dataset/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /All Datasets/i })).toBeInTheDocument();
    });
  });
});
