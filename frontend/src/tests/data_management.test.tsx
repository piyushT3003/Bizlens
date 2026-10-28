import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { DataManagementPage } from "../pages/app/DataManagementPage";

// Mock the API client
vi.mock("@/lib/api", () => {
  return {
    api: {
      getDatasets: vi.fn().mockResolvedValue([
        {
          id: "demo-dataset-id",
          name: "Sample Retail Q3",
          row_count: 10000,
          col_count: 14,
          quality_score: 98.5,
          active_version_id: "v1-id",
          status: "ready",
          source_filename_sanitized: "sample_retail_q3.csv",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          versions: [
            {
              id: "v1-id",
              version_number: 1,
              row_count: 10000,
              col_count: 14,
              content_hash: "eed550f8abcdef1234",
              quality_score: 98.5,
              lock_version: 1,
              label: "Initial Ingestion",
              created_at: new Date().toISOString(),
            },
          ],
          active_mapping: {
            revenue: {
              original_name: "Revenue",
              role: "revenue",
              data_type: "DOUBLE",
              confidence: 1.0,
              confirmed: true,
            },
          },
        },
      ]),
      getDataset: vi.fn().mockResolvedValue({
        id: "demo-dataset-id",
        name: "Sample Retail Q3",
        row_count: 10000,
        col_count: 14,
        quality_score: 98.5,
        active_version_id: "v1-id",
        status: "ready",
        source_filename_sanitized: "sample_retail_q3.csv",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        versions: [
          {
            id: "v1-id",
            version_number: 1,
            row_count: 10000,
            col_count: 14,
            content_hash: "eed550f8abcdef1234",
            quality_score: 98.5,
            lock_version: 1,
            label: "Initial Ingestion",
            created_at: new Date().toISOString(),
          },
        ],
        active_mapping: {
          revenue: {
            original_name: "Revenue",
            role: "revenue",
            data_type: "DOUBLE",
            confidence: 1.0,
            confirmed: true,
          },
        },
      }),
      getQualityReport: vi.fn().mockResolvedValue({
        score: 98.5,
        components: {
          completeness: 100.0,
          consistency: 98.0,
          validity: 98.0,
          uniqueness: 98.0,
          anomaly_freedom: 100.0,
        },
        issues: [
          {
            column: "city",
            severity: "warning",
            code: "UNTRIMMED_WHITESPACE",
            message: "Column 'city' has 4 values with whitespace.",
          },
        ],
        formula_version: "v1.0",
      }),
      getTransformationHistory: vi.fn().mockResolvedValue([
        {
          id: "trans-1",
          dataset_id: "demo-dataset-id",
          from_version_id: "v1-id",
          to_version_id: "v2-id",
          type: "deduplicate_rows",
          parameters: {},
          rows_affected: 24,
          before_stats: { row_count: 10024 },
          after_stats: { row_count: 10000 },
          status: "applied",
          created_at: new Date().toISOString(),
        },
      ]),
      getDatasetPreview: vi.fn().mockResolvedValue({
        dataset_id: "demo-dataset-id",
        version_number: 1,
        total_rows: 10000,
        columns: ["order_id", "date", "revenue"],
        rows: [
          { order_id: "ORD-001", date: "2024-07-01", revenue: 4500.0 },
          { order_id: "ORD-002", date: "2024-07-02", revenue: 12000.0 },
        ],
      }),
      getQualityCopilotAdvice: vi.fn().mockResolvedValue({
        blocks: [
          {
            tag: "CALCULATED FACT",
            content: "Quality Score is 98.5%. Found 1 whitespace issue.",
            fact_ids: ["quality_score"],
          },
          {
            tag: "INTERPRETATION",
            content: "Whitespace drift may fragment city grouping in analytics.",
            fact_ids: ["quality_score"],
          },
          {
            tag: "RECOMMENDATION",
            content: "Apply trim_strings transformation on 'city'.",
            fact_ids: [],
          },
        ],
        suggested_actions: [
          {
            type: "trim_strings",
            title: "Trim Whitespace in 'city'",
            description: "Strip leading/trailing spaces.",
            parameters: { columns: ["city"] },
          },
        ],
        quality_score: 98.5,
        components: {
          completeness: 100.0,
          consistency: 98.0,
          validity: 98.0,
          uniqueness: 98.0,
          anomaly_freedom: 100.0,
        },
        guardrail_result: { passed: true, total_extracted: 1, violations: [] },
      }),
    },
  };
});

describe("Data Management Page Verification (Phase 6)", () => {
  it("renders Data Management header, action buttons, and navigation tabs", async () => {
    render(
      <BrowserRouter>
        <DataManagementPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Data Management")).toBeDefined();
    expect(screen.getByText("Clean Data")).toBeDefined();
    expect(screen.getByText("Ask Copilot")).toBeDefined();
    expect(screen.getByText("Quality Scorecard")).toBeDefined();
    expect(screen.getByText("Overview & Preview")).toBeDefined();
    expect(screen.getByText("Semantic Mapping")).toBeDefined();
    expect(screen.getByText("Version Lineage")).toBeDefined();
  });

  it("displays Quality Scorecard with 4 component metrics and detected issues", async () => {
    render(
      <BrowserRouter>
        <DataManagementPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Overall Health Score")).toBeDefined();
      expect(screen.getByText("Completeness")).toBeDefined();
      expect(screen.getByText("Validity")).toBeDefined();
      expect(screen.getByText("Uniqueness")).toBeDefined();
      expect(screen.getByText("Consistency")).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.getByText("UNTRIMMED_WHITESPACE")).toBeDefined();
    });
  });

  it("opens Clean Data modal with transformation selection when clicked", async () => {
    render(
      <BrowserRouter>
        <DataManagementPage />
      </BrowserRouter>
    );

    const cleanBtn = screen.getByText("Clean Data");
    fireEvent.click(cleanBtn);

    await waitFor(() => {
      expect(screen.getByText("Deterministic Cleaning Transformation")).toBeDefined();
      expect(screen.getByText("Preview Diff")).toBeDefined();
      expect(screen.getByText("Apply Transformation")).toBeDefined();
    });
  });

  it("switches to Version Lineage tab and displays version snapshot information", async () => {
    render(
      <BrowserRouter>
        <DataManagementPage />
      </BrowserRouter>
    );

    const versionsTab = screen.getByText("Version Lineage");
    fireEvent.click(versionsTab);

    await waitFor(() => {
      expect(screen.getByText("Immutable Version Lineage Tree")).toBeDefined();
      expect(screen.getByText(/Optimistic Locking Enforced/)).toBeDefined();
    });
  });
});
