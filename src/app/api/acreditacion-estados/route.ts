import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for acreditacion estados.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("acreditacion_estados_programa")
      .select("program_id,estado,informe_cgc_enviado,enviado_ministerio,acreditacion_recibida")
      .order("program_id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown accreditation estados read error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
