import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Search, Home, LayoutDashboard, Upload, MessageSquare, Compass, Sliders, GitFork, FileText, Database, Settings, Moon, Sun, Layers } from "lucide-react";
import { useThemeStore } from "@/hooks/useTheme";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { setTheme } = useThemeStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = [
    { label: "Home", category: "Navigation", icon: <Home className="w-4 h-4" />, action: () => navigate("/app/home") },
    { label: "Dashboard", category: "Navigation", icon: <LayoutDashboard className="w-4 h-4" />, action: () => navigate("/app/dashboard") },
    { label: "Upload Data", category: "Navigation", icon: <Upload className="w-4 h-4" />, action: () => navigate("/app/upload") },
    { label: "Ask BizLens", category: "Navigation", icon: <MessageSquare className="w-4 h-4" />, action: () => navigate("/app/ask") },
    { label: "Business Insights", category: "Navigation", icon: <Compass className="w-4 h-4" />, action: () => navigate("/app/insights") },
    { label: "What-If Analysis", category: "Navigation", icon: <Sliders className="w-4 h-4" />, action: () => navigate("/app/what-if") },
    { label: "Decision Support", category: "Navigation", icon: <GitFork className="w-4 h-4" />, action: () => navigate("/app/decisions") },
    { label: "Reports", category: "Navigation", icon: <FileText className="w-4 h-4" />, action: () => navigate("/app/reports") },
    { label: "Data Management", category: "Navigation", icon: <Database className="w-4 h-4" />, action: () => navigate("/app/data") },
    { label: "Settings", category: "Navigation", icon: <Settings className="w-4 h-4" />, action: () => navigate("/app/settings") },
    { label: "Switch to Dark Theme", category: "Theme", icon: <Moon className="w-4 h-4" />, action: () => setTheme("dark") },
    { label: "Switch to Light Theme", category: "Theme", icon: <Sun className="w-4 h-4" />, action: () => setTheme("light") },
    { label: "Switch to Hybrid Theme", category: "Theme", icon: <Layers className="w-4 h-4" />, action: () => setTheme("hybrid") },
  ];

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-xl rounded-2xl border border-surface-border bg-surface-main shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-border">
          <Search className="w-5 h-5 text-brand-orange shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command, page, or action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-text-main placeholder:text-text-muted outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-surface-subtle border border-surface-border text-[11px] text-text-muted">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">No matching commands found.</div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm text-text-main hover:bg-surface-subtle hover:text-brand-orange transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-text-muted group-hover:text-brand-orange">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className="text-[11px] text-text-muted px-2 py-0.5 rounded bg-surface-border/50">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
