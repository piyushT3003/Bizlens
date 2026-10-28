import React from "react";
import { useThemeStore, ThemeMode } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { Moon, Sun, Layers, Monitor } from "lucide-react";
import { themeTokens, brandTokens } from "@/design/tokens";

export interface ThemeSwitcherProps {
  className?: string;
  showPreviewCards?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className,
  showPreviewCards = false,
}) => {
  const { theme, setTheme } = useThemeStore();

  const options: { id: ThemeMode; label: string; icon: React.ReactNode; previewBg: string; previewCard: string; previewBorder: string }[] = [
    {
      id: "dark",
      label: "Dark",
      icon: <Moon className="w-4 h-4" />,
      previewBg: themeTokens.dark.base,
      previewCard: themeTokens.dark.card,
      previewBorder: themeTokens.dark.border,
    },
    {
      id: "light",
      label: "Light",
      icon: <Sun className="w-4 h-4" />,
      previewBg: themeTokens.light.base,
      previewCard: themeTokens.light.card,
      previewBorder: themeTokens.light.border,
    },
    {
      id: "hybrid",
      label: "Hybrid",
      icon: <Layers className="w-4 h-4" />,
      previewBg: themeTokens.hybrid.base,
      previewCard: themeTokens.hybrid.card,
      previewBorder: themeTokens.hybrid.border,
    },
    {
      id: "system",
      label: "System",
      icon: <Monitor className="w-4 h-4" />,
      previewBg: themeTokens.dark.surfaceSubtle,
      previewCard: "rgba(255, 255, 255, 0.08)",
      previewBorder: "rgba(255, 255, 255, 0.15)",
    },
  ];

  if (showPreviewCards) {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-4", className)}>
        {options.map((opt) => {
          const isSelected = theme === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={cn(
                "group relative rounded-xl p-3 border text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
                isSelected
                  ? "border-brand-orange shadow-glowSm bg-surface-subtle"
                  : "border-surface-border hover:border-surface-borderHover bg-surface-card"
              )}
            >
              {/* Mini Preview Box */}
              <div
                className="w-full h-16 rounded-lg p-2 mb-3 relative overflow-hidden flex flex-col justify-between"
                style={{ backgroundColor: opt.previewBg }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-orange" />
                  <div className="w-8 h-1.5 rounded-full bg-surface-border" />
                </div>
                <div
                  className="w-full h-7 rounded border p-1 flex items-center justify-between"
                  style={{
                    backgroundColor: opt.previewCard,
                    borderColor: opt.previewBorder,
                  }}
                >
                  <div className="w-6 h-1.5 rounded bg-brand-orange/60" />
                  <div className="w-3 h-1.5 rounded bg-status-positive/80" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-main flex items-center gap-1.5">
                  {opt.icon}
                  {opt.label}
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-brand-orange" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center p-1 rounded-xl bg-surface-card border border-surface-border select-none",
        className
      )}
      role="radiogroup"
      aria-label="Select theme"
    >
      {options.map((opt) => {
        const isSelected = theme === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => setTheme(opt.id)}
            role="radio"
            aria-checked={isSelected}
            aria-label={`${opt.label} theme`}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
              isSelected
                ? "bg-brand-orange text-white shadow-sm"
                : "text-text-muted hover:text-text-main hover:bg-surface-subtle"
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
