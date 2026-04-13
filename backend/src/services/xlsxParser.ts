import XLSX from "xlsx";

interface ColumnMapping {
  [key: string]: string;
}

interface PendingDuesRow {
  riderId?: string;
  riderName?: string;
  companyCode?: string;
  openingBalance?: number;
  totalSales?: number;
  totalCollection?: number;
  cashAlMuzaini?: number;
  bankTransfer?: number;
  incentives?: number;
  adjustments?: number;
  pendingDues?: number;
  dailyData?: { [day: string]: number };
}

function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  for (const header of headers) {
    const h = header.toLowerCase().trim();

    if (/rider\s*id|^id$/i.test(h)) {
      mapping[header] = "riderId";
    } else if (/rider\s*name|^name$/i.test(h)) {
      mapping[header] = "riderName";
    } else if (/company|^code$/i.test(h)) {
      mapping[header] = "companyCode";
    } else if (/opening/i.test(h)) {
      mapping[header] = "openingBalance";
    } else if (/total\s*sale/i.test(h)) {
      mapping[header] = "totalSales";
    } else if (/total\s*collect/i.test(h)) {
      mapping[header] = "totalCollection";
    } else if (/cash|muzaini/i.test(h)) {
      mapping[header] = "cashAlMuzaini";
    } else if (/bank|transfer/i.test(h)) {
      mapping[header] = "bankTransfer";
    } else if (/incentive|tip/i.test(h)) {
      mapping[header] = "incentives";
    } else if (/adjust/i.test(h)) {
      mapping[header] = "adjustments";
    } else if (/pending|due/i.test(h)) {
      mapping[header] = "pendingDues";
    } else if (/^\d{1,2}$/.test(h)) {
      // Numeric day headers (1, 2, 3... or 01, 02, 03...)
      mapping[header] = `day_${parseInt(h, 10)}`;
    }
  }

  return mapping;
}

// ─── Shift schedule import ───────────────────────────────────────────────────
// Expected columns (flexible — matches what Keeta/Talabat operators typically
// share): date, driver id or name, zone, start, end. Start/end can be either
// full datetimes or HH:MM — when only time is provided we combine with date.

export interface ShiftScheduleRow {
  date: Date;
  driverIdentifier: string; // platformDriverId, utr, or name
  zone?: string;
  scheduledStart: Date;
  scheduledEnd: Date;
}

function excelDateToJs(value: any): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    // Excel serial date
    const utcDays = Math.floor(value - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const fractional = value - Math.floor(value) + 0.0000001;
    const totalSeconds = Math.floor(86400 * fractional);
    dateInfo.setUTCSeconds(totalSeconds);
    return dateInfo;
  }
  const parsed = new Date(String(value));
  return isNaN(parsed.getTime()) ? null : parsed;
}

function combineDateAndTime(date: Date, timeValue: any): Date | null {
  if (timeValue == null || timeValue === "") return null;

  // Already a full date?
  if (timeValue instanceof Date) return timeValue;
  if (typeof timeValue === "number" && timeValue > 1) {
    return excelDateToJs(timeValue);
  }

  // Parse HH:MM or HH:MM:SS
  const str = String(timeValue).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) {
    // Excel fractional day (e.g., 0.5 = 12:00)
    const num = parseFloat(str);
    if (!isNaN(num) && num >= 0 && num < 1) {
      const totalSeconds = Math.floor(num * 86400);
      const result = new Date(date);
      result.setUTCHours(0, 0, 0, 0);
      result.setUTCSeconds(totalSeconds);
      return result;
    }
    return null;
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  const ampm = match[4]?.toLowerCase();
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;

  const result = new Date(date);
  result.setUTCHours(hours, minutes, seconds, 0);
  return result;
}

export function parseShiftScheduleXlsx(buffer: Buffer): ShiftScheduleRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { raw: true });

  if (rawRows.length === 0) return [];

  const headers = Object.keys(rawRows[0]);
  const col = {
    date: headers.find((h) => /^date$/i.test(h) || /shift.*date/i.test(h)),
    driver: headers.find(
      (h) => /rider.*id|driver.*id|platform.*id|utr|courier.*id/i.test(h),
    ),
    driverName: headers.find((h) => /driver|rider|courier|name/i.test(h)),
    zone: headers.find((h) => /zone|area/i.test(h)),
    start: headers.find((h) => /start|from|scheduled.*start|shift.*start/i.test(h)),
    end: headers.find((h) => /end|to|scheduled.*end|shift.*end/i.test(h)),
  };

  if (!col.date || (!col.driver && !col.driverName) || !col.start || !col.end) {
    throw new Error(
      `Shift schedule xlsx missing required columns. Need date, driver, start, end. Found: ${headers.join(", ")}`,
    );
  }

  const parsed: ShiftScheduleRow[] = [];

  for (const raw of rawRows) {
    const date = excelDateToJs(raw[col.date]);
    if (!date) continue;

    const driverIdentifier = String(
      raw[col.driver!] ?? raw[col.driverName!] ?? "",
    ).trim();
    if (!driverIdentifier) continue;

    const scheduledStart = combineDateAndTime(date, raw[col.start!]);
    const scheduledEnd = combineDateAndTime(date, raw[col.end!]);
    if (!scheduledStart || !scheduledEnd) continue;

    // Handle overnight shifts (end before start → next day)
    if (scheduledEnd <= scheduledStart) {
      scheduledEnd.setUTCDate(scheduledEnd.getUTCDate() + 1);
    }

    parsed.push({
      date,
      driverIdentifier,
      zone: col.zone ? String(raw[col.zone] ?? "").trim() || undefined : undefined,
      scheduledStart,
      scheduledEnd,
    });
  }

  return parsed;
}

export function parsePendingDuesXlsx(buffer: Buffer): PendingDuesRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);

  if (rawRows.length === 0) return [];

  // Detect columns from the first row's keys (header row)
  const headers = Object.keys(rawRows[0]);
  const columnMap = detectColumnMapping(headers);

  const parsed: PendingDuesRow[] = rawRows.map((raw) => {
    const row: PendingDuesRow = {};
    const dailyData: { [day: string]: number } = {};

    for (const [originalHeader, mappedKey] of Object.entries(columnMap)) {
      const value = raw[originalHeader];

      if (mappedKey.startsWith("day_")) {
        const dayNum = mappedKey.replace("day_", "");
        dailyData[dayNum] = parseFloat(value) || 0;
      } else if (mappedKey === "riderId" || mappedKey === "riderName" || mappedKey === "companyCode") {
        (row as any)[mappedKey] = value != null ? String(value).trim() : undefined;
      } else {
        (row as any)[mappedKey] = parseFloat(value) || 0;
      }
    }

    if (Object.keys(dailyData).length > 0) {
      row.dailyData = dailyData;
    }

    return row;
  });

  return parsed;
}
