import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { AICore } from "@/components/visuals/AICore";
import { BrandLoader } from "@/components/ui/Loaders";
import { MacBookIngestionAnimation } from "@/components/visuals/MacBookIngestionAnimation";
import { useDatasetStore } from "@/hooks/useDataset";
import { ColumnMappingItem, DatasetSummary } from "@/lib/api";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  Sparkles,
  Trash2,
  Search,
  HardDrive,
  Layers,
  Cpu,
  Clock,
  ShieldCheck,
  Play,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLES = [
  "date",
  "revenue",
  "cost",
  "quantity",
  "category",
  "region",
  "product",
  "customer",
  "margin",
  "discount",
  "id",
  "text",
];

export const UploadPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [dragOver, setDragOver] = useState(false);
  const [localMapping, setLocalMapping] = useState<Record<string, ColumnMappingItem>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  // MacBook Ingestion Animation State
  const [ingestionModal, setIngestionModal] = useState<{
    isOpen: boolean;
    datasetName: string;
    rowCount: number;
    colCount: number;
    fileName?: string;
    targetUrl?: string;
    isUpload?: boolean;
  }>({
    isOpen: false,
    datasetName: "",
    rowCount: 10000,
    colCount: 12,
  });

  // Delete Confirmation State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    datasetId: string;
    datasetName: string;
  }>({
    isOpen: false,
    datasetId: "",
    datasetName: "",
  });

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const {
    datasets,
    activeDataset,
    isLoading,
    error,
    fetchDatasets,
    selectDataset,
    uploadDataset,
    loadDemoDataset,
    deleteDataset,
    confirmMapping,
  } = useDatasetStore();

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const steps = [
    "1. File Upload",
    "2. Ingestion & Profile",
    "3. Column Mapping",
    "4. Engine Ready",
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    try {
      // Trigger MacBook Ingestion Animation
      setIngestionModal({
        isOpen: true,
        datasetName: file.name.replace(/\.[^/.]+$/, ""),
        rowCount: 15000,
        colCount: 14,
        fileName: file.name,
        isUpload: true,
      });

      const detail = await uploadDataset(file);
      if (detail.active_mapping) {
        setLocalMapping(detail.active_mapping);
      }
    } catch (err: any) {
      setIngestionModal((prev) => ({ ...prev, isOpen: false }));
      setCurrentStep(1);
    }
  };

  const handleLoadDemo = async () => {
    try {
      setIngestionModal({
        isOpen: true,
        datasetName: "Sample Retail Q3 (Indian Commerce)",
        rowCount: 11106,
        colCount: 14,
        fileName: "retail_q3_enterprise.parquet",
        isUpload: true,
      });

      const detail = await loadDemoDataset();
      if (detail.active_mapping) {
        setLocalMapping(detail.active_mapping);
      }
    } catch {
      setIngestionModal((prev) => ({ ...prev, isOpen: false }));
      setCurrentStep(1);
    }
  };

  const handleSelectExisting = async (d: DatasetSummary) => {
    setIngestionModal({
      isOpen: true,
      datasetName: d.name,
      rowCount: d.row_count || 10000,
      colCount: d.col_count || 12,
      fileName: d.source_filename_sanitized,
      targetUrl: "/app/dashboard",
      isUpload: false,
    });

    try {
      await selectDataset(d.id);
    } catch (err) {
      console.warn("Dataset selection background:", err);
    }
  };

  const handleAnimationComplete = () => {
    const isUploadFlow = ingestionModal.isUpload;
    setIngestionModal((prev) => ({ ...prev, isOpen: false }));
    if (isUploadFlow) {
      setCurrentStep(3);
      const mainContainer = document.querySelector("main.overflow-y-auto");
      if (mainContainer) mainContainer.scrollTop = 0;
      window.scrollTo(0, 0);
    } else {
      navigate(ingestionModal.targetUrl || "/app/dashboard");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.datasetId) return;
    const name = deleteModal.datasetName;
    try {
      await deleteDataset(deleteModal.datasetId);
      setDeleteModal({ isOpen: false, datasetId: "", datasetName: "" });
      setNotification({
        type: "success",
        message: `Dataset "${name}" was successfully removed from active memory.`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `Failed to remove dataset: ${err.message || "Unknown error"}`,
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleRoleChange = (colName: string, newRole: string) => {
    setLocalMapping((prev) => ({
      ...prev,
      [colName]: {
        ...prev[colName],
        role: newRole,
        confirmed: true,
      },
    }));
  };

  const handleConfirmAndProceed = async () => {
    if (!activeDataset) return;
    try {
      await confirmMapping(activeDataset.id, localMapping);
      navigate("/app/dashboard");
    } catch (err) {
      console.error("Failed to confirm mapping:", err);
    }
  };

  // Filtered datasets for the active library
  const filteredDatasets = useMemo(() => {
    if (!searchQuery.trim()) return datasets;
    const q = searchQuery.toLowerCase().trim();
    return datasets.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.source_filename_sanitized.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }, [datasets, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
          Data Ingestion Engine
        </span>
        <h1 className="text-2xl font-bold text-text-main mt-1">Upload &amp; Prepare Dataset</h1>
        <p className="text-xs text-text-muted mt-1">
          Snappy Parquet conversion with automated column role inference, profiling, and calculation lineage.
        </p>
      </div>

      {/* Stepper Progress Indicator */}
      <div className="flex items-center justify-between overflow-x-auto pb-2 gap-2 text-xs font-semibold">
        {steps.map((s, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors ${
              idx + 1 === currentStep
                ? "border-brand-orange text-brand-orange bg-brand-orange/10"
                : idx + 1 < currentStep
                ? "border-status-positive/40 text-status-positive bg-status-positiveBg/20"
                : "border-surface-border text-text-muted"
            }`}
          >
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* Toast Feedback Notification */}
      {notification && (
        <div
          className={cn(
            "p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 shadow-sm",
            notification.type === "success"
              ? "bg-status-positiveBg text-status-positive border-status-positive/30"
              : "bg-status-criticalBg text-status-critical border-status-critical/30"
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-80 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-status-critical/15 border border-status-critical/30 flex items-center gap-3 text-xs text-status-critical">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Center Upload & Dataset Management Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Upload Dropzone & Active Datasets Library */}
          {currentStep === 1 && (
            <>
              {/* Dropzone Container */}
              <GlassCard
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`p-8 border-dashed border-2 text-center flex flex-col items-center justify-center min-h-[290px] transition-all relative overflow-hidden ${
                  dragOver
                    ? "border-brand-orange bg-brand-orange/10 shadow-glowSm scale-[1.005]"
                    : "border-surface-border hover:border-brand-orange/60"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx,.xls,.parquet,.json"
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-brand-orange/15 text-brand-orange flex items-center justify-center mb-4 shadow-glowSm">
                  <Upload className="w-7 h-7" />
                </div>

                <h3 className="text-base font-bold text-text-main">Drag &amp; Drop Dataset File Here</h3>
                <p className="text-xs text-text-muted mt-1 max-w-sm">
                  Supports CSV, XLSX, XLS, Parquet, JSON. Max 100 MB, up to 500,000 rows.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    variant="primary"
                    onClick={() => fileInputRef.current?.click()}
                    icon={<FileSpreadsheet className="w-4 h-4" />}
                  >
                    Select File from Computer
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleLoadDemo}
                    icon={<Database className="w-4 h-4" />}
                  >
                    Load Demo Data (Sample Retail Q3)
                  </Button>
                </div>
              </GlassCard>

              {/* Active Datasets Library Section */}
              <div className="p-6 rounded-2xl border border-surface-border bg-surface-card backdrop-blur-md shadow-card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-border">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange border border-brand-orange/20 shadow-glowSm">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                        Active Datasets Library
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-orange/15 text-brand-orange border border-brand-orange/30">
                          {datasets.length} Ready
                        </span>
                      </h3>
                      <p className="text-xs text-text-muted">
                        Select a dataset to launch Apple Silicon columnar ingestion or manage storage.
                      </p>
                    </div>
                  </div>

                  {/* Search filter input */}
                  <div className="relative min-w-[200px] w-full sm:w-auto">
                    <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search datasets..."
                      className="w-full sm:w-56 pl-8 pr-3 py-1.5 rounded-xl text-xs bg-surface-subtle border border-surface-border text-text-main placeholder:text-text-muted outline-none focus:border-brand-orange transition-colors"
                    />
                  </div>
                </div>

                {/* Dataset Cards Grid */}
                {filteredDatasets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredDatasets.map((d) => {
                      const isActive = activeDataset?.id === d.id;
                      return (
                        <div
                          key={d.id}
                          className={cn(
                            "p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between group relative min-h-[155px]",
                            isActive
                              ? "bg-[#1C1612] border-brand-orange shadow-glowSm ring-1 ring-brand-orange/40"
                              : "bg-[#18120E] border-surface-border/70 hover:border-brand-orange/50 hover:bg-[#1E1713]"
                          )}
                        >
                          <div>
                            {/* Card Top Row: Badges & Remove Button */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                {isActive ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-orange text-white shadow-sm">
                                    <Sparkles className="w-3 h-3" /> Active in Engine
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#221B16] text-text-muted border border-surface-border/60">
                                    <Database className="w-3 h-3 text-brand-orange" /> Parquet Store
                                  </span>
                                )}

                                {d.quality_score !== null && d.quality_score !== undefined && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-status-positiveBg text-status-positive border border-status-positive/25">
                                    {Math.round(d.quality_score)}% Quality
                                  </span>
                                )}
                              </div>

                              {/* Remove Dataset Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteModal({
                                    isOpen: true,
                                    datasetId: d.id,
                                    datasetName: d.name,
                                  });
                                }}
                                className="p-1.5 rounded-lg text-text-muted hover:text-status-critical hover:bg-status-criticalBg/20 transition-all opacity-80 group-hover:opacity-100"
                                title={`Remove dataset "${d.name}"`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Dataset Title */}
                            <h4 className="text-xs sm:text-sm font-bold text-text-main group-hover:text-brand-orange transition-colors truncate">
                              {d.name}
                            </h4>

                            <p className="text-[11px] font-mono text-text-muted truncate mt-0.5">
                              {d.source_filename_sanitized}
                            </p>
                          </div>

                          {/* Card Footer: Metrics & Ingest Button */}
                          <div className="mt-3 pt-2.5 border-t border-surface-border/50 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono text-text-muted tabular-nums">
                              {d.row_count.toLocaleString()} rows &bull; {d.col_count} cols
                            </span>

                            <button
                              onClick={() => handleSelectExisting(d)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm",
                                isActive
                                  ? "bg-brand-orange/20 text-brand-orange hover:bg-brand-orange hover:text-white"
                                  : "bg-[#221B16] border border-brand-orange/30 hover:border-brand-orange text-text-main hover:text-brand-orange hover:bg-brand-orange/10"
                              )}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{isActive ? "Re-Ingest" : "Ingest & Open"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-text-muted">
                    <HardDrive className="w-8 h-8 text-text-muted/40 mx-auto mb-2" />
                    <p className="font-semibold text-text-main">No datasets match your search</p>
                    <p className="mt-0.5">Try searching for another keyword or upload a new file above.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 2: Ingestion & Profiling in progress */}
          {currentStep === 2 && (
            <GlassCard tilt hoverGlow className="p-12 text-center flex flex-col items-center justify-center min-h-[320px]">
              <BrandLoader size="lg" label="Processing Parquet &amp; Profiling Statistics..." />
              <p className="text-xs text-text-muted mt-4 max-w-md">
                Calculating SHA-256 hash, converting to Snappy-compressed Parquet, running DuckDB column distributions, and classifying semantic roles.
              </p>
            </GlassCard>
          )}

          {/* Step 3: Column Mapping Confirmation */}
          {currentStep === 3 && activeDataset && (
            <GlassCard tilt hoverGlow className="p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-border">
                <div>
                  <h3 className="text-sm font-bold text-text-main">
                    Confirm Column Mappings: {activeDataset.name}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {activeDataset.row_count.toLocaleString()} rows, {activeDataset.col_count} columns verified in DuckDB.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activeDataset.quality_score !== null && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-status-positiveBg text-status-positive border border-status-positive/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {activeDataset.quality_score}% Quality Score
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(localMapping).map(([colName, mapping]) => (
                  <div
                    key={colName}
                    className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-surface-subtle border border-surface-border/50 text-xs gap-3"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-main flex items-center gap-2">
                        {mapping.original_name}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-card text-text-muted font-mono">
                          {mapping.data_type}
                        </span>
                      </span>
                      {mapping.reasoning && (
                        <span className="text-[11px] text-text-muted mt-0.5">
                          {mapping.reasoning}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-[11px] text-brand-orange font-semibold">
                        {Math.round(mapping.confidence * 100)}% Match
                      </div>
                      <select
                        value={mapping.role}
                        onChange={(e) => handleRoleChange(colName, e.target.value)}
                        style={{ colorScheme: "dark" }}
                        className="bg-surface-card text-text-main border border-surface-border rounded-lg px-2.5 py-1 text-xs font-medium outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} style={{ backgroundColor: "#140f0b", color: "#fff4ea" }}>
                            {r.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-surface-border flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
                  Upload Another File
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleConfirmAndProceed}
                  loading={isLoading}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Confirm &amp; Open Dashboard
                </Button>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right Guidance & AI Core Assistant */}
        <div>
          <GlassCard tilt hoverGlow className="p-6 flex flex-col items-center text-center space-y-4">
            <AICore mode="calm" size={200} />
            <h4 className="text-sm font-bold text-text-main">Data Ingestion Assistant</h4>
            <p className="text-xs text-text-muted leading-relaxed">
              BizLens performs zero-guess parsing. Ambiguous date formats (DD/MM vs MM/DD) and mixed currencies are detected and verified before conversion to immutable Parquet.
            </p>
            <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border w-full text-left text-xs space-y-1.5">
              <span className="font-semibold text-text-main flex items-center gap-1.5 text-status-positive">
                <CheckCircle2 className="w-3.5 h-3.5" /> PII Defense Active
              </span>
              <p className="text-[11px] text-text-muted">
                Aadhaar, PAN, phone numbers, and emails are quarantined from AI contexts.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border w-full text-left text-xs space-y-1.5">
              <span className="font-semibold text-text-main flex items-center gap-1.5 text-brand-orange">
                <Sparkles className="w-3.5 h-3.5" /> Deterministic Lineage
              </span>
              <p className="text-[11px] text-text-muted">
                Every KPI references the SHA-256 hash of this Parquet snapshot.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* MacBook-inspired Data Ingestion Animation Modal */}
      {ingestionModal.isOpen && (
        <MacBookIngestionAnimation
          datasetName={ingestionModal.datasetName}
          rowCount={ingestionModal.rowCount}
          colCount={ingestionModal.colCount}
          fileName={ingestionModal.fileName}
          onComplete={handleAnimationComplete}
          onCancel={() => setIngestionModal((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Delete Confirmation Modal (SOLID, 100% NON-TRANSPARENT BACKGROUND) */}
      {deleteModal.isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-[#140F0C] p-6 shadow-2xl space-y-4 text-text-main">
            <div className="flex items-center gap-3 pb-3 border-b border-surface-border">
              <div className="p-2 rounded-xl bg-status-criticalBg text-status-critical border border-status-critical/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-main">Remove Dataset</h3>
                <p className="text-xs text-text-muted">Unmount dataset from active analytics memory</p>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Are you sure you want to remove <strong className="text-text-main">{deleteModal.datasetName}</strong>?
              This dataset will be removed from your active library and its analytical models will be unmounted.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, datasetId: "", datasetName: "" })}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-surface-border hover:bg-surface-subtle text-text-muted hover:text-text-main transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-status-critical text-white hover:bg-red-600 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Removal</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
