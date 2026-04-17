import nodemailer from "nodemailer";

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
};

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
}
