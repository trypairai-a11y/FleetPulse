// Phase 6 Wave 0 RED — Talabat XLSX fixture builder.
// MVP 5-column shape: {date, driver_id, orders_count, online_minutes, attendance_status}.
import * as XLSX from "xlsx";

export interface TalabatRowInput {
  date: string;
  driver_id: string;
  orders_count: number;
  online_minutes: number;
  attendance_status: string; // PRESENT | LATE | ABSENT
}

const HEADERS = ["date", "driver_id", "orders_count", "online_minutes", "attendance_status"];

export function buildTalabatXlsxBuffer(opts?: {
  rows?: TalabatRowInput[];
  badHeaders?: boolean;
}): Buffer {
  const rows = opts?.rows ?? [
    {
      date: "2026-05-01",
      driver_id: "T-001",
      orders_count: 30,
      online_minutes: 480,
      attendance_status: "PRESENT",
    },
    {
      date: "2026-05-02",
      driver_id: "T-002",
      orders_count: 22,
      online_minutes: 360,
      attendance_status: "LATE",
    },
  ];
  const headers = opts?.badHeaders ? ["wrong", "headers"] : HEADERS;
  const aoa: unknown[][] = [
    headers,
    ...rows.map((r) => [
      r.date,
      r.driver_id,
      r.orders_count,
      r.online_minutes,
      r.attendance_status,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function buildBadTalabatXlsx(): Buffer {
  return buildTalabatXlsxBuffer({ badHeaders: true });
}
