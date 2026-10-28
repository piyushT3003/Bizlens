import { useState, useEffect } from "react";
import { useDatasetStore } from "@/hooks/useDataset";
import { api } from "@/lib/api";

export function useDecisionBadge(): number | string {
  const { activeDataset, activePreset } = useDatasetStore();
  const [badgeCount, setBadgeCount] = useState<number | string>(
    () => activePreset?.findings?.length || 4
  );

  useEffect(() => {
    let active = true;
    const dsId = activeDataset?.id || activePreset?.id;
    if (!dsId) return;

    api
      .getFindings(dsId)
      .then((res) => {
        if (!active) return;
        if (res && typeof res.total_findings === "number") {
          const actionable = (res.open_count || 0) + (res.applied_count || 0);
          setBadgeCount(actionable > 0 ? actionable : res.total_findings);
        }
      })
      .catch(() => {
        if (!active) return;
        if (activePreset?.findings?.length) {
          setBadgeCount(activePreset.findings.length);
        }
      });

    return () => {
      active = false;
    };
  }, [activeDataset?.id, activePreset?.id]);

  return badgeCount;
}
