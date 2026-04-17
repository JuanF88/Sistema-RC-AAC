import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionFromRequest } from "@/lib/auth";

type RecipientPayload = {
  email?: string;
  fullName?: string;
  isActive?: boolean;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for notifications recipients.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function GET() {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("notifications_recipients")
      .select("id,email,full_name,is_active,created_at")
      .order("email", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown recipients read error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }

    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar destinatarios." }, { status: 403 });
    }

    const payload = (await request.json()) as RecipientPayload;
    const email = payload.email?.trim().toLowerCase() ?? "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "El correo no es valido." }, { status: 400 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("notifications_recipients")
      .upsert(
        {
          email,
          full_name: payload.fullName?.trim() || null,
          is_active: payload.isActive ?? true,
        },
        { onConflict: "email" },
      )
      .select("id,email,full_name,is_active,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown recipients write error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
