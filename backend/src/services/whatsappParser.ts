/**
 * WhatsApp Message Parser
 *
 * Parses pasted WhatsApp chat messages from drivers reporting deliveries.
 * Expected message format (each field on its own line or as a single message):
 *   Date
 *   Time of arrival
 *   Order number
 *   Source (cash or knet)
 *   Cash collected
 *
 * Example driver message:
 *   04/04/2026
 *   8:25 PM
 *   ORD-12345
 *   Cash
 *   5.500
 */

export interface ParsedWhatsAppOrder {
  date: string | null;
  arrivalTime: string | null;
  orderNumber: string | null;
  paymentSource: "CASH" | "KNET" | null;
  cashCollected: number | null;
  driverName: string | null;
  rawText: string;
}

// Common date formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, D/M/YYYY
const DATE_PATTERNS = [
  /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,      // DD/MM/YYYY or DD-MM-YYYY
  /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,        // YYYY-MM-DD
  /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,        // DD/MM/YY
];

// Time patterns: 8:25 PM, 20:25, 8:25pm
const TIME_PATTERN = /^(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?$/;

// Order number: alphanumeric with optional dashes/hashes
const ORDER_PATTERN = /^[A-Za-z]*[-#]?\d{3,}[A-Za-z0-9\-]*$/;

// Payment source
const PAYMENT_PATTERN = /^(cash|knet|k-?net|كاش|كي نت)$/i;

// Amount: numeric with optional decimals
const AMOUNT_PATTERN = /^(\d+(?:\.\d{1,3})?)(?:\s*(?:KD|د\.ك))?$/i;

// WhatsApp timestamp pattern: [DD/MM/YYYY, HH:MM:SS] or just timestamps to strip
const WA_TIMESTAMP = /^\[?\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\]?\s*[-–]?\s*/;

// WhatsApp sender pattern: "Name:" at start of message
const WA_SENDER = /^([^:]{2,30}):\s*/;

function parseDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      if (pattern === DATE_PATTERNS[1]) {
        // YYYY-MM-DD
        return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
      }
      // DD/MM/YYYY or DD/MM/YY
      const day = match[1].padStart(2, "0");
      const month = match[2].padStart(2, "0");
      let year = match[3];
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

function parseTime(text: string): string | null {
  const match = text.match(TIME_PATTERN);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

function parsePaymentSource(text: string): "CASH" | "KNET" | null {
  const lower = text.toLowerCase().trim();
  if (lower === "cash" || lower === "كاش") return "CASH";
  if (lower === "knet" || lower === "k-net" || lower === "كي نت") return "KNET";
  return null;
}

/**
 * Parse a single block of WhatsApp message lines into a structured order.
 * A block is typically 5 lines from one driver message.
 */
function parseOrderBlock(lines: string[]): ParsedWhatsAppOrder {
  const result: ParsedWhatsAppOrder = {
    date: null,
    arrivalTime: null,
    orderNumber: null,
    paymentSource: null,
    cashCollected: null,
    driverName: null,
    rawText: lines.join("\n"),
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try each field type
    if (!result.date) {
      const date = parseDate(trimmed);
      if (date) { result.date = date; continue; }
    }

    if (!result.arrivalTime) {
      const time = parseTime(trimmed);
      if (time) { result.arrivalTime = time; continue; }
    }

    if (!result.paymentSource) {
      const source = parsePaymentSource(trimmed);
      if (source) { result.paymentSource = source; continue; }
    }

    if (!result.cashCollected) {
      const amountMatch = trimmed.match(AMOUNT_PATTERN);
      if (amountMatch) {
        result.cashCollected = parseFloat(amountMatch[1]);
        continue;
      }
    }

    if (!result.orderNumber) {
      if (ORDER_PATTERN.test(trimmed) || /\d{4,}/.test(trimmed)) {
        result.orderNumber = trimmed;
        continue;
      }
    }
  }

  return result;
}

/**
 * Parse a full WhatsApp chat paste containing multiple driver messages.
 * Splits on WhatsApp timestamps/sender patterns or blank-line groups.
 */
export function parseWhatsAppMessages(text: string): ParsedWhatsAppOrder[] {
  const results: ParsedWhatsAppOrder[] = [];
  const rawLines = text.split("\n");

  // Strip WhatsApp metadata (timestamps, sender names) and collect clean lines
  const cleanedMessages: { driverName: string | null; lines: string[] }[] = [];
  let currentDriver: string | null = null;
  let currentLines: string[] = [];

  for (const rawLine of rawLines) {
    let line = rawLine.trim();
    if (!line) {
      // Blank line might separate messages
      if (currentLines.length > 0) {
        cleanedMessages.push({ driverName: currentDriver, lines: [...currentLines] });
        currentLines = [];
      }
      continue;
    }

    // Strip WhatsApp timestamp prefix
    const tsMatch = line.match(WA_TIMESTAMP);
    if (tsMatch) {
      // New message - save previous if exists
      if (currentLines.length >= 3) {
        cleanedMessages.push({ driverName: currentDriver, lines: [...currentLines] });
        currentLines = [];
      }
      line = line.slice(tsMatch[0].length).trim();
    }

    // Extract sender name
    const senderMatch = line.match(WA_SENDER);
    if (senderMatch) {
      if (currentLines.length >= 3) {
        cleanedMessages.push({ driverName: currentDriver, lines: [...currentLines] });
        currentLines = [];
      }
      currentDriver = senderMatch[1].trim();
      line = line.slice(senderMatch[0].length).trim();
    }

    if (line) {
      currentLines.push(line);
    }
  }

  // Push remaining lines
  if (currentLines.length > 0) {
    cleanedMessages.push({ driverName: currentDriver, lines: currentLines });
  }

  // If no clear message boundaries were found, try splitting by groups of 5 lines
  if (cleanedMessages.length === 1 && cleanedMessages[0].lines.length > 5) {
    const allLines = cleanedMessages[0].lines;
    const driver = cleanedMessages[0].driverName;
    for (let i = 0; i < allLines.length; i += 5) {
      const chunk = allLines.slice(i, i + 5);
      if (chunk.length >= 3) {
        const parsed = parseOrderBlock(chunk);
        parsed.driverName = driver;
        if (parsed.date || parsed.orderNumber || parsed.cashCollected != null) {
          results.push(parsed);
        }
      }
    }
    return results;
  }

  // Parse each message block
  for (const msg of cleanedMessages) {
    if (msg.lines.length < 2) continue;
    const parsed = parseOrderBlock(msg.lines);
    parsed.driverName = msg.driverName;
    if (parsed.date || parsed.orderNumber || parsed.cashCollected != null) {
      results.push(parsed);
    }
  }

  return results;
}
