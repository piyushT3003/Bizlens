import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, MessageSquare, ArrowRight, Sparkles } from "lucide-react";
import { RobotMascot } from "@/components/visuals/RobotMascot";
import { cn } from "@/lib/utils";

export const FloatingAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [quickQuestion, setQuickQuestion] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on Ask BizLens page to avoid duplicate input
  if (location.pathname.startsWith("/app/ask")) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuestion.trim()) return;
    navigate(`/app/ask?initialQuestion=${encodeURIComponent(quickQuestion)}`);
    setIsOpen(false);
    setQuickQuestion("");
  };

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 select-none">
      {isOpen ? (
        <div className="w-80 sm:w-88 rounded-2xl border border-brand-orange/40 bg-surface-main dropdown-solid p-4 animate-scaleUp">
          {/* Header with Robot Mascot Avatar */}
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-surface-subtle border border-brand-orange/30 flex items-center justify-center p-0.5 shadow-sm">
                <RobotMascot size={26} expression="happy" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-orange uppercase tracking-wider">
                  <span>BizLens Assistant</span>
                  <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-text-muted">Always active • Autonomous AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-text-muted hover:text-text-main p-1.5 rounded-xl hover:bg-surface-subtle transition-colors"
              aria-label="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-3 text-xs text-text-muted leading-relaxed">
            Ask any question about your active dataset, revenue drivers, or calculations.
          </p>

          <form onSubmit={handleSend} className="mt-3">
            <div className="flex items-center gap-2 p-1.5 rounded-xl border border-surface-border bg-surface-card focus-within:border-brand-orange transition-colors">
              <input
                type="text"
                placeholder="Ask BizLens anything..."
                value={quickQuestion}
                onChange={(e) => setQuickQuestion(e.target.value)}
                className="w-full bg-transparent px-2 text-xs text-text-main placeholder:text-text-muted outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={!quickQuestion.trim()}
                className="p-1.5 rounded-lg bg-brand-orange text-white disabled:opacity-40 hover:bg-brand-ember active:scale-95 transition-all"
                title="Send Question"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          <div className="mt-3 pt-2.5 flex items-center justify-between text-[11px] text-text-muted border-t border-surface-border/60">
            <button
              onClick={() => {
                navigate("/app/ask");
                setIsOpen(false);
              }}
              className="text-brand-orange hover:text-brand-ember flex items-center gap-1.5 font-medium transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open Full Chat</span>
            </button>
            <span className="text-[10px] text-text-muted font-mono">Gemini 2.5 Flash</span>
          </div>
        </div>
      ) : (
        <div className="relative flex items-center">
          {/* Interactive Speech / Greeting Bubble on Hover */}
          <div
            className={cn(
              "absolute right-full mr-3 pointer-events-none transition-all duration-300 origin-right whitespace-nowrap",
              isHovered
                ? "opacity-100 translate-x-0 scale-100"
                : "opacity-0 translate-x-2 scale-95"
            )}
          >
            <div className="px-3 py-1.5 rounded-xl border border-brand-orange/40 bg-surface-main/95 backdrop-blur-xl shadow-xl text-xs text-text-main font-semibold flex items-center gap-1.5">
              <span>Hi! Need insights?</span>
              <span className="text-brand-orange font-bold">Ask me</span>
              <span className="text-[10px]">✨</span>
            </div>
            {/* Speech bubble pointer arrow */}
            <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-surface-main border-t border-r border-brand-orange/40 rotate-45" />
          </div>

          {/* Interactive Robot Mascot Button */}
          <button
            onClick={() => setIsOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            className="group relative flex items-center justify-center p-1 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-orange transition-transform duration-200 active:scale-95"
            title="Open BizLens Assistant"
            aria-label="Open BizLens Assistant"
          >
            {/* Ambient Circular Aura & Radar Pulse */}
            <div className="absolute inset-0 rounded-full bg-brand-orange/15 blur-lg group-hover:bg-brand-orange/30 transition-all pointer-events-none" />
            <div className="absolute -inset-1 rounded-full border border-brand-orange/30 animate-ping opacity-30 pointer-events-none" />

            {/* Robot Mascot Vector Character */}
            <RobotMascot
              size={58}
              isHovered={isHovered}
              className="drop-shadow-[0_10px_20px_rgba(255,122,26,0.4)] transition-all duration-300 group-hover:scale-110"
            />
          </button>
        </div>
      )}
    </div>
  );
};
