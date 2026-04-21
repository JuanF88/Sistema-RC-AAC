import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { sendEmail, type EmailPayload } from "@/lib/email";

type SendEmailPayload = EmailPayload & {
  messages?: EmailPayload[];
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeRecipients(value: string | string[]): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .filter(isValidEmail);
}

function normalizeMessage(input: EmailPayload): EmailPayload {
  const to = normalizeRecipients(input.to);
  if (to.length === 0) {
    throw new Error("El correo debe tener al menos un destinatario valido en 'to'.");
  }

  const subject = input.subject?.trim();
  if (!subject) {
    throw new Error("El correo debe tener asunto.");
  }

  return {
    to,
    subject,
    text: input.text,
    html: input.html,
    cc: input.cc ? normalizeRecipients(input.cc) : undefined,
    bcc: input.bcc ? normalizeRecipients(input.bcc) : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }

    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite enviar correos." }, { status: 403 });
    }

    const payload = (await request.json()) as SendEmailPayload;

    const normalizedMessages = Array.isArray(payload.messages)
      ? payload.messages.map(normalizeMessage)
      : [normalizeMessage(payload)];

    let sent = 0;
    const failed: Array<{ index: number; error: string }> = [];

    for (let index = 0; index < normalizedMessages.length; index += 1) {
      const message = normalizedMessages[index];
      try {
        await sendEmail({
          ...message,
          audit: {
            source: "manual-notification",
            actorUsername: session.username,
          },
        });
        sent += 1;
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Unknown send error";
        failed.push({ index, error: messageText });
      }
    }

    return NextResponse.json({
      ok: failed.length === 0,
      sent,
      failedCount: failed.length,
      failed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown send email error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
