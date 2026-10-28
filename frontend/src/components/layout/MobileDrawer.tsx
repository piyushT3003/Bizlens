import React, { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { X, Eye } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/Sidebar";
import { useDecisionBadge } from "@/hooks/useDecisionBadge";

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const decisionBadge = useDecisionBadge();

  const navItems = NAV_ITEMS.map((item) =>
    item.name === "Decision Support" ? { ...item, badge: decisionBadge } : item
  );

  // Close drawer on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-72 h-full bg-surface-main border-r border-surface-border p-4 flex flex-col justify-between shadow-2xl animate-slideRight"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Drawer"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-orange flex items-center justify-center text-white">
                <Eye className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-base text-text-main">BizLens</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="mt-4 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-orange text-white shadow-glowSm"
                      : "text-text-muted hover:text-text-main hover:bg-surface-subtle"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-orange/20 text-brand-orange">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-surface-border text-center text-xs text-text-muted">
          BizLens Enterprise v1.0.0
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
