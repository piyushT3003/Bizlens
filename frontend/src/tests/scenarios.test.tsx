import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { WhatIfPage } from "@/pages/app/WhatIfPage";
import * as apiModule from "@/lib/api";

// Mock API module
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      simulateScenario: vi.fn(),
      listScenarios: vi.fn(),
      compareScenarios: vi.fn(),
      saveScenario: vi.fn(),
    },
  };
});

// Mock Dataset hook
vi.mock("@/hooks/useDataset", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useDataset")>();
  return {
    ...actual,
    useDatasetStore: Object.assign(
      () => ({
        activeDataset: {
          id: "test-ds-1",
          name: "Sample Retail Q3",
          active_version_id: "v-1",
        },
        activePreset: actual.PRESET_DATASETS[0],
        datasets: [
          { id: "test-ds-1", name: "Sample Retail Q3" },
        ],
        fetchDatasets: vi.fn(),
        loadDemoDataset: vi.fn(),
      }),
      {
        getState: () => ({
          selectDataset: vi.fn(),
        }),
      }
    ),
  };
});

const mockSimulationResponse: apiModule.ScenarioSimulationResponse = {
  dataset_id: "test-ds-1",
  baseline_metrics: {
    revenue: 98912814.40,
    revenue_formatted: "₹9.89 Cr",
    volume_units: 22262,
    volume_formatted: "22,262 units",
    cogs: 67260713.80,
    cogs_formatted: "₹6.73 Cr",
    gross_profit: 31652100.60,
    gross_profit_formatted: "₹3.17 Cr",
    gross_margin_pct: 32.0,
    avg_unit_price: 4443.12,
    avg_unit_cost: 3021.32,
  },
  simulated_metrics: {
    revenue: 100098728.10,
    revenue_formatted: "₹10.01 Cr",
    volume_units: 20481,
    volume_formatted: "20,481 units",
    cogs: 63235771.35,
    cogs_formatted: "₹6.32 Cr",
    gross_profit: 36862956.75,
    gross_profit_formatted: "₹3.69 Cr",
    gross_margin_pct: 36.83,
    avg_unit_price: 4887.43,
    avg_unit_cost: 3087.52,
  },
  deltas: {
    revenue_delta_abs: 1185913.70,
    revenue_delta_formatted: "₹11.86 L",
    revenue_delta_pct: 1.2,
    profit_delta_abs: 5210856.15,
    profit_delta_formatted: "₹52.11 L",
    profit_delta_pct: 16.5,
    volume_delta_abs: -1781,
    volume_delta_formatted: "-1,781 units",
    volume_delta_pct: -8.0,
    margin_delta_pts: 4.83,
  },
  assumptions: {
    price_elasticity: -0.80,
    marketing_elasticity: 0.25,
    variable_cost_ratio: 0.65,
    fixed_cost_ratio: 0.35,
    source: "Calibrated from historical transactions (DuckDB Columnar)",
    methodology_note: "Volume response calibrated via Delta Q = Q0 * epsilon * (Delta P / P0).",
  },
  waterfall: [
    {
      label: "Baseline Gross Profit",
      delta_value: 31652100.60,
      delta_formatted: "₹3.17 Cr",
      running_total: 31652100.60,
      running_formatted: "₹3.17 Cr",
      step_type: "baseline",
    },
    {
      label: "Price Realization Effect",
      delta_value: 9891281.44,
      delta_formatted: "₹98.91 L",
      running_total: 41543382.04,
      running_formatted: "₹4.15 Cr",
      step_type: "positive",
    },
    {
      label: "Volume Elasticity Effect",
      delta_value: -4680425.29,
      delta_formatted: "-₹46.80 L",
      running_total: 36862956.75,
      running_formatted: "₹3.69 Cr",
      step_type: "negative",
    },
    {
      label: "Simulated Gross Profit",
      delta_value: 36862956.75,
      delta_formatted: "₹3.69 Cr",
      running_total: 36862956.75,
      running_formatted: "₹3.69 Cr",
      step_type: "result",
    },
  ],
  sensitivity_matrix: [
    [
      { price_delta_pct: -10, cost_delta_pct: -5, simulated_profit: 30000000, profit_formatted: "₹3.00 Cr", profit_delta_pct: -5.2, is_baseline: false },
      { price_delta_pct: -10, cost_delta_pct: 0, simulated_profit: 28000000, profit_formatted: "₹2.80 Cr", profit_delta_pct: -11.5, is_baseline: false },
    ],
    [
      { price_delta_pct: 0, cost_delta_pct: 0, simulated_profit: 31652100, profit_formatted: "₹3.17 Cr", profit_delta_pct: 0.0, is_baseline: true },
      { price_delta_pct: 10, cost_delta_pct: 0, simulated_profit: 36862956, profit_formatted: "₹3.69 Cr", profit_delta_pct: 16.5, is_baseline: false },
    ],
  ],
  strategic_summary: "Simulating a +10.0% price adjustment projects Net Revenue of ₹10.01 Cr and Gross Profit of ₹3.69 Cr (+16.5% change). Volume contracts by -8.0% to 20,481 units under transparent demand elasticity (ε = -0.80), expanding net gross margin by +4.83 percentage points.",
  fact_badges: [
    { label: "Simulated Revenue", value: "₹10.01 Cr", verified: true },
    { label: "Profit Delta", value: "+16.5%", verified: true },
    { label: "Volume Impact", value: "-8.0%", verified: true },
    { label: "Margin Shift", value: "+4.83 pts", verified: true },
    { label: "Demand Elasticity", value: "ε = -0.80", verified: true },
  ],
  lineage_ref: {
    engine: "DuckDB Microeconomic Scenario Engine",
    content_hash: "eed550f8",
  },
  execution_time_ms: 12.4,
};

const mockSavedScenarios: apiModule.ScenarioRecordResponse[] = [
  {
    id: "sc-1",
    dataset_id: "test-ds-1",
    version_id: "v-1",
    name: "Target Price Hike (+10%)",
    created_at: "2026-10-04T03:00:00Z",
    drivers: { price_pct: 10.0, cost_pct: 0.0, marketing_spend_pct: 0.0, discount_pct: 0.0 },
    assumptions: mockSimulationResponse.assumptions,
    metrics: mockSimulationResponse.simulated_metrics,
    deltas: mockSimulationResponse.deltas,
  },
];

describe("What-If Scenario Simulation Workspace (Phase 11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiModule.api.simulateScenario).mockResolvedValue(mockSimulationResponse);
    vi.mocked(apiModule.api.listScenarios).mockResolvedValue(mockSavedScenarios);
    vi.mocked(apiModule.api.compareScenarios).mockResolvedValue({
      dataset_id: "test-ds-1",
      baseline: mockSimulationResponse.baseline_metrics,
      scenarios: mockSavedScenarios,
    });
  });

  it("renders Scenario Simulator header, governance badges, and declared assumptions", async () => {
    render(
      <BrowserRouter>
        <WhatIfPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Scenario Simulation Workbench/i)).toBeInTheDocument();
    expect(screen.getByText(/PANEL 8: SCENARIO SIMULATOR/i)).toBeInTheDocument();
    expect(screen.getByText(/RULES.md Certified \(Deterministic Elasticity\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Declared Assumptions/i)).toBeInTheDocument();
    expect(screen.getByText(/Price Elasticity \(ε\):/i)).toBeInTheDocument();
  });

  it("displays 4 hero metric cards with simulated values and baseline comparison", async () => {
    render(
      <BrowserRouter>
        <WhatIfPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("₹10.01 Cr")[0]).toBeInTheDocument();
      expect(screen.getAllByText("₹3.69 Cr")[0]).toBeInTheDocument();
      expect(screen.getAllByText("36.83%")[0]).toBeInTheDocument();
      expect(screen.getAllByText("20,481 units")[0]).toBeInTheDocument();
    });
  });

  it("renders Variance Waterfall chart and Sensitivity Matrix tabs", async () => {
    render(
      <BrowserRouter>
        <WhatIfPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Variance Waterfall/i)).toBeInTheDocument();
      expect(screen.getByText(/Sensitivity Matrix/i)).toBeInTheDocument();
    });

    // Switch to Sensitivity tab
    const sensTab = screen.getByText(/Sensitivity Matrix/i);
    fireEvent.click(sensTab);

    await waitFor(() => {
      expect(screen.getByText(/Price × Cost Profit Sensitivity Matrix/i)).toBeInTheDocument();
    });
  });

  it("switches to Saved Scenarios tab and displays saved runs", async () => {
    render(
      <BrowserRouter>
        <WhatIfPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Saved Scenarios \(1\)/i)).toBeInTheDocument();
    });

    const savedTab = screen.getByText(/Saved Scenarios \(1\)/i);
    fireEvent.click(savedTab);

    await waitFor(() => {
      expect(screen.getByText("Target Price Hike (+10%)")).toBeInTheDocument();
    });
  });

  it("opens Side-by-Side Comparison modal showing baseline and scenario columns", async () => {
    render(
      <BrowserRouter>
        <WhatIfPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Compare/i })).toBeInTheDocument();
    });

    const compareBtn = screen.getByRole("button", { name: /Compare/i });
    fireEvent.click(compareBtn);

    await waitFor(() => {
      expect(screen.getByText("Side-by-Side Scenario Comparison")).toBeInTheDocument();
      expect(screen.getByText("Baseline Actuals")).toBeInTheDocument();
    });
  });
});
