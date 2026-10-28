import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Check,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api, APIKeyStatusData } from "@/lib/api";

interface GeminiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: (status: APIKeyStatusData) => void;
}

export const GeminiKeyModal: React.FC<GeminiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<APIKeyStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadKeyStatus();
      setTestResult(null);
      setSaveSuccess(false);
      setApiKeyInput("");
    }
  }, [isOpen]);

  const loadKeyStatus = async () => {
    setIsLoading(true);
    try {
      const status = await api.getApiKeyStatus();
      setKeyStatus(status);
    } catch (err) {
      console.error("Failed to fetch API key status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestKey = async () => {
    const keyToTest = apiKeyInput.trim();
    if (!keyToTest && !keyStatus?.is_configured) {
      setTestResult({
        success: false,
        message: "Please enter a Gemini API key to test.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testApiKey(keyToTest || undefined);
      setTestResult({
        success: res.is_valid,
        message: res.message || (res.is_valid ? "Connection verified!" : "Verification failed."),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Failed to test Gemini API key connection.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) {
      setTestResult({
        success: false,
        message: "Please enter a valid API key.",
      });
      return;
    }

    setIsLoading(true);
    setSaveSuccess(false);
    try {
      const updated = await api.updateApiKey(apiKeyInput.trim());
      setKeyStatus(updated);
      setSaveSuccess(true);
      setApiKeyInput("");
      if (onKeyUpdated) {
        onKeyUpdated(updated);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Failed to save API key.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearKey = async () => {
    setIsLoading(true);
    try {
      const updated = await api.updateApiKey("");
      setKeyStatus(updated);
      setApiKeyInput("");
      setTestResult(null);
      if (onKeyUpdated) {
        onKeyUpdated(updated);
      }
    } catch (err: any) {
      console.error("Failed to clear API key:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl glass-panel space-y-5 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-orange to-amber-500 text-white flex items-center justify-center shadow-glowSm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                <span>Google Gemini API Key</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange border border-brand-orange/20 uppercase font-semibold">
                  GenAI 3.8 Flash
                </span>
              </h3>
              <p className="text-xs text-text-muted">
                Connect your official API key for full natural language intelligence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Key Status Badge */}
        <div className="p-3 rounded-xl border border-surface-border bg-surface-subtle/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                keyStatus?.is_configured
                  ? "bg-status-positive animate-pulse"
                  : "bg-status-warning"
              }`}
            />
            <div>
              <div className="text-xs font-semibold text-text-main flex items-center gap-2">
                <span>
                  {keyStatus?.is_configured
                    ? "Gemini AI Engine Active"
                    : "Local Deterministic Mode Active"}
                </span>
                {keyStatus?.is_configured && (
                  <span className="text-[10px] font-mono text-text-muted">
                    ({keyStatus.masked_key})
                  </span>
                )}
              </div>
              <span className="text-[11px] text-text-muted block">
                {keyStatus?.is_configured
                  ? "Connected via encrypted user vault · Powered by Google Gemini"
                  : "Connect your key from Google AI Studio to unlock live chatbot reasoning"}
              </span>
            </div>
          </div>
          {keyStatus?.is_configured && (
            <button
              onClick={handleClearKey}
              className="text-text-muted hover:text-status-negative p-1.5 rounded-lg hover:bg-status-negativeBg/40 transition-colors"
              title="Disconnect Key"
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Input Field */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-text-main flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-brand-orange" />
              <span>Enter Gemini API Key</span>
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-brand-orange hover:underline flex items-center gap-1"
            >
              <span>Get free key from Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full glass-input rounded-xl px-4 py-2.5 pr-10 text-xs sm:text-sm font-mono placeholder:text-text-muted focus:outline-none focus:border-brand-orange transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-text-muted hover:text-text-main transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <span className="text-[11px] text-text-muted block">
            Google Gemini API keys begin with <code className="text-brand-orange font-mono">AIzaSy</code>.
          </span>
        </div>

        {/* Live Test Feedback Banner */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? "bg-status-positiveBg/40 border-status-positive/30 text-status-positive"
                : "bg-status-negativeBg/40 border-status-negative/30 text-status-negative"
            }`}
          >
            {testResult.success ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <strong className="block font-semibold">
                {testResult.success ? "Verification Successful" : "Connection Issue"}
              </strong>
              <p className="text-[11px] opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Save Success Banner */}
        {saveSuccess && (
          <div className="p-3 rounded-xl border border-status-positive/30 bg-status-positiveBg/40 text-status-positive text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Google Gemini API Key successfully saved and activated in live chat!</span>
          </div>
        )}

        {/* Security & Encryption Notice */}
        <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border text-[11px] text-text-muted flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-status-positive shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Your key is encrypted in a local vault with AES-128-CBC + HMAC-SHA256. It is never logged in plaintext or shared with third parties.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTestKey}
            disabled={isTesting || (!apiKeyInput.trim() && !keyStatus?.is_configured)}
            icon={isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
          >
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveKey}
            disabled={isLoading || !apiKeyInput.trim()}
            icon={isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          >
            {isLoading ? "Saving..." : "Save & Activate"}
          </Button>
        </div>
      </div>
    </div>
  );
};
