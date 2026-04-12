/**
 * Pluggable channel registry for outbound notifications. Each channel is
 * a minimal async function; real implementations are wired in via env flags
 * so this file stays dependency-free. To enable a real provider install the
 * underlying SDK and replace the corresponding channel function.
 *
 *   WhatsApp / SMS : Twilio       → npm i twilio         → set TWILIO_* envs
 *   Email          : SendGrid     → npm i @sendgrid/mail → set SENDGRID_API_KEY
 *                    or Resend    → npm i resend         → set RESEND_API_KEY
 *                    or Nodemailer→ npm i nodemailer     → set SMTP_* envs
 *
 * Until a provider is configured the channel logs a warning so missing
 * dispatches are visible rather than silently dropped.
 */

export type ChannelResult = {
  ok: boolean;
  provider: string;
  error?: string;
};

export type WhatsAppFn = (phone: string, message: string) => Promise<ChannelResult>;
export type SmsFn = (phone: string, message: string) => Promise<ChannelResult>;
export type EmailFn = (email: string, subject: string, body: string) => Promise<ChannelResult>;

async function stubWarn(channel: string, target: string, message: string): Promise<ChannelResult> {
  console.warn(`[notify:${channel}] no provider configured — would send to ${target}: ${message}`);
  return { ok: false, provider: "stub", error: "no provider configured" };
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────
export const sendWhatsApp: WhatsAppFn = async (phone, message) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
    return stubWarn("whatsapp", phone, message);
  }
  try {
    // Lazy-require so the app still boots without `twilio` installed.
    const twilio = require("twilio");
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${phone}`,
      body: message,
    });
    return { ok: true, provider: "twilio" };
  } catch (e: any) {
    return { ok: false, provider: "twilio", error: e?.message || String(e) };
  }
};

// ─── SMS ────────────────────────────────────────────────────────────────────
export const sendSms: SmsFn = async (phone, message) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_SMS_FROM) {
    return stubWarn("sms", phone, message);
  }
  try {
    const twilio = require("twilio");
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      from: process.env.TWILIO_SMS_FROM,
      to: phone,
      body: message,
    });
    return { ok: true, provider: "twilio" };
  } catch (e: any) {
    return { ok: false, provider: "twilio", error: e?.message || String(e) };
  }
};

// ─── Email ──────────────────────────────────────────────────────────────────
export const sendEmail: EmailFn = async (email, subject, body) => {
  // Prefer SendGrid if configured
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM) {
    try {
      const sgMail = require("@sendgrid/mail");
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM,
        subject,
        text: body,
      });
      return { ok: true, provider: "sendgrid" };
    } catch (e: any) {
      return { ok: false, provider: "sendgrid", error: e?.message || String(e) };
    }
  }

  // Fall back to Resend
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
    try {
      const { Resend } = require("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: email,
        subject,
        text: body,
      });
      return { ok: true, provider: "resend" };
    } catch (e: any) {
      return { ok: false, provider: "resend", error: e?.message || String(e) };
    }
  }

  return stubWarn("email", email, `${subject}: ${body}`);
};
