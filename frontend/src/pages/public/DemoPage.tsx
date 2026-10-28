import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Database, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

export const DemoPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-base text-text-main p-6 lg:p-12 max-w-4xl mx-auto space-y-8">
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-orange hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">Interactive Guided Tour</span>
        <h1 className="text-3xl font-display font-bold text-text-main mt-1">
          Explore BizLens with Seeded Sample Data
        </h1>
        <p className="mt-2 text-text-muted text-sm">
          A pre-calculated Indian retail sales dataset with 20,000 orders across Karnataka, Maharashtra, Delhi, Tamil Nadu, Telangana, and West Bengal.
        </p>
      </div>

      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-orange/15 text-brand-orange flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">Sample Retail Dataset (Fixed Seed=42)</h3>
            <p className="text-xs text-text-muted">Includes seasonal peaks, category anomalies, and intentional spelling variants for data cleaning demos.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
          <div className="p-3 rounded-lg bg-surface-subtle">
            <div className="text-[10px] text-text-muted uppercase">Orders</div>
            <div className="text-base font-bold tabular-nums text-text-main">20,412</div>
          </div>
          <div className="p-3 rounded-lg bg-surface-subtle">
            <div className="text-[10px] text-text-muted uppercase">Revenue</div>
            <div className="text-base font-bold tabular-nums text-brand-orange">₹1.24 Cr</div>
          </div>
          <div className="p-3 rounded-lg bg-surface-subtle">
            <div className="text-[10px] text-text-muted uppercase">Avg Margin</div>
            <div className="text-base font-bold tabular-nums text-status-positive">31.4%</div>
          </div>
          <div className="p-3 rounded-lg bg-surface-subtle">
            <div className="text-[10px] text-text-muted uppercase">Quality Score</div>
            <div className="text-base font-bold tabular-nums text-text-main">94.2%</div>
          </div>
        </div>

        <div className="pt-4 flex items-center gap-4">
          <Button
            variant="primary"
            onClick={() => navigate("/app/home")}
            icon={<Play className="w-4 h-4" />}
          >
            Launch Demo Workspace
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate("/signup")}
          >
            Create Your Account
          </Button>
        </div>
      </GlassCard>
    </div>
  );
};
