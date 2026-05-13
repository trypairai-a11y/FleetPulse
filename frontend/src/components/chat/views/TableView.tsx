// Phase 4 Wave 3 — table viewBlock renderer (UI-SPEC §3.2.4 variant 2).
"use client";
import type { TableSpec } from "@/types/views";

function colKey(c: TableSpec["columns"][number]) {
  return typeof c === "string" ? c : c.key;
}
function colLabel(c: TableSpec["columns"][number]) {
  return typeof c === "string" ? c : c.label;
}
function colAlign(c: TableSpec["columns"][number]): "left" | "right" {
  return typeof c === "string" ? "left" : c.align ?? "left";
}

export function TableView({ spec }: { spec: TableSpec }) {
  const cols = spec?.columns ?? [];
  const rows = spec?.rows ?? [];
  return (
    <div>
      {spec?.title && (
        <h3 className="mb-3 text-sm font-medium text-foreground">{spec.title}</h3>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-sand-200">
              {cols.map((c, i) => (
                <th
                  key={`${colKey(c)}-${i}`}
                  className={`px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-secondary ${
                    colAlign(c) === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {colLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-sand-100 last:border-0">
                {cols.map((c, j) => {
                  const k = colKey(c);
                  const value = row[k] ?? "";
                  return (
                    <td
                      key={`${k}-${j}`}
                      className={`px-3 py-2 text-foreground ${
                        colAlign(c) === "right" ? "text-right tabular-nums" : ""
                      }`}
                    >
                      {String(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TableView;
