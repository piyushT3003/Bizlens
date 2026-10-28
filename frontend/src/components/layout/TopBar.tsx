import React, { useState, useRef, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Search, Bell, Menu, User as UserIcon, Moon, Sun, Layers, LogOut, Sparkles, Check, Plus, Database } from "lucide-react";
import { DatasetVersionPill } from "@/components/ui/DatasetVersionPill";
import { useThemeStore } from "@/hooks/useTheme";
import { useDatasetStore } from "@/hooks/useDataset";
import { useSettingsStore } from "@/hooks/useSettings";

export interface TopBarProps {
  onOpenCommandPalette: () => void;
  onOpenMobileMenu: () => void;
  className?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenCommandPalette,
  onOpenMobileMenu,
  className,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const { activeDataset, datasets, selectDataset } = useDatasetStore();
  const { settings } = useSettingsStore();
  const rawName = settings.profile.display_name;
  const displayName = rawName && !rawName.includes("Alexander") && !rawName.includes("Offline")
    ? rawName
    : "Piyush Toddale";
  const firstName = displayName.split(" ")[0] || "Piyush";
  const initialLetter = displayName.charAt(0).toUpperCase() || "P";
  const userEmail = settings.profile.email || "piyush@bizlens.ai";
  const [profileOpen, setProfileOpen] = useState(false);
  const [datasetDropdownOpen, setDatasetDropdownOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);

  const datasetDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (datasetDropdownRef.current && !datasetDropdownRef.current.contains(target)) {
        setDatasetDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDatasetDropdownOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleDatasetDropdown = () => {
    setDatasetDropdownOpen((prev) => {
      if (!prev) setProfileOpen(false);
      return !prev;
    });
  };

  const toggleProfile = () => {
    setProfileOpen((prev) => {
      if (!prev) setDatasetDropdownOpen(false);
      return !prev;
    });
  };


  // Generate breadcrumb segments from pathname
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const pageTitle = pathSegments.length > 1
    ? pathSegments[1].charAt(0).toUpperCase() + pathSegments[1].slice(1).replace("-", " ")
    : "Home";

  return (
    <header
      className={cn(
        "h-16 px-4 lg:px-6 flex items-center justify-between border-b border-surface-border bg-surface-main/80 backdrop-blur-2xl glass-panel sticky top-0 z-50 select-none",
        className
      )}
    >
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl border border-surface-border hover:bg-surface-subtle text-text-main"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Link to="/app/home" className="hover:text-text-main">App</Link>
            <span>/</span>
            <span className="text-brand-orange font-medium">{pageTitle}</span>
          </div>
          <h1 className="text-base font-bold text-text-main tracking-tight leading-none mt-0.5">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right: Quick Search, Dataset Pill, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Master Showcase Shortcut */}
        <Link
          to="/showcase"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-brand-orange/30 bg-brand-orange/10 hover:bg-brand-orange/20 text-xs font-semibold text-brand-orange transition-all micro-press hover-glow-ambient"
          title="Master UI Showcase Blueprint"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Showcase</span>
        </Link>

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-surface-border bg-surface-card hover:bg-surface-subtle text-xs text-text-muted transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-orange micro-press"
        >
          <Search className="w-3.5 h-3.5 text-brand-orange" />
          <span>Search or command...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-surface-border/50 border border-surface-border text-[10px] font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Dataset Pill & Dropdown Switcher */}
        <div className="relative inline-flex items-center" ref={datasetDropdownRef}>
          <DatasetVersionPill
            datasetName={activeDataset?.name || "Sample Retail Q3"}
            versionLabel={activeDataset?.versions?.[0]?.label?.split(" ")?.[0] || "v1"}
            qualityScore={activeDataset?.quality_score || 94}
            onClick={toggleDatasetDropdown}
          />

          {datasetDropdownOpen && (
            <div
              className="absolute right-0 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-brand-orange/40 bg-surface-main dropdown-solid p-2.5 z-[100] animate-dropdown-open"
              style={{ top: "calc(100% + 8px)", right: 0 }}
            >
              <div className="px-3 py-2 border-b border-surface-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-text-main">Switch Active Dataset</p>
                  <p className="text-[10px] text-text-muted">Dynamic analytics will update across all pages</p>
                </div>
                <Database className="w-3.5 h-3.5 text-brand-orange" />
              </div>

              <div className="py-1 max-h-60 overflow-y-auto space-y-1">
                {datasets.map((d) => {
                  const isSelected = activeDataset?.id === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        selectDataset(d.id);
                        setDatasetDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors",
                        isSelected
                          ? "bg-brand-orange/15 text-brand-orange font-bold border border-brand-orange/30"
                          : "hover:bg-surface-subtle text-text-main"
                      )}
                    >
                      <div className="overflow-hidden pr-2">
                        <div className="truncate font-semibold">{d.name}</div>
                        <div className="text-[10px] text-text-muted">
                          {d.row_count?.toLocaleString()} rows • {d.quality_score?.toFixed(0) || 94}% quality
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-brand-orange shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-surface-border">
                <button
                  onClick={() => {
                    navigate("/app/data");
                    setDatasetDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-brand-orange hover:bg-brand-orange/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload or Manage Datasets</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => setHasUnreadNotifications(false)}
          className="relative p-2 rounded-xl border border-surface-border hover:bg-surface-subtle text-text-muted hover:text-text-main transition-all micro-press hover-glow-ambient"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {hasUnreadNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-orange shadow-glowSm animate-pulse" />
          )}
        </button>

        {/* User Profile Menu */}
        <div className="relative inline-flex items-center" ref={profileDropdownRef}>
          <button
            onClick={toggleProfile}
            className="flex items-center gap-2 p-1 pl-2.5 pr-1.5 rounded-full border border-surface-border hover:border-brand-orange/40 bg-surface-card/90 hover:bg-surface-subtle transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-orange micro-press hover-glow-ambient"
            aria-expanded={profileOpen}
            aria-label="User Profile Menu"
          >
            <span className="text-xs font-semibold text-text-main hidden sm:inline">{firstName}</span>
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-orange to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-glowSm">
              {initialLetter}
            </div>
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-brand-orange/40 bg-surface-main dropdown-solid p-2.5 z-[100] animate-dropdown-open"
              style={{ top: "calc(100% + 8px)", right: 0 }}
            >
              <div className="px-3 py-2 border-b border-surface-border">
                <p className="text-xs font-bold text-text-main">{displayName}</p>
                <p className="text-[11px] text-text-muted truncate">{userEmail}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    navigate("/app/settings?tab=profile");
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-main hover:bg-surface-subtle hover:text-brand-orange"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profile Settings</span>
                </button>
              </div>

              <div className="pt-1 border-t border-surface-border">
                <span className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Theme
                </span>
                <div className="grid grid-cols-3 gap-1 px-2 py-1">
                  <button
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "p-1.5 rounded-lg text-[11px] font-semibold flex flex-col items-center gap-1 border",
                      theme === "dark" ? "border-brand-orange text-brand-orange bg-brand-orange/10" : "border-surface-border text-text-muted hover:text-text-main"
                    )}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme("light")}
                    className={cn(
                      "p-1.5 rounded-lg text-[11px] font-semibold flex flex-col items-center gap-1 border",
                      theme === "light" ? "border-brand-orange text-brand-orange bg-brand-orange/10" : "border-surface-border text-text-muted hover:text-text-main"
                    )}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => setTheme("hybrid")}
                    className={cn(
                      "p-1.5 rounded-lg text-[11px] font-semibold flex flex-col items-center gap-1 border",
                      theme === "hybrid" ? "border-brand-orange text-brand-orange bg-brand-orange/10" : "border-surface-border text-text-muted hover:text-text-main"
                    )}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Hybrid</span>
                  </button>
                </div>
              </div>

              <div className="pt-1 mt-1 border-t border-surface-border">
                <button
                  onClick={() => {
                    navigate("/login");
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-status-critical hover:bg-status-criticalBg/40"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
