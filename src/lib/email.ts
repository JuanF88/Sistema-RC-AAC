import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type EmailPayload = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  audit?: {
    source?: string;
    actorUsername?: string;
  };
};

type EmailAuditStatus = "sent" | "failed";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for email audit logging.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function normalizeRecipients(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter((item) => item.length > 0);
}

async function recordEmailAudit(input: {
  payload: EmailPayload;
  status: EmailAuditStatus;
  errorMessage?: string | null;
}): Promise<void> {
  try {
    const client = getAdminClient();
    const { error } = await client.from("notifications_email_audit").insert({
      status: input.status,
      source: input.payload.audit?.source?.trim() || null,
      actor_username: input.payload.audit?.actorUsername?.trim() || null,
      subject: input.payload.subject.trim(),
      recipients: normalizeRecipients(input.payload.to),
      cc_recipients: normalizeRecipients(input.payload.cc),
      bcc_recipients: normalizeRecipients(input.payload.bcc),
      has_attachments: Boolean(input.payload.attachments?.length),
      attachment_names: input.payload.attachments?.map((attachment) => attachment.filename).filter((value): value is string => Boolean(value)) ?? [],
      sent_at: input.status === "sent" ? new Date().toISOString() : null,
      error_message: input.errorMessage ?? null,
    });

    if (error) {
      console.error("Email audit insert error:", error.message);
    }
  } catch (error) {
    console.error("Email audit failure:", error instanceof Error ? error.message : error);
  }
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parsePort(value: string | undefined, fallback = 587): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = parsePort(process.env.SMTP_PORT, 587);
  const secure = parseBoolean(process.env.SMTP_SECURE, false);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();

  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");
  if (!from) missing.push("SMTP_FROM");

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    missing,
  };
}

function createTransporter() {
  const config = getSmtpConfig();
  if (config.missing.length > 0) {
    throw new Error(`SMTP incompleto. Faltan variables: ${config.missing.join(", ")}`);
  }

  return {
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    }),
    from: config.from as string,
  };
}

export async function verifySmtpConnection(): Promise<void> {
  const { transporter } = createTransporter();
  await transporter.verify();
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const { transporter, from } = createTransporter();
  const text = payload.text?.trim();
  const html = payload.html?.trim();

  if (!text && !html) {
    throw new Error("El correo debe incluir al menos text o html.");
  }

  try {
    await transporter.sendMail({
      from,
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
      text: text || undefined,
      html: html || undefined,
      attachments: payload.attachments,
    });

    await recordEmailAudit({ payload, status: "sent" });
  } catch (error) {
    await recordEmailAudit({
      payload,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown send error",
    });
    throw error;
  }
}
