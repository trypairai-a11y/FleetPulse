// Phase 6 Wave 0 RED — Deliveroo XLSX fixture builder.
// MVP 5-column shape mirrors Talabat per orchestrator resolution #2.
import * as XLSX from "xlsx";

export interface DeliverooRowInput {
  date: string;
  driver_id: string;
  orders_count: number;
  online_minutes: number;
  attendance_status: string;
}

const HEADERS = ["date", "driver_id", "orders_count", "online_minutes", "attendance_status"];

export function buildDeliverooXlsxBuffer(opts?: {
  rows?: DeliverooRowInput[];
  badHeaders?: boolean;
}): Buffer {
  const rows = opts?.rows ?? [
    {
      date: "2026-05-01",
      driver_id: "D-001",
      orders_count: 18,
      online_minutes: 300,
      attendance_status: "PRESENT",
    },
    {
      date: "2026-05-02",
      driver_id: "D-002",
      orders_count: 12,
      online_minutes: 240,
      attendance_status: "ABSENT",
    },
  ];
  const headers = opts?.badHeaders ? ["nope"] : HEADERS;
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

export function buildBadDeliverooXlsx(): Buffer {
  return buildDeliverooXlsxBuffer({ badHeaders: true });
}
