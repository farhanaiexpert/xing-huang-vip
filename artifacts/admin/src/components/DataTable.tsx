import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  getValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  cols: ColDef<T>[];
  rows: T[] | undefined;
  loading?: boolean;
  skeletonRows?: number;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  maxHeight?: string;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
}

export function DataTable<T>({
  cols,
  rows,
  loading,
  skeletonRows = 8,
  rowKey,
  onRowClick,
  rowClassName,
  maxHeight,
  empty = "No data",
  footer,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  function toggleSort(key: string) {
    setSort(prev =>
      !prev || prev.key !== key
        ? { key, dir: "asc" }
        : prev.dir === "asc"
        ? { key, dir: "desc" }
        : null
    );
  }

  const sorted = useMemo(() => {
    if (!rows || !sort) return rows;
    const col = cols.find(c => c.key === sort.key);
    if (!col?.getValue) return rows;
    return [...rows].sort((a, b) => {
      const av = col.getValue!(a);
      const bv = col.getValue!(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, cols]);

  return (
    <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
      <div
        className="overflow-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-white/8 text-[#475569] text-[11px] uppercase tracking-wider bg-[#0D1117]">
              {cols.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    "text-left px-4 py-3 font-medium whitespace-nowrap bg-[#0D1117] shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]",
                    col.sortable &&
                      "cursor-pointer select-none hover:text-[#94A3B8] transition-colors",
                    col.headerClassName
                  )}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable &&
                      (sort?.key === col.key ? (
                        sort.dir === "asc" ? (
                          <ChevronUp className="w-3 h-3 text-[#00DFA9]" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-[#00DFA9]" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-30" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {cols.map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div
                        className="h-3.5 bg-white/5 rounded animate-pulse"
                        style={{ width: `${55 + (j * 13) % 40}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : !sorted?.length ? (
              <tr>
                <td
                  colSpan={cols.length}
                  className="text-center py-16 text-[#334155]"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              sorted.map(row => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "border-b border-white/5 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-white/[0.03]",
                    rowClassName?.(row)
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {cols.map(col => (
                    <td key={col.key} className={cn("px-4 py-3.5", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="border-t border-white/8 px-4 py-3 text-[#475569]">
          {footer}
        </div>
      )}
    </div>
  );
}
