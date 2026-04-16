import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { registerChangeAudit } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type DocumentRow = {
  id: string;
  program_id: string;
  name: string;
  source_type: "file" | "url";
  url: string;
  storage_path: string | null;
  created_at: string;
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

async function ensureBucket(client: ReturnType<typeof getAdminClient>) {
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) throw new Error(listError.message);

  const exists = buckets.some((bucket) => bucket.name === BUCKET_NAME);
  if (exists) return;

  const { error: createError } = await client.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: "20MB",
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(createError.message);
  }
}

function mapDoc(row: DocumentRow) {
  return {
    id: row.id,
    programId: row.program_id,
    name: row.name,
    sourceType: row.source_type,
    url: row.url,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid program ID format" }, { status: 400 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("consolidado_documentos")
      .select("id, program_id, name, source_type, url, storage_path, created_at")
      .eq("program_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: (data as DocumentRow[]).map(mapDoc) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown documents fetch error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }
    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar datos." }, { status: 403 });
    }

    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid program ID format" }, { status: 400 });
    }

    const form = await request.formData();
    const sourceType = String(form.get("sourceType") ?? "").toLowerCase();
    const customName = String(form.get("name") ?? "").trim();

    if (sourceType !== "url" && sourceType !== "file") {
      return NextResponse.json({ error: "sourceType debe ser 'url' o 'file'." }, { status: 400 });
    }

    const client = getAdminClient();

    if (sourceType === "url") {
      const rawUrl = String(form.get("url") ?? "").trim();
      if (!rawUrl) {
        return NextResponse.json({ error: "La URL es obligatoria." }, { status: 400 });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(rawUrl);
      } catch {
        return NextResponse.json({ error: "La URL no es valida." }, { status: 400 });
      }

      const inferredName = parsedUrl.pathname.split("/").filter(Boolean).pop() || parsedUrl.hostname;
      const name = customName || inferredName;

      const { data, error } = await client
        .from("consolidado_documentos")
        .insert({
          program_id: id,
          name,
          source_type: "url",
          url: rawUrl,
          storage_path: null,
        })
        .select("id, program_id, name, source_type, url, storage_path, created_at")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      await registerChangeAudit({
        sessionId: session.sid,
        username: session.username,
        action: "CREATE",
        resource: "consolidado_documentos",
        details: { id: data.id, programId: id, sourceType: "url" },
      }).catch(() => undefined);

      return NextResponse.json({ data: mapDoc(data as DocumentRow) }, { status: 201 });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Debes adjuntar un archivo." }, { status: 400 });
    }

    await ensureBucket(client);

    const buffer = Buffer.from(await file.arrayBuffer());
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${id}/${Date.now()}-${cleanName}`;

    const { error: uploadError } = await client.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream", upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const publicUrlData = client.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    const publicUrl = publicUrlData.data.publicUrl;
    const name = customName || file.name;

    const { data, error } = await client
      .from("consolidado_documentos")
      .insert({
        program_id: id,
        name,
        source_type: "file",
        url: publicUrl,
        storage_path: storagePath,
      })
      .select("id, program_id, name, source_type, url, storage_path, created_at")
      .single();

    if (error) {
      await client.storage.from(BUCKET_NAME).remove([storagePath]);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "CREATE",
      resource: "consolidado_documentos",
      details: { id: data.id, programId: id, sourceType: "file" },
    }).catch(() => undefined);

    return NextResponse.json({ data: mapDoc(data as DocumentRow) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown documents create error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

