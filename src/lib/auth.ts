import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const SESSION_COOKIE_NAME = "siac_session";

export type AuthUserRole = "administrador" | "usuario" | "visualizador";

export type AuthSession = {
  sid: string;
  username: string;
  displayName: string;
  role: AuthUserRole;
  iat: number;
  exp: number;
};

type LoginUser = {
  username: string;
  password: string;
  displayName: string;
  role: AuthUserRole;
};

function toBase64Url(value: Buffer): string {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing AUTH_SESSION_SECRET in environment.");
  }
  return secret;
}

function signPayload(payload: string): string {
  const mac = crypto.createHmac("sha256", getSessionSecret()).update(payload).digest();
  return toBase64Url(mac);
}

function parseUsersFromEnv(): LoginUser[] {
  const usersJson = process.env.AUTH_USERS_JSON?.trim();
  if (usersJson) {
    try {
      const parsed = JSON.parse(usersJson) as Array<{ username?: string; password?: string; displayName?: string }>;
      const users = parsed
        .map((item) => ({
          username: item.username?.trim() ?? "",
          password: item.password?.trim() ?? "",
          displayName: item.displayName?.trim() || item.username?.trim() || "Usuario",
          role: (item as { role?: string }).role === "visualizador" || (item as { role?: string }).role === "usuario" || (item as { role?: string }).role === "administrador"
            ? ((item as { role?: AuthUserRole }).role as AuthUserRole)
            : "administrador",
        }))
        .filter((item) => item.username && item.password);
      if (users.length > 0) return users;
    } catch {
      // Fall back to single-user env vars.
    }
  }

  const username = process.env.AUTH_USERNAME?.trim() ?? "";
  const password = process.env.AUTH_PASSWORD?.trim() ?? "";
  const displayName = process.env.AUTH_DISPLAY_NAME?.trim() || username;
  const roleRaw = process.env.AUTH_ROLE?.trim()?.toLowerCase();
  const role: AuthUserRole = roleRaw === "visualizador" || roleRaw === "usuario" ? roleRaw : "administrador";

  if (!username || !password) {
    return [];
  }

  return [{ username, password, displayName, role }];
}

type DbUserRow = {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  role: AuthUserRole;
  is_active: boolean;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for auth users.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export function hashAuthPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function validateCredentialsFromDb(
  username: string,
  password: string,
): Promise<{ username: string; displayName: string; role: AuthUserRole } | null> {
  try {
    const client = getAdminClient();
    const normalized = username.trim().toLowerCase();

    const { data, error } = await client
      .from("auth_app_users")
      .select("id,username,password_hash,display_name,role,is_active")
      .ilike("username", normalized)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as DbUserRow;
    const passwordHash = hashAuthPassword(password);
    const storedPassword = row.password_hash?.trim() ?? "";
    const storedLooksHashed = /^[a-f0-9]{64}$/i.test(storedPassword);

    const validPassword = storedLooksHashed
      ? safeEqual(storedPassword.toLowerCase(), passwordHash)
      : safeEqual(storedPassword, password);

    if (!validPassword) return null;

    if (!storedLooksHashed) {
      // If an operator inserted a plaintext password in DB, migrate it to hash on first successful login.
      await client.from("auth_app_users").update({ password_hash: passwordHash }).eq("id", row.id);
    }

    return {
      username: row.username,
      displayName: row.display_name,
      role: row.role,
    };
  } catch {
    return null;
  }
}

export async function validateCredentials(username: string, password: string): Promise<{ username: string; displayName: string; role: AuthUserRole } | null> {
  const dbUser = await validateCredentialsFromDb(username, password);
  if (dbUser) return dbUser;

  const users = parseUsersFromEnv();
  const user = users.find((item) => item.username === username.trim());
  if (!user) return null;
  if (!safeEqual(user.password, password)) return null;
  return { username: user.username, displayName: user.displayName, role: user.role };
}

export function issueSessionToken(input: { sid: string; username: string; displayName: string; role: AuthUserRole; ttlSeconds?: number }): string {
  const now = Math.floor(Date.now() / 1000);
  const ttl = input.ttlSeconds ?? 60 * 60 * 8;
  const payload: AuthSession = {
    sid: input.sid,
    username: input.username,
    displayName: input.displayName,
    role: input.role,
    iat: now,
    exp: now + ttl,
  };

  const rawPayload = toBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  const signature = signPayload(rawPayload);
  return `${rawPayload}.${signature}`;
}

export function verifySessionToken(token: string | null | undefined): AuthSession | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [rawPayload, signature] = parts;
  const expected = signPayload(rawPayload);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(rawPayload).toString("utf8")) as AuthSession;
    if (!payload.sid || !payload.username || !payload.displayName || !payload.role || !payload.exp) return null;
    if (!["administrador", "usuario", "visualizador"].includes(payload.role)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

function readCookieValueFromHeader(cookieHeader: string, name: string): string | null {
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [rawName, ...rawValue] = pair.trim().split("=");
    if (rawName === name) return decodeURIComponent(rawValue.join("="));
  }
  return null;
}

export function getSessionFromRequest(request: Request): AuthSession | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = readCookieValueFromHeader(cookieHeader, SESSION_COOKIE_NAME);
  return verifySessionToken(token);
}

export async function getSessionFromServerCookies(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function getSessionCookieMaxAgeSeconds(): number {
  return 60 * 60 * 8;
}
