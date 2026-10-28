import React, { useState } from "react";
import { SensitivityCell } from "@/lib/api";
import { ShieldCheck, Info, Sparkles, X, CheckCircle2, Sliders, TableProperties } from "lucide-react";
import { cn } from "@/lib/utils";

interface SensitivityMatrixProps {
  matrix: SensitivityCell[][];
  onSelectCell?: (pricePct: number, costPct: number) => void;
  activeDatasetName?: string;
  className?: string;
}

export const SensitivityMatrix: React.FC<SensitivityMatrixProps> = ({
  matrix,
  onSelectCell,
  activeDatasetName = "Current Dataset",
  className = "",
}) => {
  const [hoveredCell, setHoveredCell] = useState<SensitivityCell | null>(null);
  const [selectedCell, setSelectedCell] = useState<SensitivityCell | null>(null);

  if (!matrix || matrix.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-text-muted border border-surface-border rounded-2xl bg-surface-card">
        No sensitivity matrix calculated.
      </div>
    );
  }

  const costHeaders = matrix[0]?.map((c) => c.cost_delta_pct) || [];

  const getCellBg = (cell: SensitivityCell) => {
    if (cell.is_baseline) {
      return "border-2 border-brand-orange bg-brand-orange/20 text-brand-orange font-extrabold shadow-glowSm";
    }
    const d = cell.profit_delta_pct;
    if (d >= 10.0) return "border border-status-positive/50 bg-status-positive/20 text-status-positive font-bold";
    if (d > 0.0) return "border border-status-positive/30 bg-status-positive/10 text-status-positive font-semibold";
    if (d === 0.0) return "border border-surface-border bg-surface-subtle text-text-muted";
    if (d > -10.0) return "border border-status-critical/30 bg-status-critical/10 text-status-critical font-semibold";
    return "border border-status-critical/50 bg-status-critical/25 text-status-critical font-bold";
  };

  const handleCellClick = (cell: SensitivityCell) => {
    setSelectedCell(cell);
    onSelectCell?.(cell.price_delta_pct, cell.cost_delta_pct);
  };

  return (
    <div className={`p-5 rounded-2xl border border-surface-border bg-surface-card backdrop-blur-md relative overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-surface-border">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-main flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-positive inline-block" />
            Price &times; Cost Profit Sensitivity Matrix
            <span className="text-[10px] font-normal text-text-muted px-1.5 py-0.5 rounded bg-surface-subtle border border-surface-border ml-1">
              Click cell to inspect summary
            </span>
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Deterministic gross profit delta % across price shifts (rows) and cost inflation (columns).
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span className="px-2 py-0.5 rounded-full border border-brand-orange bg-brand-orange/20 text-brand-orange font-bold">
            Baseline (0% / 0%)
          </span>
          <span>Click any cell to inspect</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs select-none">
          <thead>
            <tr>
              <th className="p-2.5 text-left text-[11px] font-bold text-text-muted border-b border-surface-border bg-surface-subtle/50 rounded-tl-xl">
                Price \ Cost
              </th>
              {costHeaders.map((c, idx) => (
                <th
                  key={idx}
                  className="p-2.5 text-center text-[11px] font-mono font-bold text-text-muted border-b border-surface-border bg-surface-subtle/50"
                >
                  {c >= 0 ? `+${c}%` : `${c}%`} Cost
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rIdx) => {
              const priceDelta = row[0]?.price_delta_pct;
              return (
                <tr key={rIdx} className="hover:bg-surface-subtle/20 transition-colors">
                  <td className="p-2.5 font-mono font-bold text-text-main border-r border-surface-border bg-surface-subtle/30 whitespace-nowrap">
                    {priceDelta >= 0 ? `+${priceDelta}%` : `${priceDelta}%`} Price
                  </td>
                  {row.map((cell, cIdx) => {
                    const isHovered =
                      hoveredCell?.price_delta_pct === cell.price_delta_pct &&
                      hoveredCell?.cost_delta_pct === cell.cost_delta_pct;
                    const isSelected =
                      selectedCell?.price_delta_pct === cell.price_delta_pct &&
                      selectedCell?.cost_delta_pct === cell.cost_delta_pct;

                    return (
                      <td
                        key={cIdx}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => handleCellClick(cell)}
                        className="p-1 text-center"
                      >
                        <div
                          className={`p-2.5 rounded-xl cursor-pointer transition-all duration-150 flex flex-col items-center justify-center ${getCellBg(
                            cell
                          )} ${isHovered || isSelected ? "scale-105 shadow-md ring-2 ring-white/60" : ""}`}
                        >
                          <span className="font-mono text-xs">
                            {cell.profit_delta_pct >= 0 ? `+${cell.profit_delta_pct}%` : `${cell.profit_delta_pct}%`}
                          </span>
                          <span className="text-[10px] opacity-80 font-mono mt-0.5">
                            {cell.profit_formatted}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected/Hovered cell summary bar */}
      <div className="mt-3 p-3 rounded-xl bg-surface-subtle/60 border border-surface-border flex items-center justify-between text-xs">
        {hoveredCell ? (
          <div className="flex items-center gap-3">
            <span className="font-bold text-text-main">
              {hoveredCell.price_delta_pct >= 0 ? `+${hoveredCell.price_delta_pct}%` : `${hoveredCell.price_delta_pct}%`}{" "}
              Price with{" "}
              {hoveredCell.cost_delta_pct >= 0 ? `+${hoveredCell.cost_delta_pct}%` : `${hoveredCell.cost_delta_pct}%`}{" "}
              Cost:
            </span>
            <span className="font-mono text-text-muted">
              Projected Gross Profit: <strong className="text-text-main">{hoveredCell.profit_formatted}</strong>
            </span>
            <span
              className={`font-mono font-bold ${
                hoveredCell.profit_delta_pct >= 0 ? "text-status-positive" : "text-status-critical"
              }`}
            >
              ({hoveredCell.profit_delta_pct >= 0 ? "+" : ""}
              {hoveredCell.profit_delta_pct}% vs baseline)
            </span>
          </div>
        ) : (
          <span className="text-text-muted flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-text-muted" />
            Click any cell to inspect the mathematical simulation summary for {activeDatasetName}.
          </span>
        )}
      </div>

      {/* Interactive Sensitivity Summary Modal (SOLID, 100% NON-TRANSPARENT BACKGROUND) */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-[#140F0C] p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto text-text-main">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-status-positive/10 text-status-positive border border-status-positive/30 shadow-glowSm">
                  <TableProperties className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-orange px-1.5 py-0.5 rounded bg-brand-orange/10 border border-brand-orange/20">
                      {selectedCell.is_baseline ? "Baseline Coordinates" : "Simulation Coordinate"}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">{activeDatasetName}</span>
                  </div>
                  <h3 className="text-base font-bold text-text-main mt-1">
                    Price &times; Cost Profit Sensitivity Summary
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-[#201814] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Matrix Parameters Grid (SOLID OPAQUE TILES) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#1C1612] border border-surface-border">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Price Shift</span>
                <div className="text-lg font-extrabold font-mono text-brand-orange mt-1">
                  {selectedCell.price_delta_pct >= 0 ? `+${selectedCell.price_delta_pct}%` : `${selectedCell.price_delta_pct}%`}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1C1612] border border-surface-border">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Cost Shift</span>
                <div className="text-lg font-extrabold font-mono text-text-main mt-1">
                  {selectedCell.cost_delta_pct >= 0 ? `+${selectedCell.cost_delta_pct}%` : `${selectedCell.cost_delta_pct}%`}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1C1612] border border-surface-border col-span-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Profit Delta %</span>
                <div
                  className={cn(
                    "text-lg font-extrabold font-mono mt-1",
                    selectedCell.profit_delta_pct >= 0 ? "text-status-positive" : "text-status-critical"
                  )}
                >
                  {selectedCell.profit_delta_pct >= 0 ? `+${selectedCell.profit_delta_pct}%` : `${selectedCell.profit_delta_pct}%`}
                </div>
              </div>
            </div>

            {/* Projected Profit Result (SOLID OPAQUE CARD) */}
            <div className="p-4 rounded-xl bg-[#1C1612] border border-surface-border flex items-center justify-between">
              <div>
                <span className="text-xs text-text-muted font-medium">Projected Gross Profit</span>
                <div className="text-2xl font-extrabold font-mono text-status-positive mt-0.5">
                  {selectedCell.profit_formatted}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-text-muted font-medium">Variance vs Baseline</span>
                <div
                  className={cn(
                    "text-base font-bold font-mono mt-0.5",
                    selectedCell.profit_delta_pct >= 0 ? "text-status-positive" : "text-status-critical"
                  )}
                >
                  {selectedCell.profit_delta_pct >= 0 ? `+${selectedCell.profit_delta_pct}%` : `${selectedCell.profit_delta_pct}%`}
                </div>
              </div>
            </div>

            {/* AI Strategic Synthesis (SOLID OPAQUE CARD) */}
            <div className="p-3.5 rounded-xl bg-[#1C1612] border border-surface-border space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text-main">
                <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                <span>Sensitivity Evaluation &bull; {activeDatasetName}</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Applying a {selectedCell.price_delta_pct >= 0 ? `+${selectedCell.price_delta_pct}%` : `${selectedCell.price_delta_pct}%`} price adjustment alongside a{" "}
                {selectedCell.cost_delta_pct >= 0 ? `+${selectedCell.cost_delta_pct}%` : `${selectedCell.cost_delta_pct}%`} cost inflation rate results in a projected gross profit of{" "}
                <strong className="text-text-main font-mono">{selectedCell.profit_formatted}</strong> ({selectedCell.profit_delta_pct >= 0 ? "+" : ""}{selectedCell.profit_delta_pct}% relative to historical baseline).
              </p>
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-orange text-white hover:bg-brand-orange/90 transition-colors shadow-sm"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
