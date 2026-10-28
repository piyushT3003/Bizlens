import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Upload, MessageSquare, FileText, MoreHorizontal } from "lucide-react";

export const BottomTabBar: React.FC<{ onOpenMore: () => void }> = ({ onOpenMore }) => {
  const location = useLocation();

  const tabs = [
    { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    { name: "Upload", href: "/app/upload", icon: Upload },
    { name: "Ask", href: "/app/ask", icon: MessageSquare },
    { name: "Reports", href: "/app/reports", icon: FileText },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-surface-border bg-surface-main/90 backdrop-blur-md z-30 flex items-center justify-around px-2 select-none"
      aria-label="Mobile Bottom Navigation"
    >
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <NavLink
            key={tab.href}
            to={tab.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all",
              isActive ? "text-brand-orange font-bold" : "text-text-muted hover:text-text-main"
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-[10px] tracking-tight">{tab.name}</span>
          </NavLink>
        );
      })}

      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-text-muted hover:text-text-main transition-colors"
        aria-label="More options"
      >
        <MoreHorizontal className="w-5 h-5 shrink-0" />
        <span className="text-[10px] tracking-tight">More</span>
      </button>
    </nav>
  );
};
