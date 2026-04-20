import fs from "fs";
import path from "path";
import { prisma } from "../config";
import { logger } from "../config/logger";
import { parseAmericanaDailyXlsx } from "./americanaDailyParser";

// A1 · IMAP watcher. Polls configured mailboxes every 10 minutes, finds new
// messages with XLSX attachments, de-dupes on message-id, stages them into
// AmericanaDailyIngestion, and creates a supervisor notification.
//
// Configuration lives in tenant.settings.americana.ingest:
//   { host, port, secure, user, password, mailbox? }
// When any of these are missing we skip the tenant silently — the manual
// upload route remains the working fallback.

interface InboxConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  password: string;
  mailbox?: string;
}

function readTenantConfig(settings: any): InboxConfig | null {
  const cfg = settings?.americana?.ingest;
  if (!cfg) return null;
  if (!cfg.host || !cfg.user || !cfg.password) return null;
  return {
    host: cfg.host,
    port: cfg.port ?? 993,
    secure: cfg.secure !== false,
    user: cfg.user,
    password: cfg.password,
    mailbox: cfg.mailbox ?? "INBOX",
  };
}

async function saveAttachment(tenantId: string, buffer: Buffer, filename: string): Promise<string> {
  const dir = path.join(__dirname, "..", "..", "uploads", "americana-feed", tenantId);
  fs.mkdirSync(dir, { recursive: true });
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const out = path.join(dir, `${Date.now()}-${safe}`);
  fs.writeFileSync(out, buffer);
  return `/uploads/americana-feed/${tenantId}/${path.basename(out)}`;
}

export async function pollTenantInbox(tenantId: string, cfg: InboxConfig): Promise<number> {
  let ImapFlow: any;
  try {
    ({ ImapFlow } = await import("imapflow"));
  } catch (err: any) {
    logger.warn({ err }, "[americanaInboxWatcher] imapflow not installed");
    return 0;
  }

  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.password },
    logger: false,
  });

  let staged = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock(cfg.mailbox || "INBOX");
    try {
      // Only look at messages from the last 3 days to bound work
      const since = new Date();
      since.setDate(since.getDate() - 3);
      for await (const msg of client.fetch({ since }, { source: true, envelope: true, bodyStructure: true })) {
        const messageId = (msg.envelope?.messageId || "").trim();
        if (!messageId) continue;

        const exists = await prisma.americanaDailyIngestion.findFirst({
          where: { tenantId, emailMessageId: messageId },
          select: { id: true },
        });
        if (exists) continue;

        // Pull XLSX parts
        const parts = collectParts(msg.bodyStructure);
        const xlsxPart = parts.find((p) =>
          (p.disposition === "attachment" || p.disposition === "inline") &&
          (p.type?.toLowerCase() === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            (p.dispositionParameters?.filename || "").toLowerCase().endsWith(".xlsx"))
        );
        if (!xlsxPart) continue;

        const download = await client.download(String(msg.uid), xlsxPart.part, { uid: true });
        const buffer = await streamToBuffer(download.content);
        const { rows, ingestDate } = parseAmericanaDailyXlsx(buffer);
        if (rows.length === 0) continue;

        const filename = xlsxPart.dispositionParameters?.filename || "feed.xlsx";
        const url = await saveAttachment(tenantId, buffer, filename);

        await prisma.americanaDailyIngestion.create({
          data: {
            tenantId,
            source: "EMAIL",
            emailMessageId: messageId,
            rawFileUrl: url,
            ingestDate: ingestDate ?? new Date(),
            status: "PENDING_REVIEW",
            parsedRows: rows as any,
            rowCount: rows.length,
          },
        });

        const storeCount = new Set(rows.map((r) => r.storeName).filter(Boolean)).size;
        const driverCount = new Set(rows.map((r) => r.empId).filter(Boolean)).size;
        try {
          await prisma.notification.create({
            data: {
              tenantId,
              title: "Americana daily ingest ready for approval",
              message: `${driverCount} drivers, ${storeCount} stores`,
              type: "AMERICANA_INGEST_READY",
              severity: "MEDIUM",
              category: "OPS_TODO",
            },
          });
        } catch {}
        staged++;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
  return staged;
}

function collectParts(node: any, acc: any[] = []): any[] {
  if (!node) return acc;
  if (node.childNodes && Array.isArray(node.childNodes)) {
    for (const c of node.childNodes) collectParts(c, acc);
  } else {
    acc.push(node);
  }
  return acc;
}

function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

let timer: NodeJS.Timeout | null = null;
let running = false;

async function pollAllTenants() {
  if (running) return;
  running = true;
  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true, settings: true } });
    for (const t of tenants) {
      const cfg = readTenantConfig(t.settings as any);
      if (!cfg) continue;
      try {
        const staged = await pollTenantInbox(t.id, cfg);
        if (staged > 0) logger.info({ tenantId: t.id, staged }, "[americanaInboxWatcher] staged feeds");
      } catch (err: any) {
        logger.error({ err, tenantId: t.id }, "[americanaInboxWatcher] tenant poll failed");
      }
    }
  } finally {
    running = false;
  }
}

const TEN_MINUTES = 10 * 60 * 1000;

export function startAmericanaInboxWatcher() {
  if (timer) return;
  if (process.env.DISABLE_AMERICANA_WATCHER === "1") return;
  timer = setInterval(pollAllTenants, TEN_MINUTES);
  // initial delayed kickoff
  setTimeout(pollAllTenants, 60 * 1000);
  logger.info("[americanaInboxWatcher] scheduler started (every 10 min)");
}

export function stopAmericanaInboxWatcher() {
  if (timer) { clearInterval(timer); timer = null; }
}
