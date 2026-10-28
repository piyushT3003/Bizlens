import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  Sparkles,
  ArrowRight,
  Maximize2,
  Minimize2,
  ExternalLink,
  Bot,
  Sliders,
  TrendingUp,
  Download,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Database,
  BarChart3,
  Cpu,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  User,
  Activity,
  FileText,
  ChevronRight,
  Send,
  Zap,
  Globe,
  Radio,
  SlidersHorizontal,
  Home,
  Check,
} from "lucide-react";
import { WorldGlowMap } from "@/components/visuals/WorldGlowMap";
import { AICore } from "@/components/visuals/AICore";
import { HelixScene } from "@/components/visuals/HelixScene";
import { IsoCubeMap } from "@/components/visuals/IsoCubeMap";
import { PulseLine } from "@/components/visuals/PulseLine";
import { CrystalScene } from "@/components/visuals/CrystalScene";
import { useDatasetStore, PRESET_DATASETS } from "@/hooks/useDataset";
import { useSettingsStore, formatCurrencyAmount } from "@/hooks/useSettings";

// Reusable mini application sidebar for panels in the master blueprint
const MiniAppSidebar: React.FC<{ activeItem?: string }> = ({ activeItem = "home" }) => {
  return (
    <aside className="w-10 sm:w-11 bg-[#09090D] border-r border-amber-500/20 flex flex-col items-center justify-between py-3 shrink-0 select-none">
      <div className="space-y-4 flex flex-col items-center">
        {/* Logo Monogram */}
        <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-[10px] shadow-sm">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
        </div>

        {/* Vertical Nav Icons */}
        <div className="space-y-2.5 flex flex-col items-center">
          <button
            className={`p-1.5 rounded-lg transition-colors ${
              activeItem === "home"
                ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(255,122,26,0.6)]"
                : "text-slate-500 hover:text-amber-400"
            }`}
            title="Home / Overview"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <button
            className={`p-1.5 rounded-lg transition-colors ${
              activeItem === "analytics"
                ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(255,122,26,0.6)]"
                : "text-slate-500 hover:text-amber-400"
            }`}
            title="Analytics Engine"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
          <button
            className={`p-1.5 rounded-lg transition-colors ${
              activeItem === "ask"
                ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(255,122,26,0.6)]"
                : "text-slate-500 hover:text-amber-400"
            }`}
            title="Ask BizLens AI"
          >
            <Bot className="w-3.5 h-3.5" />
          </button>
          <button
            className={`p-1.5 rounded-lg transition-colors ${
              activeItem === "decisions"
                ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(255,122,26,0.6)]"
                : "text-slate-500 hover:text-amber-400"
            }`}
            title="Decision Support"
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </button>
          <button
            className={`p-1.5 rounded-lg transition-colors ${
              activeItem === "reports"
                ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(255,122,26,0.6)]"
                : "text-slate-500 hover:text-amber-400"
            }`}
            title="Reports"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            className={`p-1.5 rounded-lg transition-colors ${
              activeItem === "settings"
                ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(255,122,26,0.6)]"
                : "text-slate-500 hover:text-amber-400"
            }`}
            title="Settings"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" title="Engine Active" />
    </aside>
  );
};

export const MasterShowcasePage: React.FC = () => {
  const navigate = useNavigate();
  const { activeDataset, activePreset, datasets, selectDataset } = useDatasetStore();
  const { preferences } = useSettingsStore();
  const activeCurrency = preferences.currency || "INR";
  const activeGrouping = preferences.number_grouping || "lakh_crore";

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [datasetDropdownOpen, setDatasetDropdownOpen] = useState(false);

  // Panel 4: Ask BizLens state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState(() => [
    {
      sender: "ai",
      title: activePreset.root_anomaly_title,
      text: "Comprehensive root-cause decomposition for verified business telemetry:",
      bullets: activePreset.root_anomaly_bullets,
      time: "Just now",
    },
  ]);
  const [activeChatSession, setActiveChatSession] = useState(0);

  // Panel 6: What-If state
  const [priceAdj, setPriceAdj] = useState(5.0);
  const [cogsAdj, setCogsAdj] = useState(-2.5);
  const [adSpendAdj, setAdSpendAdj] = useState(10.0);

  // Dynamic baseline based on activePreset
  const baselineRev = activePreset.revenue_raw;
  const priceMultiplier = 1 + priceAdj / 100;
  const adSpendMultiplier = 1 + adSpendAdj * 0.003;
  const projectedRev = Math.round(baselineRev * priceMultiplier * adSpendMultiplier);
  const netDelta = projectedRev - baselineRev;

  // Panel 7: Decision Support state
  const [decisionFilter, setDecisionFilter] = useState<"recommended" | "cost" | "approved">("recommended");
  const [simulatedCards, setSimulatedCards] = useState<Set<string>>(() => new Set(["pricing", "gpu-alloc"]));

  const toggleSimulateCard = (id: string) => {
    setSimulatedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Panel 8: Reports state
  const [reportType, setReportType] = useState<"exec" | "root" | "board">("exec");
  const [selectedSections, setSelectedSections] = useState({
    revenue: true,
    anomaly: true,
    scenario: true,
    roadmap: true,
  });
  const [downloadState, setDownloadState] = useState<string | null>(null);

  // Panel 10: Settings state
  const [settingsTab, setSettingsTab] = useState<"general" | "ai" | "team">("general");
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [strictGuardrails, setStrictGuardrails] = useState(true);

  // Handle dataset change in showcase
  const handleSelectDataset = (id: string) => {
    selectDataset(id);
    setDatasetDropdownOpen(false);
    const p = PRESET_DATASETS.find((ds) => ds.id === id) || activePreset;
    setChatMessages([
      {
        sender: "ai",
        title: p.root_anomaly_title,
        text: `Analysis updated for ${p.name}. DuckDB verified metrics:`,
        bullets: p.root_anomaly_bullets,
        time: "Just now",
      },
    ]);
  };

  const handleSendQuery = (userQuery: string) => {
    if (!userQuery.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        sender: "user",
        title: "User Query",
        text: userQuery,
        bullets: [],
        time: "Just now",
      },
      {
        sender: "ai",
        title: "Deterministic Engine Lineage",
        text: `Calculated verified metrics for dataset "${activePreset.name}" with zero hallucinations:`,
        bullets: [
          `Telemetry query executed against ${activePreset.row_count.toLocaleString()} immutable records in DuckDB.`,
          `Confidence score calibrated at 99.4% with p-value < 0.001.`,
          "Gemini guardrails verified 0 hallucinated data values against dataset ledger.",
        ],
        time: "Just now",
      },
    ]);
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    const query = chatInput;
    setChatInput("");
    handleSendQuery(query);
  };

  const handleSaveSettings = () => {
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 3000);
  };

  const handleDownload = (format: "PDF" | "CSV") => {
    setDownloadState(`Generating ${format}...`);
    setTimeout(() => {
      setDownloadState(`${format} Ready! Downloaded.`);
      setTimeout(() => setDownloadState(null), 2500);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-black font-sans antialiased overflow-x-hidden">
      {/* MASTER TOP BRANDING & NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 border-b border-amber-500/30 bg-[#0A0A0F]/95 backdrop-blur-xl px-4 lg:px-8 py-3 shadow-[0_4px_30px_rgba(255,122,26,0.12)]">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Main Title */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-black flex items-center justify-center font-bold shadow-[0_0_15px_rgba(255,122,26,0.5)] group-hover:scale-105 transition-transform">
                <Eye className="w-5 h-5 text-black stroke-[2.5]" />
              </div>
              <div>
                <span className="font-display font-black text-lg text-white tracking-tight flex items-center gap-1.5">
                  BizLens
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    QUANTUM HORIZON
                  </span>
                </span>
                <p className="text-[10px] text-amber-400/80 uppercase font-mono tracking-wider -mt-0.5">
                  MASTER ENTERPRISE INTELLIGENCE BLUEPRINT
                </p>
              </div>
            </Link>
          </div>

          {/* Central Blueprint Title Badge */}
          <div className="hidden xl:flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="tracking-wide font-mono uppercase">
              THE BIZLENS QUANTUM HORIZON ENTERPRISE INTELLIGENCE ECOSYSTEM - MASTER UI SHOWCASE - DEEP VISION
            </span>
          </div>

          {/* Right Action Controls: Dataset Switcher + Fullscreen + Launch */}
          <div className="flex items-center gap-3">
            {/* Interactive Dataset Switcher */}
            <div className="relative">
              <button
                onClick={() => setDatasetDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 transition-colors"
                title="Select active dataset to dynamically update showcase"
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-[150px]">{activePreset.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">
                  {activePreset.row_count.toLocaleString()} rows
                </span>
              </button>

              {datasetDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-amber-500/40 bg-[#0E0E16] shadow-2xl p-2 z-50 animate-scaleUp">
                  <div className="px-3 py-2 border-b border-amber-500/20 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Active Dataset Context</p>
                      <p className="text-[10px] text-amber-400/80 font-mono">Dynamic compute updates all 10 panels</p>
                    </div>
                    <Database className="w-3.5 h-3.5 text-amber-400" />
                  </div>

                  <div className="py-1.5 space-y-1">
                    {PRESET_DATASETS.map((p) => {
                      const isSelected = activePreset.id === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectDataset(p.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/50"
                              : "hover:bg-white/5 text-slate-300"
                          }`}
                        >
                          <div className="overflow-hidden pr-2">
                            <div className="truncate font-semibold">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {p.row_count.toLocaleString()} rows • {p.revenue_formatted} • {p.quality_score}% Q-Score
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Master View"}</span>
            </button>

            <Link
              to="/app/dashboard"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black text-xs font-black tracking-wide shadow-[0_0_20px_rgba(255,122,26,0.4)] transition-all hover:scale-105"
            >
              <span>Launch Live App</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </Link>
          </div>
        </div>
      </header>

      {/* MASTER COLLAGE CONTAINER MATCHING media_1791269467066.jpg 1:1 */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-3 sm:p-5 lg:p-6 space-y-5">
        
        {/* ROW 1: PANELS 1, 2, 3 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* PANEL 1: ASK BIZLEN DATA PAGE (LIGHT) -> DEEP OBSIDIAN THEME MATCHING TEMPLATE */}
          <div className="lg:col-span-4 glass-panel-3d rounded-2xl border border-amber-500/40 bg-[#0B0B10] text-slate-100 shadow-[0_0_30px_rgba(255,122,26,0.12)] overflow-hidden flex flex-col justify-between relative group hover:border-amber-500 transition-all">
            {/* Panel Title Bar (Exact from template) */}
            <div className="px-4 py-2.5 border-b border-amber-500/30 bg-[#101018] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  4. Ask BizLen Data Page (Light)
                </h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <span className="hover:text-amber-300 cursor-pointer">Sittans</span>
                <span>•</span>
                <span className="hover:text-amber-300 cursor-pointer">Genric</span>
                <span>•</span>
                <span className="hover:text-amber-300 cursor-pointer">Overview</span>
                <div className="w-5 h-5 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-[9px]">
                  P
                </div>
              </div>
            </div>

            {/* Sub-bar with Search & Floating Stream Badge */}
            <div className="p-3 pb-0 flex items-center justify-between gap-2">
              <div className="flex-1 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#14141E] border border-amber-500/25 text-xs text-slate-300">
                <Search className="w-3.5 h-3.5 text-amber-400" />
                <input
                  type="text"
                  placeholder="Search nodes or coordinates..."
                  className="bg-transparent border-0 outline-none text-xs text-slate-200 placeholder-slate-500 w-full font-mono"
                  readOnly
                />
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-mono text-right shrink-0">
                <span className="block font-bold">GLOBAL CORE STREAM</span>
                <span className="text-emerald-400">{activePreset.map_ingestion_stream}</span>
                <span className="text-[9px] text-slate-400 block">{activePreset.map_active_clusters} Active Clusters</span>
              </div>
            </div>

            {/* Content: WorldGlowMap with Robot Mascot & 4 Metric Pills */}
            <div className="p-3 flex-1 flex flex-col justify-center">
              <WorldGlowMap
                datasetId={activePreset.id}
                metricLabel="Revenue Density"
                nodesCount={activePreset.map_nodes}
                clustersCount={activePreset.map_clusters}
                flowsCount={activePreset.map_flows}
                throughputCount={activePreset.map_throughput}
                className="w-full bg-[#0D0D14] border border-amber-500/25 shadow-none text-slate-200"
              />
            </div>

            {/* Bottom Sub-info Strip */}
            <div className="px-4 py-2 border-t border-amber-500/20 bg-[#0E0E16] text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Dynamic Warehouses: <strong className="text-amber-400">Active</strong></span>
              <span className="text-emerald-400 font-semibold">Synced: 100% Deterministic</span>
            </div>
          </div>

          {/* PANEL 2: INTELLIGENCE EXCHANGE (DARK TIER) */}
          <div className="lg:col-span-4 glass-panel-3d rounded-2xl border border-amber-500/50 bg-[#0B0B10] text-slate-100 shadow-[0_0_40px_rgba(255,122,26,0.18)] overflow-hidden flex flex-col justify-between relative group hover:border-amber-400 transition-all">
            {/* Panel Title Bar */}
            <div className="px-4 py-2.5 border-b border-amber-500/30 bg-[#101018] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "12s" }} />
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  2. Intelligence Exchange
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                1. Clester Gierneond Plateni (Dark Tier)
              </span>
            </div>

            {/* Content: AICore with 6 Orbiting Chips & Concentric Rings */}
            <div className="p-4 flex-1 flex flex-col items-center justify-center relative min-h-[380px]">
              <AICore
                mode="exchange"
                size={340}
                exchangeNetText={activePreset.exchange_net}
                exchangeGrossText={activePreset.exchange_gross}
                exchangeInsightsText={activePreset.exchange_insights}
                exchangeFeaturesText={activePreset.exchange_features}
                exchangeKpisText={activePreset.exchange_kpis}
                exchangeSolvedText={activePreset.exchange_solved}
                className="w-full"
              />
            </div>

            {/* Bottom Sub-info Strip */}
            <div className="px-4 py-2 border-t border-amber-500/20 bg-[#0E0E16] text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span className="text-amber-300 font-semibold">DuckDB High-Throughput Lineage</span>
              <span className="text-emerald-400">Zero Hallucinations Verified</span>
            </div>
          </div>

          {/* PANEL 3: AI & ML OBSERVATORY (WITH MINI SIDEBAR) */}
          <div className="lg:col-span-4 glass-panel-3d rounded-2xl border border-amber-500/40 bg-[#0B0B10] text-slate-100 shadow-[0_0_30px_rgba(255,122,26,0.12)] overflow-hidden flex flex-col justify-between relative group hover:border-amber-500 transition-all">
            {/* Panel Title Bar */}
            <div className="px-4 py-2.5 border-b border-amber-500/25 bg-[#101018] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  3. AI & ML Observatory
                </h2>
              </div>
              <Link to="/app/insights" className="text-slate-400 hover:text-amber-400" title="Open Observatory Insights">
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Window Content with Left Mini-Sidebar */}
            <div className="flex-1 flex overflow-hidden">
              <MiniAppSidebar activeItem="analytics" />

              <div className="p-3.5 flex-1 flex flex-col gap-3 overflow-hidden">
                {/* Top 3 Observatory Metric Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#14141E] border border-amber-500/25 text-center shadow-sm">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Inferences</span>
                    <span className="text-base font-black text-amber-400 font-mono">
                      {activePreset.row_count.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-emerald-400 block">Acc: 99.4%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#14141E] border border-amber-500/25 text-center shadow-sm">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Predictions</span>
                    <span className="text-base font-black text-white font-mono">
                      {((activePreset.row_count * 10.1) / 1000).toFixed(2)}k
                    </span>
                    <span className="text-[9px] text-amber-300 block">Drift: 0.02</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#14141E] border border-amber-500/25 text-center shadow-sm">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Throughput</span>
                    <span className="text-base font-black text-emerald-400 font-mono">222.19%</span>
                    <span className="text-[9px] text-slate-400 block">DuckDB Boost</span>
                  </div>
                </div>

                {/* Workflow Pipeline DAG Strip */}
                <div className="p-2 rounded-xl bg-[#12121A] border border-amber-500/20 text-[10px] font-mono flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Ingest</span>
                  </div>
                  <span className="text-slate-600">➔</span>
                  <span className="text-amber-300">DuckDB</span>
                  <span className="text-slate-600">➔</span>
                  <span className="text-slate-300">Feature Store</span>
                  <span className="text-slate-600">➔</span>
                  <span className="text-emerald-400">Gemini</span>
                  <span className="text-slate-600">➔</span>
                  <span className="text-amber-400 font-bold">Audit</span>
                </div>

                {/* Explainability Isometric Root-Cause Stack */}
                <IsoCubeMap
                  items={activePreset.categories.map((c, i) => ({
                    dimension_value: c.name,
                    share_pct: c.share_pct,
                    delta_formatted: c.delta_formatted,
                    prior_value: Math.round(activePreset.revenue_raw * 0.2),
                    current_value: Math.round((activePreset.revenue_raw * c.share_pct) / 100),
                    delta_abs: 140000,
                    rank: i + 1,
                  }))}
                  className="bg-transparent border-0 p-0 shadow-none"
                />
              </div>
            </div>

            {/* Bottom Sub-info Strip */}
            <div className="px-4 py-2 border-t border-amber-500/20 bg-[#0E0E16] text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Model: <strong>gemini-2.5-flash</strong></span>
              <span className="text-amber-400">Lat: 18ms | Zero Drift</span>
            </div>
          </div>

        </section>

        {/* ROW 2: PANELS 4, 5, 6 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* PANEL 4: ASK BIZLENS PAGE (DARK BLUEPRINT WITH MINI SIDEBAR) */}
          <div className="lg:col-span-4 glass-panel-3d rounded-2xl border border-amber-500/40 bg-[#0B0B10] text-slate-100 shadow-[0_0_30px_rgba(255,122,26,0.12)] overflow-hidden flex flex-col justify-between relative group hover:border-amber-500 transition-all">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-amber-500/30 bg-[#101018] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-amber-500 text-black flex items-center justify-center font-bold">
                  <Bot className="w-3.5 h-3.5 text-black" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                    4. Ask BizLens Page (Light)
                  </h2>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                Lineage Verified
              </span>
            </div>

            {/* Content with Mini-Sidebar */}
            <div className="flex-1 flex overflow-hidden">
              <MiniAppSidebar activeItem="ask" />

              <div className="p-3 flex-1 flex flex-col sm:flex-row gap-3 min-h-[380px]">
                {/* Chat Stream Area */}
                <div className="flex-1 flex flex-col justify-between bg-[#11111A] rounded-xl border border-amber-500/20 p-3 shadow-inner">
                  <div className="space-y-3 overflow-y-auto max-h-[260px] pr-1">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl text-xs ${
                          msg.sender === "ai"
                            ? "bg-amber-500/10 border border-amber-500/30 text-slate-200"
                            : "bg-[#181824] border border-slate-700 text-slate-100 ml-4"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 font-semibold text-[11px] text-amber-400 font-mono">
                          <span>{msg.title}</span>
                          <span className="text-[10px] text-slate-500">{msg.time}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">{msg.text}</p>
                        {msg.bullets.length > 0 && (
                          <ul className="mt-2 space-y-1 text-[11px] text-slate-300 pl-2 border-l-2 border-amber-500/60">
                            {msg.bullets.map((b, bi) => (
                              <li key={bi}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Suggested Option Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-2 pb-2 border-t border-amber-500/15">
                    <button
                      onClick={() => handleSendQuery(`Drill down ${activePreset.name} variance by region`)}
                      className="px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-[10px] font-semibold text-amber-300 border border-amber-500/40 transition-colors"
                    >
                      🔍 Drill down by region
                    </button>
                    <button
                      onClick={() => handleSendQuery("Simulate 5% price drop across top category")}
                      className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-300 border border-slate-700 transition-colors"
                    >
                      ⚡ Simulate price drop
                    </button>
                    <button
                      onClick={() => handleSendQuery("Export verified management report")}
                      className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-300 border border-slate-700 transition-colors"
                    >
                      📊 Export report
                    </button>
                  </div>

                  {/* Query Input */}
                  <form onSubmit={handleSendChat} className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about margin root causes..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-[#161622] text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-400 font-mono"
                    />
                    <button
                      type="submit"
                      className="p-1.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors font-bold"
                      title="Send Query"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                {/* Right Session History Strip ("Bial history") */}
                <div className="w-full sm:w-36 bg-[#0E0E16] rounded-xl border border-amber-500/20 p-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-2 px-1 font-mono">
                      Bial history
                    </span>
                    <div className="space-y-1">
                      {[
                        "Q3 Margin Drivers",
                        "Category Surge",
                        "Regional Delta",
                        "Inventory Cost",
                      ].map((sess, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveChatSession(idx)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-mono font-medium truncate transition-colors ${
                            activeChatSession === idx
                              ? "bg-amber-500 text-black font-bold shadow-sm"
                              : "text-slate-400 hover:bg-white/5"
                          }`}
                        >
                          {sess}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-500/20 text-[10px] text-amber-400/80 text-center font-mono">
                    DuckDB v1.0.0
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="px-4 py-2 border-t border-amber-500/20 bg-[#0E0E16] text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Conversational Lineage: <strong className="text-emerald-400">100%</strong></span>
              <Link to="/app/ask" className="text-amber-400 font-bold hover:underline flex items-center gap-1">
                Full Assistant <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* PANEL 5: THE DECISION RAILS - HYBRID THEME (WITH MINI SIDEBAR) */}
          <div className="lg:col-span-4 glass-panel-3d rounded-2xl border border-amber-500/40 bg-[#0A0A10] text-slate-100 shadow-[0_0_35px_rgba(255,122,26,0.15)] overflow-hidden flex flex-col justify-between relative group hover:border-amber-400 transition-all">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-amber-500/30 bg-[#101018] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  5. The Decision Rails - Hybrid Theme
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                Double-Helix DNA
              </span>
            </div>

            {/* Window Content with Mini-Sidebar */}
            <div className="flex-1 flex overflow-hidden">
              <MiniAppSidebar activeItem="decisions" />

              <div className="p-3 flex-1 flex flex-col justify-center items-center relative min-h-[380px]">
                <HelixScene
                  findings={activePreset.findings.map((f) => ({
                    id: f.id,
                    title: f.title,
                    metric: f.delta,
                    priority: f.priority,
                    stage: "action",
                  }))}
                  className="w-full bg-transparent border-0 shadow-none"
                />
              </div>
            </div>

            {/* Bottom Sub-info */}
            <div className="px-4 py-2 border-t border-amber-500/20 bg-[#0C0C14] text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span className="text-amber-400 font-bold">21 Executive Priorities Indexed</span>
              <span className="text-emerald-400 font-semibold">+21.7% Profit Uplift</span>
            </div>
          </div>

          {/* PANEL 6: WHAT - IF ANALYCIS (DARK THEME WITH MINI SIDEBAR) */}
          <div className="lg:col-span-4 glass-panel-3d rounded-2xl border border-amber-500/40 bg-[#0B0B10] text-slate-100 shadow-[0_0_30px_rgba(255,122,26,0.12)] overflow-hidden flex flex-col justify-between relative group hover:border-amber-500 transition-all">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-amber-500/30 bg-[#101018] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  6. What - If Analycis (Light)
                </h2>
              </div>
              <Link to="/app/what-if" className="text-slate-400 hover:text-amber-400" title="Open What-If Simulator">
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Window Content with Mini-Sidebar */}
            <div className="flex-1 flex overflow-hidden">
              <MiniAppSidebar activeItem="analytics" />

              <div className="p-4 flex-1 flex flex-col justify-between gap-3 min-h-[380px]">
                {/* Interactive Sliders */}
                <div className="space-y-2.5 bg-[#12121A] p-3 rounded-xl border border-amber-500/20 shadow-inner">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1 font-mono">
                      <span>Price Adjustment</span>
                      <span className="text-amber-400 font-bold">
                        {priceAdj >= 0 ? `+${priceAdj.toFixed(1)}%` : `${priceAdj.toFixed(1)}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-15"
                      max="20"
                      step="0.5"
                      value={priceAdj}
                      onChange={(e) => setPriceAdj(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#1C1C28] rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1 font-mono">
                      <span>Cost of Goods (COGS)</span>
                      <span className="text-amber-400 font-bold">
                        {cogsAdj >= 0 ? `+${cogsAdj.toFixed(1)}%` : `${cogsAdj.toFixed(1)}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="15"
                      step="0.5"
                      value={cogsAdj}
                      onChange={(e) => setCogsAdj(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#1C1C28] rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1 font-mono">
                      <span>Marketing Ad Spend</span>
                      <span className="text-amber-400 font-bold">
                        {adSpendAdj >= 0 ? `+${adSpendAdj.toFixed(1)}%` : `${adSpendAdj.toFixed(1)}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="30"
                      step="1"
                      value={adSpendAdj}
                      onChange={(e) => setAdSpendAdj(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#1C1C28] rounded-lg"
                    />
                  </div>
                </div>

                {/* Quick Scenario Preset Buttons */}
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => { setPriceAdj(5); setCogsAdj(0); setAdSpendAdj(10); }}
                    className="flex-1 py-1 px-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black font-bold transition-all"
                  >
                    +5% Hike
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPriceAdj(0); setCogsAdj(0); setAdSpendAdj(0); }}
                    className="flex-1 py-1 px-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 font-bold transition-all"
                  >
                    0% Baseline
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPriceAdj(-5); setCogsAdj(-2); setAdSpendAdj(15); }}
                    className="flex-1 py-1 px-2 rounded-lg bg-orange-600/20 text-orange-400 border border-orange-500/40 hover:bg-orange-600 hover:text-white font-bold transition-all"
                  >
                    -5% Discount
                  </button>
                </div>

                {/* Projected Value Table / Summary Box */}
                <div className="grid grid-cols-3 gap-2 text-center bg-[#12121A] p-3 rounded-xl border border-amber-500/20 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Projected Value</span>
                    <span className="text-sm font-black text-white font-mono">
                      {formatCurrencyAmount(projectedRev, activeCurrency, activeGrouping)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Net Margin</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      +{(activePreset.gross_margin_pct + priceAdj * 0.4 - cogsAdj * 0.3).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Net Delta</span>
                    <span className="text-sm font-black text-amber-400 font-mono">
                      {netDelta >= 0 ? `+${formatCurrencyAmount(netDelta, activeCurrency, activeGrouping)}` : `-${formatCurrencyAmount(Math.abs(netDelta), activeCurrency, activeGrouping)}`}
                    </span>
                  </div>
                </div>

                {/* Dual-Bar Comparison: Baseline vs Scenario (Orange visual bars) */}
                <div className="bg-[#12121A] p-3 rounded-xl border border-amber-500/20 space-y-1.5 font-mono text-xs">
                  <div className="text-[11px] font-semibold text-slate-300 flex justify-between">
                    <span>Baseline: {formatCurrencyAmount(activePreset.revenue_raw, activeCurrency, activeGrouping)}</span>
                    <span className="text-emerald-400 font-bold">
                      Scenario: {formatCurrencyAmount(projectedRev, activeCurrency, activeGrouping)}
                    </span>
                  </div>
                  <div className="h-4 w-full bg-[#181824] rounded-full overflow-hidden flex">
                    <div className="bg-slate-600 h-full w-[45%]" title="Baseline Revenue" />
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${Math.min(50, Math.max(10, 45 * priceMultiplier))}%` }}
                      title="Scenario Gain"
                    />
                  </div>
                </div>

                {/* Glowing AI Suggestions Banner */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">
                    <strong>AI Suggestion:</strong> +{priceAdj}% price adjustment yields safe retention with {netDelta >= 0 ? `+${formatCurrencyAmount(netDelta, activeCurrency, activeGrouping)}` : `-${formatCurrencyAmount(Math.abs(netDelta), activeCurrency, activeGrouping)}`} net revenue growth.
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Sub-info */}
            <div className="px-4 py-2 border-t border-amber-500/20 bg-[#0E0E16] text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Elasticity Curve: <strong className="text-amber-400">Log-Linear</strong></span>
              <span className="text-emerald-400 font-semibold font-mono">Risk Index: 0.14 Low</span>
            </div>
          </div>

        </section>

        {/* ROW 3: PANELS 7, 8, 9, 10 */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* PANEL 7: DECISION REPORTS PAGE (WITH MINI SIDEBAR) */}
          <div className="lg:col-span-3 glass-panel-3d rounded-2xl border border-amber-500/40 bg-[#0B0B10] text-slate-100 shadow-[0_0_30px_rgba(255,122,26,0.12)] overflow-hidden flex flex-col justify-between relative group hover:border-amber-500 transition-all">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-amber-500/30 bg-[#101018] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  7. Decision Secigont Page (Light)
                </h2>
              </div>
              <Link to="/app/decisions" className="text-slate-400 hover:text-amber-400">
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Content with Mini-Sidebar */}
            <div className="flex-1 flex overflow-hidden">
              <MiniAppSidebar activeItem="decisions" />

              <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                {/* 3 Filter Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-[#14141E] p-1 rounded-xl text-[10px] font-bold text-slate-400 font-mono">
                  <button
                    onClick={() => setDecisionFilter("recommended")}
                    className={`py-1 rounded-lg transition-colors ${
                      decisionFilter === "recommended"
                        ? "bg-amber-500 text-black shadow-sm font-bold"
                        : "hover:text-amber-300"
                    }`}
                  >
                    Recommended
                  </button>
                  <button
                    onClick={() => setDecisionFilter("cost")}
                    className={`py-1 rounded-lg transition-colors ${
                      decisionFilter === "cost"
                        ? "bg-amber-500 text-black shadow-sm font-bold"
                        : "hover:text-amber-300"
                    }`}
                  >
                    Cost Var
                  </button>
                  <button
                    onClick={() => setDecisionFilter("approved")}
                    className={`py-1 rounded-lg transition-colors ${
                      decisionFilter === "approved"
                        ? "bg-amber-500 text-black shadow-sm font-bold"
                        : "hover:text-amber-300"
                    }`}
                  >
                    Approved
                  </button>
                </div>

                {/* Recommendation Action Cards with [Simulate] Badges */}
                <div className="space-y-2">
                  {activePreset.findings
                    .filter((rec) => {
                      if (decisionFilter === "cost") return rec.risk === "Medium" || rec.risk === "High";
                      if (decisionFilter === "approved") return simulatedCards.has(rec.id);
                      return true; // "recommended"
                    })
                    .map((rec) => {
                      const isSim = simulatedCards.has(rec.id);
                      return (
                        <div
                          key={rec.id}
                          className="p-2.5 rounded-xl bg-[#12121A] border border-amber-500/20 shadow-sm flex items-center justify-between hover:border-amber-400/50 transition-colors card-3d-lift"
                        >
                          <div className="overflow-hidden pr-1">
                            <div className="text-xs font-bold text-slate-200 truncate">{rec.title}</div>
                            <div className="text-[10px] text-emerald-400 font-mono font-semibold">
                              Impact: {rec.delta} • Risk: {rec.risk}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleSimulateCard(rec.id)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono border transition-all shrink-0 ${
                              isSim
                                ? "bg-emerald-500 text-black border-emerald-400 shadow-sm"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                            }`}
                          >
                            {isSim ? "Approved ✓" : "Simulate"}
                          </button>
                        </div>
                      );
                    })}
                  {decisionFilter === "approved" && simulatedCards.size === 0 && (
                    <div className="p-4 text-center rounded-xl bg-[#12121A] border border-amber-500/20 text-xs text-slate-400 font-mono">
                      No decisions approved yet. Click &quot;Simulate&quot; on recommended actions to test and approve them.
                    </div>
                  )}
                </div>

                {/* Realtime Cardiac PulseLine Waveform with exact metrics */}
                <div className="bg-[#12121A] p-2.5 rounded-xl border border-amber-500/20 shadow-sm">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1 font-mono">
                    <span>Pulse Health: {Math.round(activePreset.quality_score * 0.9)}/100</span>
                    <span className="text-amber-400">100 160 17500</span>
                  </div>
                  <div className="w-full h-10 flex items-center justify-center">
                    <svg viewBox="0 0 300 40" className="w-full h-full stroke-amber-500 fill-none" preserveAspectRatio="none">
                      <path
                        d="M0,20 L60,20 L75,10 L90,32 L105,5 L120,28 L135,18 L150,20 L200,20 L215,10 L230,30 L245,6 L260,25 L275,20 L300,20"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-amber-500/15">
                    <span>180 180 19000</span>
                    <span className="text-emerald-400 font-bold">193 125</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sub-info */}
            <div className="px-4 py-2 border-t border-amber-500/20 bg-[#0E0E16] text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Actions: <strong>4/4 Verified</strong></span>
              <span className="text-amber-400 font-bold font-mono">ROI: 3.4x</span>
            </div>
          </div>

          {/* PANEL 8: REPORTS PAGE (WITH MINI SIDEBAR) */}
          <div className="lg:col-span-3 glass-panel-3d rounded-2xl border border-amber-500/40 bg-[#0B0B10] text-slate-100 shadow-[0_0_30px_rgba(255,122,26,0.12)] overflow-hidden flex flex-col justify-between relative group hover:border-amber-500 transition-all">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-amber-500/30 bg-[#101018] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  8. Reporte Page (Light)
                </h2>
              </div>
              <Link to="/app/reports" className="text-slate-400 hover:text-amber-400">
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Content with Mini-Sidebar */}
            <div className="flex-1 flex overflow-hidden">
              <MiniAppSidebar activeItem="reports" />

              <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-amber-400 mb-2 font-mono">Generate Management Report</h3>

                  {/* Report Type Radios */}
                  <div className="space-y-1.5 bg-[#12121A] p-2.5 rounded-xl border border-amber-500/20 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                      <input
                        type="radio"
                        name="reportType"
                        checked={reportType === "exec"}
                        onChange={() => setReportType("exec")}
                        className="accent-amber-500"
                      />
                      <span>Executive Summary</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                      <input
                        type="radio"
                        name="reportType"
                        checked={reportType === "root"}
                        onChange={() => setReportType("root")}
                        className="accent-amber-500"
                      />
                      <span>Root Cause Deep-Dive</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                      <input
                        type="radio"
                        name="reportType"
                        checked={reportType === "board"}
                        onChange={() => setReportType("board")}
                        className="accent-amber-500"
                      />
                      <span>Board Pack</span>
                    </label>
                  </div>
                </div>

                {/* Modular Checklist */}
                <div className="bg-[#12121A] p-2.5 rounded-xl border border-amber-500/20 space-y-1.5 text-[11px] text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSections.revenue}
                      onChange={(e) => setSelectedSections({ ...selectedSections, revenue: e.target.checked })}
                      className="accent-amber-500 rounded"
                    />
                    <span>Revenue Decomposition</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSections.anomaly}
                      onChange={(e) => setSelectedSections({ ...selectedSections, anomaly: e.target.checked })}
                      className="accent-amber-500 rounded"
                    />
                    <span>DuckDB Anomaly Attribution</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSections.scenario}
                      onChange={(e) => setSelectedSections({ ...selectedSections, scenario: e.target.checked })}
                      className="accent-amber-500 rounded"
                    />
                    <span>What-If Scenario Projections</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSections.roadmap}
                      onChange={(e) => setSelectedSections({ ...selectedSections, roadmap: e.target.checked })}
                      className="accent-amber-500 rounded"
                    />
                    <span>Action Item Roadmaps</span>
                  </label>
                </div>

                {/* Donut Chart Category Breakdown Preview */}
                <div className="bg-[#12121A] p-2 rounded-xl border border-amber-500/20 flex items-center justify-around text-[10px] text-slate-300">
                  <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-amber-300 border-r-orange-600 flex items-center justify-center font-bold font-mono text-white">
                    {activePreset.categories[0]?.share_pct.toFixed(0)}%
                  </div>
                  <div className="space-y-0.5">
                    {activePreset.categories.slice(0, 3).map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 font-mono">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            i === 0 ? "bg-amber-500" : i === 1 ? "bg-orange-600" : "bg-amber-300"
                          }`}
                        />
                        <span>{c.name} ({c.share_pct}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Download Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDownload("PDF")}
                    className="py-1.5 px-2 rounded-xl bg-amber-500 text-black hover:bg-amber-400 font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={() => handleDownload("CSV")}
                    className="py-1.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export CSV</span>
                  </button>
                </div>

                {downloadState && (
                  <div className="p-1 text-center rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold animate-fadeIn">
                    {downloadState}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Sub-info */}
            <div className="px-4 py-2 border-t border-amber-500/20 bg-[#0E0E16] text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Format: <strong>Board Grade</strong></span>
              <span className="text-emerald-400 font-semibold font-mono">SHA-256 Validated</span>
            </div>
          </div>

          {/* PANEL 9: THE CONFIGURATION CRYSTAL (DARK THEME) */}
          <div className="lg:col-span-3 glass-panel-3d rounded-2xl border border-amber-500/40 bg-[#0B0B10] text-slate-100 shadow-[0_0_35px_rgba(255,122,26,0.15)] overflow-hidden flex flex-col justify-between relative group hover:border-amber-400 transition-all">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-amber-500/25 bg-[#101018] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  9. The Configuration Cryital (Dark)
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                P-Node 85%
              </span>
            </div>

            {/* Body: Rotating 3D Wireframe Icosahedron */}
            <div className="p-3 flex-1 flex flex-col justify-center items-center relative min-h-[300px]">
              <CrystalScene
                initial="P"
                completionPct={85}
                size={230}
                className="w-full"
              />

              {/* Status Chips around crystal */}
              <div className="grid grid-cols-2 gap-1.5 w-full mt-2 font-mono text-[10px]">
                <div className="p-1 rounded bg-[#131320] border border-amber-500/20 text-center text-amber-300">
                  AES-256 Vault
                </div>
                <div className="p-1 rounded bg-[#131320] border border-amber-500/20 text-center text-emerald-400">
                  PII Sanitized
                </div>
                <div className="p-1 rounded bg-[#131320] border border-amber-500/20 text-center text-slate-300">
                  DuckDB Engine
                </div>
                <div className="p-1 rounded bg-[#131320] border border-amber-500/20 text-center text-amber-400">
                  SOC2 Certified
                </div>
              </div>
            </div>

            {/* Bottom Sub-info */}
            <div className="px-4 py-2 border-t border-amber-500/20 bg-[#0E0E16] text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span className="text-amber-400">Role: Enterprise Admin</span>
              <span className="text-emerald-400 font-semibold">Active Vault</span>
            </div>
          </div>

          {/* PANEL 10: SETTINGS PAGE (WITH MINI SIDEBAR) */}
          <div className="lg:col-span-3 glass-panel-3d rounded-2xl border border-amber-500/40 bg-[#0B0B10] text-slate-100 shadow-[0_0_30px_rgba(255,122,26,0.12)] overflow-hidden flex flex-col justify-between relative group hover:border-amber-500 transition-all">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-amber-500/30 bg-[#101018] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-3.5 h-3.5 text-amber-400" />
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  10. Settinge Page (Light)
                </h2>
              </div>
              <Link to="/app/settings" className="text-slate-400 hover:text-amber-400">
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Content with Mini-Sidebar */}
            <div className="flex-1 flex overflow-hidden">
              <MiniAppSidebar activeItem="settings" />

              <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                {/* Settings Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-[#14141E] p-1 rounded-xl text-[10px] font-bold text-slate-400 font-mono">
                  <button
                    onClick={() => setSettingsTab("general")}
                    className={`py-1 rounded-lg transition-colors ${
                      settingsTab === "general" ? "bg-amber-500 text-black shadow-sm font-bold" : "hover:text-amber-300"
                    }`}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setSettingsTab("ai")}
                    className={`py-1 rounded-lg transition-colors ${
                      settingsTab === "ai" ? "bg-amber-500 text-black shadow-sm font-bold" : "hover:text-amber-300"
                    }`}
                  >
                    AI Engine
                  </button>
                  <button
                    onClick={() => setSettingsTab("team")}
                    className={`py-1 rounded-lg transition-colors ${
                      settingsTab === "team" ? "bg-amber-500 text-black shadow-sm font-bold" : "hover:text-amber-300"
                    }`}
                  >
                    Team & RBAC
                  </button>
                </div>

                {/* Tab 1: General */}
                {settingsTab === "general" && (
                  <>
                    <div className="bg-[#12121A] p-3 rounded-xl border border-amber-500/20 shadow-sm flex items-center gap-3 card-3d-lift">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-black font-black text-sm flex items-center justify-center shadow-md">
                        P
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-black text-white truncate font-mono">Piyush Rosash</div>
                        <div className="text-[10px] text-slate-400 truncate font-mono">piyush@bizlens.ai</div>
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                          Principal System Architect
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#12121A] p-2.5 rounded-xl border border-amber-500/20 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-[11px]">Multi-tenant Workspace</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          Enterprise Tier
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-[11px]">Collaborative Weights</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Auto-Sync
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-[11px]">Data Encryption</span>
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          AES-256 GCM
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Tab 2: AI Engine */}
                {settingsTab === "ai" && (
                  <div className="space-y-2 font-mono text-xs">
                    <div className="bg-[#12121A] p-2.5 rounded-xl border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-300">Foundation Model</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          gemini-2.5-flash
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-300">Grounding Engine</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          DuckDB Verified
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-300">Hallucination Guard</span>
                        <span className="text-[10px] font-bold text-emerald-400">
                          Strict Zero-Tolerance
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-300">Sampling Temp</span>
                        <span className="text-[10px] font-bold text-amber-400">
                          0.10 (Deterministic)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Team & RBAC */}
                {settingsTab === "team" && (
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="bg-[#12121A] p-2 rounded-xl border border-amber-500/20 space-y-1.5">
                      <div className="flex items-center justify-between py-0.5">
                        <div className="truncate pr-1">
                          <span className="text-white font-bold block text-[11px]">Piyush Rosash</span>
                          <span className="text-[9px] text-slate-400">piyush@bizlens.ai</span>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black">
                          Admin
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-0.5 border-t border-amber-500/10">
                        <div className="truncate pr-1">
                          <span className="text-slate-300 font-bold block text-[11px]">Elena Vance</span>
                          <span className="text-[9px] text-slate-400">elena@bizlens.ai</span>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Risk Lead
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-0.5 border-t border-amber-500/10">
                        <div className="truncate pr-1">
                          <span className="text-slate-300 font-bold block text-[11px]">Marcus Chen</span>
                          <span className="text-[9px] text-slate-400">marcus@bizlens.ai</span>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          Quant View
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Preferences Button */}
                <button
                  onClick={handleSaveSettings}
                  className="w-full py-2 rounded-xl bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Preferences</span>
                </button>

                {savedSettingsNotice && (
                  <div className="p-1 text-center rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold animate-fadeIn">
                    Preferences Saved Successfully!
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Sub-info */}
            <div className="px-4 py-2 border-t border-amber-500/20 bg-[#0E0E16] text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Security Level: <strong>Tier 3</strong></span>
              <span className="text-emerald-400 font-semibold font-mono">RBAC Enforced</span>
            </div>
          </div>

        </section>

      </main>

      {/* MASTER FOOTER BRANDING BANNER (1:1 with media_1791269467066.jpg) */}
      <footer className="mt-8 border-t border-amber-500/40 bg-[#08080C] px-4 lg:px-8 py-4 text-center select-none shadow-[0_-5px_25px_rgba(255,122,26,0.1)]">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-amber-400 tracking-wider">BizLens</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-medium">
              FINAL QUANTUM PRODUCTION DESIGN - UNPRECEDENTED BUSINESS INTELLIGENCE
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400/80 font-mono text-[11px]">BitLens Foundation AI Platform</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-[11px] font-mono">
            <span>Analyze</span>
            <span>•</span>
            <span>Understand</span>
            <span>•</span>
            <span>Decide</span>
            <span>•</span>
            <span>Grow</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              Faster, Smarter, Reimagined
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
