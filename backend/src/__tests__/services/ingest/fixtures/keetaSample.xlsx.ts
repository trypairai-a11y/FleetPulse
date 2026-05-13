// Phase 6 Wave 0 RED — Keeta XLSX fixture builder.
// Programmatically generates valid + invalid XLSX buffers using xlsx@0.18.5.
// Mirrors the 27-column shape expected by services/keetaXlsxParser.ts.
import * as XLSX from "xlsx";

export interface KeetaRowInput {
  date: string;
  courierPlatformId: string;
  firstName: string;
  lastName: string;
  onShift?: number;
  deliveredTasks?: number;
  acceptedTasks?: number;
  onlineTime?: number;
}

const HEADERS = [
  "Date",
  "Courier ID",
  "First Name",
  "Last Name",
  "Supervisor",
  "Vehicle Type",
  "On Shift",
  "Valid Day",
  "Online Time",
  "Valid Online Time",
  "Peak Online Minutes",
  "Accepted Tasks",
  "Restaurant Arrivals",
  "Delivered Tasks",
  "Large Orders Completed",
  "Cancelled Tasks",
  "Rejected Tasks",
  "Rejected By Courier",
  "Rejected Auto",
  "Cancellation Rate",
  "Completion Rate",
  "On Time Rate",
  "Large Order On Time Rate",
  "Avg Delivery Minutes",
  "Over 55min Proportion",
  "Overdue Orders",
  "Severely Overdue",
];

export function buildKeetaXlsxBuffer(opts?: {
  rows?: KeetaRowInput[];
  badHeaders?: boolean;
}): Buffer {
  const rows = opts?.rows ?? [
    {
      date: "2026-05-01",
      courierPlatformId: "K-001",
      firstName: "Mohamed",
      lastName: "Ali",
      onShift: 1,
      deliveredTasks: 24,
      acceptedTasks: 25,
      onlineTime: 420,
    },
    {
      date: "2026-05-02",
      courierPlatformId: "K-002",
      firstName: "Hassan",
      lastName: "Said",
      onShift: 1,
      deliveredTasks: 18,
      acceptedTasks: 19,
      onlineTime: 380,
    },
  ];
  const headers = opts?.badHeaders ? ["wrong", "header", "shape"] : HEADERS;
  const aoa: unknown[][] = [
    ["Some title row"], // parser skips row 0
    headers,
    ...rows.map((r) => [
      r.date,
      r.courierPlatformId,
      r.firstName,
      r.lastName,
      "supervisor-x",
      "MOTORCYCLE",
      r.onShift ?? 1,
      1,
      r.onlineTime ?? 400,
      r.onlineTime ?? 400,
      120,
      r.acceptedTasks ?? 20,
      r.acceptedTasks ?? 20,
      r.deliveredTasks ?? 20,
      0,
      0,
      0,
      0,
      0,
      0.0,
      1.0,
      0.95,
      0.95,
      32.0,
      0.1,
      0,
      0,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function buildBadKeetaXlsx(): Buffer {
  return buildKeetaXlsxBuffer({ badHeaders: true });
}
