import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Eye, Lock, Mail, User } from "lucide-react";

export const SignupPage: React.FC = () => {
  const [name, setName] = useState("");
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
    <div className="min-h-screen bg-surface-base text-text-main flex items-center justify-center p-6">
      <div className="w-full max-w-md p-8 rounded-2xl border border-surface-border bg-surface-main shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-brand-orange text-white flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg text-text-main">BizLens</span>
        </div>

        <h2 className="text-2xl font-bold text-text-main">Create Your Account</h2>
        <p className="mt-1 text-xs text-text-muted">Start transforming your business data into decisions.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase">Full Name</label>
            <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-border bg-surface-card focus-within:border-brand-orange">
              <User className="w-4 h-4 text-text-muted" />
              <input
                type="text"
                required
                placeholder="Piyush Toddale"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-sm text-text-main placeholder:text-text-muted outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted uppercase">Work Email</label>
            <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-border bg-surface-card focus-within:border-brand-orange">
              <Mail className="w-4 h-4 text-text-muted" />
              <input
                type="email"
                required
                placeholder="piyush@enterprise.com"
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
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-text-main placeholder:text-text-muted outline-none"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
            Create Account & Launch
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-surface-border text-center text-xs text-text-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-orange hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
