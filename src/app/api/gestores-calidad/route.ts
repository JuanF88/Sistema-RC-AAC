import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionFromRequest } from "@/lib/auth";
import { areValidManagerEmails, normalizeManagerEmails } from "@/lib/qualityManagers";

type GestorPayload = {
  faculty?: string;
  title?: string;
  fullName?: string;
  institutionalEmail?: string;
  personalEmail?: string;
  phone?: string;
  office?: string;
  extension?: string;
  period?: string;
  officialLetter?: string;
  isActive?: boolean;
};

const GESTOR_FIELDS =
  "id,faculty,title,full_name,institutional_email,personal_email,phone,office,extension,period,official_letter,is_active,created_at";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for gestores de calidad.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

// Los campos opcionales se guardan como NULL cuando llegan vacios, para que la
// tabla no mezcle cadenas vacias con ausencia de dato.
function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("gestores_calidad")
      .select(GESTOR_FIELDS)
      .order("faculty", { ascending: true })
      .order("full_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown gestores read error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesión no válida o expirada." }, { status: 401 });
    }

    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar los gestores de calidad." }, { status: 403 });
    }

    const payload = (await request.json()) as GestorPayload;
    const faculty = payload.faculty?.trim() ?? "";
    const fullName = payload.fullName?.trim() ?? "";

    if (!faculty) {
      return NextResponse.json({ error: "La facultad o dependencia es obligatoria." }, { status: 400 });
    }
    if (!fullName) {
      return NextResponse.json({ error: "El nombre del gestor es obligatorio." }, { status: 400 });
    }

    // Ambos campos admiten varios correos separados por punto y coma; se validan
    // uno por uno y se guardan normalizados.
    const institutionalEmail = optionalText(payload.institutionalEmail);
    const personalEmail = optionalText(payload.personalEmail);
    if (institutionalEmail && !areValidManagerEmails(institutionalEmail)) {
      return NextResponse.json({ error: "Hay un correo institucional que no es válido." }, { status: 400 });
    }
    if (personalEmail && !areValidManagerEmails(personalEmail)) {
      return NextResponse.json({ error: "Hay un correo personal que no es válido." }, { status: 400 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("gestores_calidad")
      .upsert(
        {
          faculty,
          full_name: fullName,
          title: optionalText(payload.title),
          institutional_email: normalizeManagerEmails(institutionalEmail),
          personal_email: normalizeManagerEmails(personalEmail),
          phone: optionalText(payload.phone),
          office: optionalText(payload.office),
          extension: optionalText(payload.extension),
          period: optionalText(payload.period),
          official_letter: optionalText(payload.officialLetter),
          is_active: payload.isActive ?? true,
        },
        { onConflict: "faculty,full_name" },
      )
      .select(GESTOR_FIELDS)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown gestores write error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
