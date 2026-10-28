import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { FactBadge } from "../components/ui/FactBadge";
import { KpiCard } from "../components/ui/KpiCard";

describe("Core UI Components", () => {
  it("renders Button with primary variant and glow effects", () => {
    render(<Button variant="primary">Launch Analysis</Button>);
    const btn = screen.getByRole("button", { name: /launch analysis/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass("bg-gradient-to-r");
  });

  it("renders StatusBadge with positive, critical, and warning types", () => {
    const { rerender } = render(<StatusBadge status="positive">Healthy</StatusBadge>);
    expect(screen.getByText("Healthy")).toBeInTheDocument();

    rerender(<StatusBadge status="critical">Action Required</StatusBadge>);
    expect(screen.getByText("Action Required")).toBeInTheDocument();
  });

  it("renders FactBadge with strict analytical provenance (Deterministic / Gemini)", () => {
    const { rerender } = render(<FactBadge type="deterministic" formula="SUM(revenue) - SUM(cost)" />);
    expect(screen.getByText(/Deterministic Calc/i)).toBeInTheDocument();

    rerender(<FactBadge type="model_narrative" model="gemini-2.5-flash" />);
    expect(screen.getByText(/AI Narrative/i)).toBeInTheDocument();
  });

  it("renders KpiCard with formatted value and verification badge", () => {
    render(
      <KpiCard
        title="Gross Margin"
        value="$1,420,500"
        change={+8.4}
        changeLabel="vs last month"
        status="positive"
        calculationSource="formula: revenue - cogs"
      />
    );
    expect(screen.getByText("Gross Margin")).toBeInTheDocument();
    expect(screen.getByText("$1,420,500")).toBeInTheDocument();
    expect(screen.getByText(/8.4%/i)).toBeInTheDocument();
    expect(screen.getByText(/Deterministic/i)).toBeInTheDocument();
  });
});
