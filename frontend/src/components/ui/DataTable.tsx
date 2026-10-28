import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  caption?: string;
  className?: string;
  density?: "compact" | "comfortable";
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  caption = "Data Table",
  className,
  density = "comfortable",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      return sortDir === "asc" ? 1 : -1;
    });
  }, [data, sortKey, sortDir]);

  const paddingClass = density === "compact" ? "px-3 py-1.5 text-xs" : "px-4 py-3 text-sm";

  return (
    <div className={cn("w-full overflow-x-auto rounded-xl border border-surface-border bg-surface-card", className)}>
      <table className="w-full text-left border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-surface-border bg-surface-subtle/50 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className={cn(
                  paddingClass,
                  col.sortable && "cursor-pointer select-none hover:text-text-main"
                )}
                onClick={() => col.sortable && handleSort(col.key as string)}
              >
                <div className="flex items-center gap-1.5">
                  <span>{col.header}</span>
                  {col.sortable && sortKey === col.key && (
                    <span>
                      {sortDir === "asc" ? (
                        <ChevronUp className="w-3.5 h-3.5 text-brand-orange" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-brand-orange" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-text-muted">
                No rows to display
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-surface-subtle/40 transition-colors">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={cn(paddingClass, "text-text-main tabular-nums")}>
                    {col.render ? col.render(row) : String(row[col.key] ?? "--")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
