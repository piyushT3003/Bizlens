import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { AICore } from "@/components/visuals/AICore";
import { Eye, Lock, Mail } from "lucide-react";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/app/home");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-main flex flex-col lg:flex-row items-center justify-center p-6">
      {/* Left Form Area */}
      <div className="w-full max-w-md p-8 rounded-2xl border border-surface-border bg-surface-main shadow-2xl z-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-brand-orange text-white flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg text-text-main">BizLens</span>
        </div>

        <h2 className="text-2xl font-bold text-text-main">Welcome Back</h2>
        <p className="mt-1 text-xs text-text-muted">Enter your credentials to access the intelligence platform.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase">Email Address</label>
            <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-border bg-surface-card focus-within:border-brand-orange">
              <Mail className="w-4 h-4 text-text-muted" />
              <input
                type="email"
                required
                placeholder="analyst@enterprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-text-main placeholder:text-text-muted outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted uppercase">Password</label>
            <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-border bg-surface-card focus-within:border-brand-orange">
              <Lock className="w-4 h-4 text-text-muted" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-text-main placeholder:text-text-muted outline-none"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
            Sign In to BizLens
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between text-xs text-text-muted">
          <Link to="/demo" className="text-brand-orange hover:underline font-medium">
            Explore Demo Mode &rarr;
          </Link>
          <Link to="/signup" className="hover:text-text-main">
            Create an account
          </Link>
        </div>
      </div>

      {/* Right Showcase Area */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative max-w-lg">
        <div className="relative flex flex-col items-center">
          <AICore mode="calm" size={320} />
          <p className="mt-4 text-center text-xs text-text-muted max-w-xs">
            "Analytics calculates. GenAI explains." Deterministic verified metrics for enterprise decisions.
          </p>
        </div>
      </div>
    </div>
  );
};
