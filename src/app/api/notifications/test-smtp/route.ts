import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { sendEmail, verifySmtpConnection } from "@/lib/email";

type TestSmtpPayload = {
  to?: string;
};

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }

    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite enviar correos." }, { status: 403 });
    }

    const payload = (await request.json().catch(() => ({}))) as TestSmtpPayload;

    await verifySmtpConnection();

    const targetEmail = payload.to?.trim();
    if (targetEmail) {
      const now = new Date().toLocaleString("es-CO");
      await sendEmail({
        to: targetEmail,
        subject: "Prueba SMTP - Sistema RC AAC",
        text: `Prueba SMTP exitosa. Fecha: ${now}`,
        html: `<p>Prueba SMTP exitosa.</p><p><strong>Fecha:</strong> ${now}</p>`,
      });
    }

    return NextResponse.json({
      ok: true,
      message: targetEmail
        ? `Conexión SMTP correcta y correo de prueba enviado a ${targetEmail}.`
        : "Conexión SMTP correcta.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMTP test error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
