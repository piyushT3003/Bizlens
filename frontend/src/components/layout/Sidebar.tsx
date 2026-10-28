import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/hooks/useSettings";
import { useDecisionBadge } from "@/hooks/useDecisionBadge";
import {
  Home,
  LayoutDashboard,
  Upload,
  MessageSquare,
  Compass,
  Sliders,
  GitFork,
  FileText,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const NAV_ITEMS: NavItem[] = [
  { name: "Home", href: "/app/home", icon: Home },
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "Upload Data", href: "/app/upload", icon: Upload },
  { name: "Ask BizLens", href: "/app/ask", icon: MessageSquare },
  { name: "Business Insights", href: "/app/insights", icon: Compass },
  { name: "What-If Analysis", href: "/app/what-if", icon: Sliders },
  { name: "Decision Support", href: "/app/decisions", icon: GitFork, badge: "4" },
  { name: "Reports", href: "/app/reports", icon: FileText },
  { name: "Data Management", href: "/app/data", icon: Database },
  { name: "Settings", href: "/app/settings", icon: Settings },
];

export const Sidebar: React.FC<{
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}> = ({ collapsed = false, onToggleCollapse, className }) => {
  const location = useLocation();
  const { settings } = useSettingsStore();
  const rawName = settings.profile.display_name;
  const displayName = rawName && !rawName.includes("Alexander") && !rawName.includes("Offline")
    ? rawName
    : "Piyush Toddale";
  const firstName = displayName.split(" ")[0] || "Piyush";
  const initialLetter = displayName.charAt(0).toUpperCase() || "P";
  const role = settings.profile.role || "Lead Analytics Architect";
  const decisionBadge = useDecisionBadge();

  const navItems = NAV_ITEMS.map((item) =>
    item.name === "Decision Support" ? { ...item, badge: decisionBadge } : item
  );

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col justify-between border-r border-surface-border bg-surface-main/80 backdrop-blur-2xl glass-panel transition-all duration-200 z-30 select-none shadow-sm",
        collapsed ? "w-20" : "w-64",
        className
      )}
      aria-label="Sidebar Navigation"
    >
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-4 py-4 border-b border-surface-border">
          <NavLink to="/app/home" className="flex items-center gap-2.5 group outline-none micro-press">
            <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center text-white shadow-glowSm group-hover:shadow-glowMd transition-shadow shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-display font-bold text-base tracking-wide text-text-main group-hover:text-brand-orange transition-colors">
                  BizLens
                </span>
                <span className="text-[10px] text-text-muted -mt-0.5 tracking-wider uppercase font-semibold">
                  Quantum Horizon
                </span>
              </div>
            )}
          </NavLink>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors outline-none focus-visible:ring-1 focus-visible:ring-brand-orange micro-press"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Navigation Items List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none group focus-visible:ring-2 focus-visible:ring-brand-orange micro-press hover-shimmer-trigger",
                  isActive
                    ? "text-white"
                    : "text-text-muted hover:text-text-main hover:bg-surface-subtle/80 hover:translate-x-1"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveCardPill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-orange to-brand-ember shadow-glowSm gloss-sheen"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}
                <Icon
                  className={cn(
                    "w-5 h-5 shrink-0 transition-transform group-hover:scale-110 relative z-10",
                    isActive ? "text-white" : "text-text-muted group-hover:text-brand-orange"
                  )}
                />
                {!collapsed && <span className="truncate relative z-10">{item.name}</span>}
                {!collapsed && item.badge && (
                  <span
                    className={cn(
                      "ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums relative z-10",
                      isActive ? "bg-white/20 text-white" : "bg-brand-orange/20 text-brand-orange"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile Shortcut */}
      <div className="p-3 border-t border-surface-border">
        <NavLink
          to="/app/settings"
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl hover:bg-surface-subtle transition-colors group outline-none",
            collapsed && "justify-center"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange font-bold text-xs shrink-0">
            {initialLetter}
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-text-main truncate group-hover:text-brand-orange">
                {firstName}
              </span>
              <span className="text-[10px] text-text-muted truncate">
                {role}
              </span>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  );
};
