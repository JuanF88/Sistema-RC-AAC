import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getSessionFromRequest } from "@/lib/auth";

type EmailAuditRow = {
  id: string;
  created_at: string;
  sent_at: string | null;
  status: "sent" | "failed";
  source: string | null;
  actor_username: string | null;
  subject: string;
  recipients: string[];
  cc_recipients: string[] | null;
  bcc_recipients: string[] | null;
  has_attachments: boolean;
  attachment_names: string[] | null;
  error_message: string | null;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for email history.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("notifications_email_audit")
      .select("id,created_at,sent_at,status,source,actor_username,subject,recipients,cc_recipients,bcc_recipients,has_attachments,attachment_names,error_message")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: (data ?? []) as EmailAuditRow[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email history error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}