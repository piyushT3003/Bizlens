import React, { useState, useRef, useEffect } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Sidebar, NAV_ITEMS } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { FloatingAssistant } from "@/components/ui/FloatingAssistant";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { AmbientBackground } from "@/components/ui/Ambient";
import { PageTransition } from "@/components/ui/Transitions";

export const AppShell: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const location = useLocation();
  const currentOutlet = useOutlet();
  const outletsRef = useRef<Record<string, React.ReactNode>>({});

  if (currentOutlet) {
    outletsRef.current[location.pathname] = currentOutlet;
  }

  const getNavIndex = (path: string): number => {
    const idx = NAV_ITEMS.findIndex(
      (item) => path === item.href || path.startsWith(`${item.href}/`)
    );
    return idx !== -1 ? idx : 0;
  };

  const prevPathRef = useRef(location.pathname);
  const prevIndex = getNavIndex(prevPathRef.current);
  const currentIndex = getNavIndex(location.pathname);
  const direction = currentIndex >= prevIndex ? 1 : -1;

  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-surface-base text-text-main relative">
      <AmbientBackground intensity="subtle" />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <TopBar
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
        />

        <main className="flex-1 px-4 lg:px-6 pt-1.5 lg:pt-2 pb-5 overflow-y-auto flip-card-stage">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <PageTransition key={location.pathname} direction={direction}>
              {outletsRef.current[location.pathname] || currentOutlet}
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar onOpenMore={() => setMobileDrawerOpen(true)} />

      {/* Global Overlays */}
      <FloatingAssistant />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
};
