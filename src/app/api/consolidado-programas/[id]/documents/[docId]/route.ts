import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { registerChangeAudit } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string; docId: string }>;
};

const BUCKET_NAME = "documentos";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for admin updates.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }
    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar datos." }, { status: 403 });
    }

    const { id, docId } = await context.params;

    if (!isValidUuid(id) || !isValidUuid(docId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const client = getAdminClient();

    const { data: found, error: findError } = await client
      .from("consolidado_documentos")
      .select("id, storage_path")
      .eq("id", docId)
      .eq("program_id", id)
      .single();

    if (findError || !found) {
      return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
    }

    if (found.storage_path) {
      await client.storage.from(BUCKET_NAME).remove([found.storage_path]);
    }

    const { error } = await client.from("consolidado_documentos").delete().eq("id", docId).eq("program_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "DELETE",
      resource: "consolidado_documentos",
      details: { id: docId, programId: id },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown documents delete error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

