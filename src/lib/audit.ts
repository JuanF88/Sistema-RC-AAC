import { createClient } from "@supabase/supabase-js";

type LoginAuditInput = {
  sessionId: string;
  username: string;
  displayName: string;
  ipAddress: string | null;
  userAgent: string | null;
};

type ChangeAuditInput = {
  sessionId: string;
  username: string;
  action: string;
  resource: string;
  details?: Record<string, unknown> | null;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for audit logging.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export async function registerLoginAudit(input: LoginAuditInput): Promise<void> {
  const client = getAdminClient();

  const { error } = await client.from("auth_audit_sessions").upsert(
    {
      session_id: input.sessionId,
      username: input.username,
      display_name: input.displayName,
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
      login_at: new Date().toISOString(),
      logout_at: null,
      has_changes: false,
      last_change_at: null,
    },
    { onConflict: "session_id" },
  );

  if (error) throw new Error(error.message);
}

export async function closeOtherActiveSessionsForUser(input: { username: string; keepSessionId: string }): Promise<void> {
  const client = getAdminClient();
  const { error } = await client
    .from("auth_audit_sessions")
    .update({ logout_at: new Date().toISOString() })
    .eq("username", input.username)
    .is("logout_at", null)
    .neq("session_id", input.keepSessionId);

  if (error) throw new Error(error.message);
}

export async function registerLogoutAudit(sessionId: string): Promise<void> {
  const client = getAdminClient();
  const { error } = await client
    .from("auth_audit_sessions")
    .update({ logout_at: new Date().toISOString() })
    .eq("session_id", sessionId);

  if (error) throw new Error(error.message);
}

export async function registerChangeAudit(input: ChangeAuditInput): Promise<void> {
  const client = getAdminClient();

  const { error: eventError } = await client.from("auth_audit_events").insert({
    session_id: input.sessionId,
    username: input.username,
    action: input.action,
    resource: input.resource,
    details: input.details ?? {},
  });

  if (eventError) throw new Error(eventError.message);

  const { error: updateError } = await client
    .from("auth_audit_sessions")
    .update({ has_changes: true, last_change_at: new Date().toISOString() })
    .eq("session_id", input.sessionId);

  if (updateError) throw new Error(updateError.message);
}
