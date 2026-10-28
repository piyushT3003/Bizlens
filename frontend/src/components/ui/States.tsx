import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Database, AlertTriangle, FileQuestion } from "lucide-react";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No data available",
  description = "Upload a CSV or Excel file, or load the sample data to see BizLens in action.",
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-surface-border bg-surface-card/50",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange mb-4 shadow-glowSm">
        {icon || <Database className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-bold text-text-main">{title}</h3>
      <p className="mt-1.5 text-sm text-text-muted max-w-md leading-relaxed">{description}</p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message = "An error occurred while loading this view. Please try again.",
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-status-critical/20 bg-status-criticalBg/40",
        className
      )}
    >
      <AlertTriangle className="w-8 h-8 text-status-critical mb-2" />
      <h4 className="text-sm font-bold text-text-main">{title}</h4>
      <p className="mt-1 text-xs text-text-muted max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-4">
          Retry
        </Button>
      )}
    </div>
  );
};

export interface PartialDataStateProps {
  missingRole: string;
  onReviewMapping?: () => void;
  className?: string;
}

export const PartialDataState: React.FC<PartialDataStateProps> = ({
  missingRole,
  onReviewMapping,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-surface-border bg-surface-card",
        className
      )}
    >
      <FileQuestion className="w-8 h-8 text-status-warning mb-2" />
      <h4 className="text-sm font-semibold text-text-main">Analysis Unavailable</h4>
      <p className="mt-1 text-xs text-text-muted max-w-xs">
        This needs a <strong className="text-brand-orange">{missingRole}</strong> column, and your dataset doesn't have one mapped yet.
      </p>
      {onReviewMapping && (
        <Button variant="ghost" size="sm" onClick={onReviewMapping} className="mt-3 text-brand-orange">
          Review column mapping &rarr;
        </Button>
      )}
    </div>
  );
};
