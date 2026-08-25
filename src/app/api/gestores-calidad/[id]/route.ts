import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionFromRequest } from "@/lib/auth";
import { areValidManagerEmails, normalizeManagerEmails } from "@/lib/qualityManagers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type GestorPatchPayload = {
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

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesión no válida o expirada." }, { status: 401 });
    }

    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar los gestores de calidad." }, { status: 403 });
    }

    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid gestor ID format" }, { status: 400 });
    }

    const payload = (await request.json()) as GestorPatchPayload;

    if (payload.faculty !== undefined && !payload.faculty.trim()) {
      return NextResponse.json({ error: "La facultad o dependencia es obligatoria." }, { status: 400 });
    }
    if (payload.fullName !== undefined && !payload.fullName.trim()) {
      return NextResponse.json({ error: "El nombre del gestor es obligatorio." }, { status: 400 });
    }
    // Ambos campos admiten varios correos separados por punto y coma.
    if (payload.institutionalEmail?.trim() && !areValidManagerEmails(payload.institutionalEmail)) {
      return NextResponse.json({ error: "Hay un correo institucional que no es válido." }, { status: 400 });
    }
    if (payload.personalEmail?.trim() && !areValidManagerEmails(payload.personalEmail)) {
      return NextResponse.json({ error: "Hay un correo personal que no es válido." }, { status: 400 });
    }

    // Solo se escriben los campos que vienen en la peticion: asi el boton de
    // activar/desactivar no borra el resto de los datos de contacto.
    const client = getAdminClient();
    const { data, error } = await client
      .from("gestores_calidad")
      .update({
        ...(payload.faculty !== undefined ? { faculty: payload.faculty.trim() } : {}),
        ...(payload.fullName !== undefined ? { full_name: payload.fullName.trim() } : {}),
        ...(payload.title !== undefined ? { title: optionalText(payload.title) } : {}),
        ...(payload.institutionalEmail !== undefined
          ? { institutional_email: normalizeManagerEmails(payload.institutionalEmail) }
          : {}),
        ...(payload.personalEmail !== undefined
          ? { personal_email: normalizeManagerEmails(payload.personalEmail) }
          : {}),
        ...(payload.phone !== undefined ? { phone: optionalText(payload.phone) } : {}),
        ...(payload.office !== undefined ? { office: optionalText(payload.office) } : {}),
        ...(payload.extension !== undefined ? { extension: optionalText(payload.extension) } : {}),
        ...(payload.period !== undefined ? { period: optionalText(payload.period) } : {}),
        ...(payload.officialLetter !== undefined ? { official_letter: optionalText(payload.officialLetter) } : {}),
        ...(payload.isActive !== undefined ? { is_active: payload.isActive } : {}),
      })
      .eq("id", id)
      .select(GESTOR_FIELDS)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown gestor update error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesión no válida o expirada." }, { status: 401 });
    }

    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite eliminar gestores de calidad." }, { status: 403 });
    }

    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid gestor ID format" }, { status: 400 });
    }

    const client = getAdminClient();
    const { error } = await client.from("gestores_calidad").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown gestor delete error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
