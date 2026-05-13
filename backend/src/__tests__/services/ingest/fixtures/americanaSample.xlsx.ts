// Phase 6 Wave 0 RED — Americana XLSX fixture builder.
// Mirrors parseAmericanaDailyXlsx's expected daily-shape: tab name +
// branch / driver / orders columns. Adapter wraps existing parser, so
// fixture just needs to be a valid xlsx workbook with one sheet.
import * as XLSX from "xlsx";

export interface AmericanaRowInput {
  date: string;
  branchCode: string;
  driverName: string;
  ordersCount: number;
  attendance: string; // PRESENT | LATE | ABSENT
}

const HEADERS = ["Date", "Branch Code", "Driver Name", "Orders", "Attendance"];

export function buildAmericanaXlsxBuffer(opts?: {
  rows?: AmericanaRowInput[];
  badHeaders?: boolean;
}): Buffer {
  const rows = opts?.rows ?? [
    {
      date: "2026-05-01",
      branchCode: "KW-AVN-001",
      driverName: "Ahmed Salah",
      ordersCount: 35,
      attendance: "PRESENT",
    },
    {
      date: "2026-05-02",
      branchCode: "KW-AVN-001",
      driverName: "Khalid Omar",
      ordersCount: 28,
      attendance: "LATE",
    },
  ];
  const headers = opts?.badHeaders ? ["bogus"] : HEADERS;
  const aoa: unknown[][] = [
    headers,
    ...rows.map((r) => [r.date, r.branchCode, r.driverName, r.ordersCount, r.attendance]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DailyOrders");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function buildBadAmericanaXlsx(): Buffer {
  return buildAmericanaXlsxBuffer({ badHeaders: true });
}
