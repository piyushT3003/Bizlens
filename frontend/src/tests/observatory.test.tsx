import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { DashboardPage } from "@/pages/app/DashboardPage";
import * as apiModule from "@/lib/api";

// Mock API module
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      getForecastObservatory: vi.fn(),
    },
  };
});

// Mock Analytics and Dataset hooks
vi.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => ({
    metrics: {
      total_revenue: {
        metric_id: "total_revenue",
        label: "Total Revenue",
        value: 12480000,
        formatted_value: "₹1.25 Cr",
        unit: "INR",
        direction: "up",
        delta_pct: 12.4,
        status: "positive",
        formula_sql: "SUM(sales)",
      },
    },
    breakdown: [
      { dimension_value: "Electronics", metrics: { total_revenue: 6000000 }, share_pct: 48.0, rank: 1 },
      { dimension_value: "Apparel", metrics: { total_revenue: 3500000 }, share_pct: 28.0, rank: 2 },
    ],
    lineage: {
      dataset_id: "test-ds-1",
      version_number: 1,
      content_hash: "eed550f8",
      total_rows_scanned: 10000,
      rows_after_filters: 10000,
      execution_time_ms: 3.8,
      filters_applied: {},
      formula_registry_version: "v1.0",
    },
    selectedCategory: null,
    setSelectedCategory: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useDataset", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useDataset")>();
  return {
    ...actual,
    useDatasetStore: () => ({
      ...actual.useDatasetStore(),
      activeDataset: {
        id: "test-ds-1",
        name: "Sample Retail Q3",
        active_version_id: "v-1",
      },
      activePreset: actual.PRESET_DATASETS[0],
      setActivePreset: vi.fn(),
    }),
  };
});

const mockObservatoryData: apiModule.ForecastObservatoryData = {
  dataset_id: "test-ds-1",
  status: "available",
  history_periods_count: 14,
  min_required_periods: 12,
  metrics: {
    accuracy_pct: 94.8,
    baseline_beat_pct: 18.4,
    coverage_pct: 95.0,
    test_periods_count: 3,
    smape: 5.2,
    mae_model: 1.1,
    mae_baseline: 1.34,
  },
  held_out_table: [
    { period_label: "2024-W36", actual_value: 1248000, predicted_value: 1210000, error_pct: 3.0, within_interval: true },
    { period_label: "2024-W37", actual_value: 1310000, predicted_value: 1285000, error_pct: 1.9, within_interval: true },
    { period_label: "2024-W38", actual_value: 1420000, predicted_value: 1390000, error_pct: 2.1, within_interval: true },
  ],
  forecast_series: [
    { period_label: "2024-W35", actual_value: 1180000, is_projected: false },
    { period_label: "+1 Wk", projected_value: 1450000, lower_bound_95: 1380000, upper_bound_95: 1520000, is_projected: true },
  ],
  contribution_breakdown: [
    { dimension_value: "Electronics", prior_value: 850000, current_value: 1120000, delta_abs: 270000, delta_formatted: "+₹2.70 L", share_pct: 48.2, rank: 1 },
    { dimension_value: "Apparel", prior_value: 620000, current_value: 760000, delta_abs: 140000, delta_formatted: "+₹1.40 L", share_pct: 25.0, rank: 2 },
  ],
  contribution_dimension: "category",
  scenario_flow: [
    { node_id: "d1", type: "driver", title: "Price +10%", delta_formatted: "+10.0% Price", elasticity: -0.8, detail: "Premium catalog" },
    { node_id: "m1", type: "metric", title: "Volume Response", delta_formatted: "-8.0% Units", detail: "38,732 Orders" },
    { node_id: "o1", type: "outcome", title: "Net Margin Expansion", delta_formatted: "+₹14.20 L", detail: "Margin 34.2%" },
  ],
  anomalies: [],
  ai_insight: {
    strategic_context: "Empirical backtesting confirms 94.8% forecast accuracy with 95.0% interval coverage.",
    verified_facts: [94.8, 18.4, 95.0, 48.2],
    guardrail_status: "verified",
  },
};

describe("Forecast Observatory Workspace (Phase 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate navigation to ?view=observatory
    window.history.pushState({}, "", "/app/dashboard?view=observatory");
  });

  it("renders Observatory header, RULES.md certification, and 3 accuracy KPI cards", async () => {
    vi.mocked(apiModule.api.getForecastObservatory).mockResolvedValue(mockObservatoryData);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Forecast & Intelligence Observatory/i)).toBeInTheDocument();
      expect(screen.getByText(/RULES\.md Certified \(0 Fake ML Metrics\)/i)).toBeInTheDocument();
    });

    // Check 3 KPI cards
    expect(screen.getByText("94.8%")).toBeInTheDocument();
    expect(screen.getByText("+18.4%")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("opens Backtest Detail Modal upon clicking View Validation Table", async () => {
    vi.mocked(apiModule.api.getForecastObservatory).mockResolvedValue(mockObservatoryData);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/View Validation Table/i)).toBeInTheDocument();
    });

    const modalBtn = screen.getByText(/View Validation Table/i);
    fireEvent.click(modalBtn);

    expect(screen.getByText(/Held-Out Backtest Validation Detail/i)).toBeInTheDocument();
    expect(screen.getByText("2024-W36")).toBeInTheDocument();
    expect(screen.getAllByText(/Captured \(95% CI\)/i).length).toBeGreaterThan(0);

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /^Close$/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Held-Out Backtest Validation Detail/i)).not.toBeInTheDocument();
  });

  it("renders Explainability Map and Scenario Flow components", async () => {
    vi.mocked(apiModule.api.getForecastObservatory).mockResolvedValue(mockObservatoryData);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Explainability Map/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/Scenario Flow Model/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Price \+10%/i)).toBeInTheDocument();
    expect(screen.getByText(/Net Margin Expansion/i)).toBeInTheDocument();
  });

  it("switches to Anomaly Log tab and displays zero false alarms status", async () => {
    vi.mocked(apiModule.api.getForecastObservatory).mockResolvedValue(mockObservatoryData);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Anomaly Log/i })).toBeInTheDocument();
    });

    const anomalyTabBtn = screen.getByRole("button", { name: /Anomaly Log/i });
    fireEvent.click(anomalyTabBtn);

    expect(screen.getByText(/No Unseasonal Anomalies Detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Repeating weekly\/monthly peaks have been de-trended/i)).toBeInTheDocument();
  });

  it("renders honest warning banner when status is insufficient_history", async () => {
    const insufficientData: apiModule.ForecastObservatoryData = {
      ...mockObservatoryData,
      status: "insufficient_history",
      history_periods_count: 5,
      min_required_periods: 12,
      unavailable_reason: "Not enough history to forecast. BizLens requires at least 12 distinct time intervals.",
      metrics: null,
    };
    vi.mocked(apiModule.api.getForecastObservatory).mockResolvedValue(insufficientData);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Insufficient Temporal History for Forecasting/i)).toBeInTheDocument();
      expect(screen.getByText(/Not enough history to forecast/i)).toBeInTheDocument();
    });
  });

  it("opens Explainability Summary Modal when clicking an item in IsoCubeMap", async () => {
    vi.mocked(apiModule.api.getForecastObservatory).mockResolvedValue(mockObservatoryData);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Electronics/i).length).toBeGreaterThan(0);
    });

    // Click on Electronics segment card
    const electronicsCard = screen.getByTestId("segment-Electronics");
    fireEvent.click(electronicsCard);

    // Verify modal appears
    await waitFor(() => {
      expect(screen.getByText(/Explainability Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/Three-Factor Variance Decomposition/i)).toBeInTheDocument();
      expect(screen.getByText(/Unit Volume Effect/i)).toBeInTheDocument();
    });

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /Close Summary/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Three-Factor Variance Decomposition/i)).not.toBeInTheDocument();
  });

  it("opens Scenario Flow detail modal with mathematical derivation when clicking a node", async () => {
    vi.mocked(apiModule.api.getForecastObservatory).mockResolvedValue(mockObservatoryData);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Price \+10%/i)).toBeInTheDocument();
    });

    // Click on the driver node
    const driverNode = screen.getByText(/Price \+10%/i);
    fireEvent.click(driverNode);

    // Verify modal appears with formulas
    await waitFor(() => {
      expect(screen.getByText(/Mathematical Formulation & Mechanics/i)).toBeInTheDocument();
      expect(screen.getByText(/Input Parameter Perturbation/i)).toBeInTheDocument();
    });

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /Close Summary/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Mathematical Formulation & Mechanics/i)).not.toBeInTheDocument();
  });

  it("switches explainability map views between Isometric, Waterfall, and Sensitivity", async () => {
    vi.mocked(apiModule.api.getForecastObservatory).mockResolvedValue(mockObservatoryData);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Explainability Map/i })).toBeInTheDocument();
    });

    // Switch to Explainability Map tab
    fireEvent.click(screen.getByRole("button", { name: /Explainability Map/i }));

    // Verify Explainability maps switcher is present
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /3D Isometric Stack/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Attribution Waterfall Bridge/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Sensitivity Matrix/i })).toBeInTheDocument();
    });

    // Switch to Waterfall view
    fireEvent.click(screen.getByRole("button", { name: /Attribution Waterfall Bridge/i }));
    await waitFor(() => {
      expect(screen.getByText(/Financial Variance Waterfall/i)).toBeInTheDocument();
    });

    // Switch to Sensitivity view
    fireEvent.click(screen.getByRole("button", { name: /Sensitivity Matrix/i }));
    await waitFor(() => {
      expect(screen.getByText(/Price × Cost Profit Sensitivity Matrix/i)).toBeInTheDocument();
    });
  });
});
