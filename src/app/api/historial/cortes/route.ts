import { generateCortes, listCortes, monthLabel } from "@/lib/cortes-mensuales";

type CortesRequest = {
  /** Meses concretos a generar, en formato "2026-08". Si falta, se generan los pendientes. */
  months?: string[];
};

export async function GET() {
  try {
    const { cortes, missing } = await listCortes();

    return Response.json({
      success: true,
      data: cortes,
      missing: missing.map((month) => ({ month, label: monthLabel(month) })),
    });
  } catch (error) {
    console.error("Error listando los cortes mensuales:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const parsedBody: CortesRequest | null =
      rawBody.trim().length > 0 ? (JSON.parse(rawBody) as CortesRequest) : null;

    const months = Array.isArray(parsedBody?.months) ? parsedBody?.months : undefined;
    const result = await generateCortes({ months });

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error("Error generando los cortes mensuales:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return Response.json({ error: message }, { status: 500 });
  }
}
