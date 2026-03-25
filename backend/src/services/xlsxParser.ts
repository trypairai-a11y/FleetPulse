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
