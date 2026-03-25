import XLSX from "xlsx";

export interface KeetaRow {
  date: Date;
  courierPlatformId: string;
  firstName: string;
  lastName: string;
  supervisorName: string | null;
  vehicleType: string | null;
  onShift: boolean;
  validDay: boolean;
  onlineTime: number;
  validOnlineTime: number;
  peakOnlineMinutes: number;
  acceptedTasks: number;
  restaurantArrivals: number;
  deliveredTasks: number;
  largeOrdersCompleted: number;
  cancelledTasks: number;
  rejectedTasks: number;
  rejectedByCourier: number;
  rejectedAuto: number;
  cancellationRate: number | null;
  completionRate: number | null;
  onTimeRate: number | null;
  largeOrderOnTimeRate: number | null;
  avgDeliveryMinutes: number | null;
  over55minProportion: number | null;
  overdueOrders: number;
  severelyOverdue: number;
}

/**
 * Parse time strings like "12 hr, 45 min" or "57 min, 6 sec" or "0 sec" into minutes (integer).
 */
function parseTimeToMinutes(value: any): number {
  if (value == null || value === "-" || value === "") return 0;
  const str = String(value).trim();
  if (!str || str === "-") return 0;

  let totalMinutes = 0;

  const hrMatch = str.match(/(\d+)\s*hr/);
  if (hrMatch) totalMinutes += parseInt(hrMatch[1], 10) * 60;

  const minMatch = str.match(/(\d+)\s*min/);
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10);

  // seconds are ignored (rounded down to whole minutes)

  return totalMinutes;
}

/**
 * Parse a Keeta date number like 20260228 into a Date object.
 */
function parseKeetaDate(value: any): Date {
  const str = String(value).trim();
  const year = parseInt(str.substring(0, 4), 10);
  const month = parseInt(str.substring(4, 6), 10) - 1;
  const day = parseInt(str.substring(6, 8), 10);
  return new Date(year, month, day);
}

/**
 * Parse a decimal/rate value. Returns null if "-" or empty.
 */
function parseRate(value: any): number | null {
  if (value == null || value === "-" || value === "") return null;
  const n = parseFloat(String(value));
  return isNaN(n) ? null : n;
}

/**
 * Parse an integer value. Returns 0 if "-" or empty.
 */
function parseInt0(value: any): number {
  if (value == null || value === "-" || value === "") return 0;
  const n = parseInt(String(value), 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse a Keeta XLSX buffer into an array of KeetaRow objects.
 * The XLSX has 2 header rows (row 0 = merged group headers, row 1 = column headers).
 * Data starts at row 2.
 */
export function parseKeetaXlsx(buffer: Buffer): KeetaRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Get raw 2D array (header: 1 means no auto-header mapping)
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rawData.length < 3) return []; // need at least 2 header rows + 1 data row

  // Data rows start at index 2
  const rows: KeetaRow[] = [];

  for (let i = 2; i < rawData.length; i++) {
    const r = rawData[i];
    if (!r || !r[0] || !r[1]) continue; // skip empty rows

    const dateVal = r[0];
    const courierId = String(r[1]).trim();
    if (!courierId) continue;

    const onShiftVal = String(r[6] || "").trim().toLowerCase();
    const validDayVal = String(r[7] || "").trim().toLowerCase();

    rows.push({
      date: parseKeetaDate(dateVal),
      courierPlatformId: courierId,
      firstName: String(r[2] || "").trim(),
      lastName: String(r[3] || "").trim(),
      supervisorName: r[4] ? String(r[4]).trim() : null,
      vehicleType: r[5] ? String(r[5]).trim() : null,
      onShift: onShiftVal === "yes",
      validDay: validDayVal === "yes",
      onlineTime: parseTimeToMinutes(r[8]),
      validOnlineTime: parseTimeToMinutes(r[9]),
      peakOnlineMinutes: parseTimeToMinutes(r[10]),
      acceptedTasks: parseInt0(r[11]),
      restaurantArrivals: parseInt0(r[12]),
      deliveredTasks: parseInt0(r[13]),
      largeOrdersCompleted: parseInt0(r[14]),
      cancelledTasks: parseInt0(r[15]),
      rejectedTasks: parseInt0(r[16]),
      rejectedByCourier: parseInt0(r[17]),
      rejectedAuto: parseInt0(r[18]),
      cancellationRate: parseRate(r[19]),
      completionRate: parseRate(r[20]),
      onTimeRate: parseRate(r[21]),
      largeOrderOnTimeRate: parseRate(r[22]),
      avgDeliveryMinutes: parseRate(r[23]),
      over55minProportion: parseRate(r[24]),
      overdueOrders: parseInt0(r[25]),
      severelyOverdue: parseInt0(r[26]),
    });
  }

  return rows;
}
