import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PulseLine } from "@/components/visuals/PulseLine";
import { HelixScene, DecisionFinding } from "@/components/visuals/HelixScene";

describe("Decision Support Telemetry & Helix Visuals", () => {
  describe("PulseLine Live Telemetry Health Score", () => {
    it("renders live telemetry monitor with dynamic score, status badge, and sub-metrics", () => {
      render(
        <PulseLine
          score={91}
          executionVelocity={25}
          dataQuality={98}
          lineageAudit={96}
          riskMitigation={92}
        />
      );

      // Verify header and score
      expect(screen.getByText(/Business Health Pulse/i)).toBeInTheDocument();
      expect(screen.getByText("91")).toBeInTheDocument();
      expect(screen.getByText("/100")).toBeInTheDocument();

      // Verify telemetry status & BPM
      expect(screen.getByText("OPTIMAL VITALITY")).toBeInTheDocument();
      expect(screen.getByText(/LIVE TELEMETRY/i)).toBeInTheDocument();

      // Verify sub-metrics
      expect(screen.getByText("Execution Velocity")).toBeInTheDocument();
      expect(screen.getByText("25%")).toBeInTheDocument();

      expect(screen.getByText("Data Quality")).toBeInTheDocument();
      expect(screen.getByText("98%")).toBeInTheDocument();

      expect(screen.getByText("Lineage Audit")).toBeInTheDocument();
      expect(screen.getByText("96%")).toBeInTheDocument();

      expect(screen.getByText("Risk Mitigation")).toBeInTheDocument();
      expect(screen.getByText("92%")).toBeInTheDocument();
    });

    it("adapts status badge for lower health scores", () => {
      render(
        <PulseLine
          score={68}
          executionVelocity={0}
          dataQuality={75}
          lineageAudit={80}
          riskMitigation={70}
        />
      );

      expect(screen.getByText("68")).toBeInTheDocument();
      expect(screen.getByText("ACTIVE MITIGATION")).toBeInTheDocument();
    });
  });

  describe("HelixScene Interactive 3D Decision Helix", () => {
    const mockFindings: DecisionFinding[] = [
      {
        id: "df-1",
        title: "South Region Margin Compression",
        metric: "₹12.44 L at Risk",
        priority: "high",
        stage: "finding",
        status: "open",
        segmentValue: "South Region",
      },
      {
        id: "df-2",
        title: "Q4 Peak Season Capacity Surge",
        metric: "+₹18.2 L Upside",
        priority: "medium",
        stage: "action",
        status: "applied",
        segmentValue: "Q4 Promo",
      },
      {
        id: "df-3",
        title: "Supplier Lead Time Optimization",
        metric: "₹4.50 L Savings",
        priority: "low",
        stage: "action",
        status: "completed",
        segmentValue: "Supplier Alpha",
      },
    ];

    it("renders dynamic rail cards populated from active dataset", () => {
      render(
        <HelixScene
          findings={mockFindings}
          datasetName="Enterprise Q3 Sales"
          totalRows={11106}
          qualityScore={98}
          appliedCount={1}
          completedCount={1}
          openCount={1}
          totalUpsideFormatted="₹18.2 L"
          totalRiskFormatted="₹12.44 L"
        />
      );

      // Verify Section Header
      expect(screen.getByText("5. The Decision Rails - Hybrid Theme")).toBeInTheDocument();
      expect(screen.getByText("Decision Support")).toBeInTheDocument();
      expect(screen.getByText("Enterprise Q3 Sales")).toBeInTheDocument();

      // Verify Rail Cards
      expect(screen.getByText("Priorities")).toBeInTheDocument();
      expect(screen.getByText(/Decision Support:/i)).toBeInTheDocument();

      expect(screen.getByText("Root Cause")).toBeInTheDocument();
      expect(screen.getByText(/STATISTICAL ROOT:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/South Region/i).length).toBeGreaterThanOrEqual(1);

      expect(screen.getByText("Aggressive")).toBeInTheDocument();
      expect(screen.getByText(/Variance Solvers:/i)).toBeInTheDocument();

      expect(screen.getByText("Baseline Actuals")).toBeInTheDocument();
      expect(screen.getByText(/Baseline Report: 11,106 Rows/i)).toBeInTheDocument();

      expect(screen.getByText("Simulation Impact")).toBeInTheDocument();
      expect(screen.getByText("+₹18.2 L")).toBeInTheDocument();

      expect(screen.getByText("Signed-Off")).toBeInTheDocument();
      expect(screen.getByText(/Executive Actions: 2/i)).toBeInTheDocument();
    });

    it("allows stepping through decision nodes with Seek, Select, and Store", async () => {
      const handleSelectFinding = vi.fn();
      const handleApplyFinding = vi.fn();

      render(
        <HelixScene
          findings={mockFindings}
          datasetName="Enterprise Q3 Sales"
          onSelectFinding={handleSelectFinding}
          onApplyFinding={handleApplyFinding}
        />
      );

      // Initial active target: df-1
      expect(screen.getByText("NODE [1/3]")).toBeInTheDocument();
      expect(screen.getByText("South Region Margin Compression")).toBeInTheDocument();

      // Find controller buttons
      const seekButton = screen.getByRole("button", { name: /seek/i });
      const selectButton = screen.getByRole("button", { name: /select/i });
      const storeButton = screen.getByRole("button", { name: /store/i });

      expect(seekButton).toBeInTheDocument();
      expect(selectButton).toBeInTheDocument();
      expect(storeButton).toBeInTheDocument();

      // Step forward with Store
      fireEvent.click(storeButton);
      expect(screen.getByText("NODE [2/3]")).toBeInTheDocument();
      expect(screen.getByText("Q4 Peak Season Capacity Surge")).toBeInTheDocument();
      expect(handleSelectFinding).toHaveBeenCalledWith(mockFindings[1]);

      // Step backward with Seek
      fireEvent.click(seekButton);
      expect(screen.getByText("NODE [1/3]")).toBeInTheDocument();
      expect(screen.getByText("South Region Margin Compression")).toBeInTheDocument();
      expect(handleSelectFinding).toHaveBeenCalledWith(mockFindings[0]);

      // Apply decision with Select
      fireEvent.click(selectButton);
      await waitFor(() => {
        expect(handleApplyFinding).toHaveBeenCalledWith("df-1");
      });
      expect(await screen.findByText(/captured.*into execution roadmap/i)).toBeInTheDocument();
    });
  });
});
