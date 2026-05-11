import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getSessionFromRequest } from "@/lib/auth";

type SnapshotFrequency = "daily" | "weekly" | "biweekly" | "monthly";

type SnapshotSettingsRow = {
  id: "default";
  enabled: boolean;
  frequency: SnapshotFrequency;
  hour: number;
  minute: number;
  last_run_at: string | null;
  next_run_at: string | null;
};

type SnapshotSettingsPayload = {
  enabled?: boolean;
  frequency?: SnapshotFrequency;
  hour?: number;
  minute?: number;
};

const FREQUENCY_TO_DAYS: Record<SnapshotFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 15,
  monthly: 30,
};

const BOGOTA_OFFSET_MINUTES = -300;
const BOGOTA_OFFSET_MS = BOGOTA_OFFSET_MINUTES * 60 * 1000;

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for snapshot settings.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function buildNextRunAt(
  frequency: SnapshotFrequency,
  hour: number,
  minute: number,
  baseDate = new Date(),
  useAnchorDate = false,
): string {
  const intervalDays = FREQUENCY_TO_DAYS[frequency];
  const nowBogotaShifted = new Date(baseDate.getTime() + BOGOTA_OFFSET_MS);

  const year = nowBogotaShifted.getUTCFullYear();
  const month = nowBogotaShifted.getUTCMonth();
  const day = nowBogotaShifted.getUTCDate();

  const targetBogotaShifted = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  if (useAnchorDate) {
    targetBogotaShifted.setUTCDate(targetBogotaShifted.getUTCDate() + intervalDays);
  } else if (targetBogotaShifted.getTime() <= nowBogotaShifted.getTime()) {
    targetBogotaShifted.setUTCDate(targetBogotaShifted.getUTCDate() + intervalDays);
  }

  return new Date(targetBogotaShifted.getTime() - BOGOTA_OFFSET_MS).toISOString();
}

function normalizeSettingsRow(row: Partial<SnapshotSettingsRow> | null | undefined): SnapshotSettingsRow {
  return {
    id: "default",
    enabled: row?.enabled ?? true,
    frequency: (row?.frequency as SnapshotFrequency) ?? "biweekly",
    hour: row?.hour ?? 8,
    minute: row?.minute ?? 0,
    last_run_at: row?.last_run_at ?? null,
    next_run_at: row?.next_run_at ?? null,
  };
}

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("notifications_snapshot_settings")
      .select("id,enabled,frequency,hour,minute,last_run_at,next_run_at")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const settings = normalizeSettingsRow(data as SnapshotSettingsRow | null);
    const expectedFromLastRun = settings.last_run_at
      ? buildNextRunAt(settings.frequency, settings.hour, settings.minute, new Date(settings.last_run_at), true)
      : null;

    const nextRunAtDate = data?.next_run_at ? new Date(data.next_run_at) : null;
    const isPastDue =
      settings.enabled &&
      nextRunAtDate &&
      !Number.isNaN(nextRunAtDate.getTime()) &&
      nextRunAtDate.getTime() < Date.now();

    const needsRebuild =
      settings.enabled &&
      (!data?.next_run_at ||
        Number.isNaN(new Date(data.next_run_at).getTime()) ||
        (expectedFromLastRun && data.next_run_at !== expectedFromLastRun) ||
        isPastDue);

    if (needsRebuild) {
      const nextRunAt = expectedFromLastRun ?? buildNextRunAt(settings.frequency, settings.hour, settings.minute);
      const { data: updated, error: updateError } = await client
        .from("notifications_snapshot_settings")
        .upsert(
          {
            id: "default",
            enabled: settings.enabled,
            frequency: settings.frequency,
            hour: settings.hour,
            minute: settings.minute,
            next_run_at: nextRunAt,
          },
          { onConflict: "id" },
        )
        .select("id,enabled,frequency,hour,minute,last_run_at,next_run_at")
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({ data: updated });
    }

    if (!data) {
      const nextRunAt = settings.enabled
        ? buildNextRunAt(settings.frequency, settings.hour, settings.minute)
        : null;

      const { data: inserted, error: insertError } = await client
        .from("notifications_snapshot_settings")
        .upsert(
          {
            id: "default",
            enabled: settings.enabled,
            frequency: settings.frequency,
            hour: settings.hour,
            minute: settings.minute,
            next_run_at: nextRunAt,
          },
          { onConflict: "id" },
        )
        .select("id,enabled,frequency,hour,minute,last_run_at,next_run_at")
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }

      return NextResponse.json({ data: inserted });
    }

    return NextResponse.json({ data: settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown snapshot settings read error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }

    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar la programacion de snapshots." }, { status: 403 });
    }

    const payload = (await request.json()) as SnapshotSettingsPayload;
    const client = getAdminClient();

    const { data: current, error: currentError } = await client
      .from("notifications_snapshot_settings")
      .select("id,enabled,frequency,hour,minute,last_run_at,next_run_at")
      .eq("id", "default")
      .maybeSingle();

    if (currentError) {
      return NextResponse.json({ error: currentError.message }, { status: 400 });
    }

    const base = normalizeSettingsRow(current as SnapshotSettingsRow | null);
    const next: SnapshotSettingsRow = {
      ...base,
      enabled: payload.enabled ?? base.enabled,
      frequency: payload.frequency ?? base.frequency,
      hour: payload.hour ?? base.hour,
      minute: payload.minute ?? base.minute,
    };

    if (next.hour < 0 || next.hour > 23 || next.minute < 0 || next.minute > 59) {
      return NextResponse.json({ error: "Hora o minutos fuera de rango." }, { status: 400 });
    }

    const anchorDate = base.last_run_at ? new Date(base.last_run_at) : new Date();
    const nextRunAt = next.enabled
      ? buildNextRunAt(next.frequency, next.hour, next.minute, anchorDate, Boolean(base.last_run_at))
      : null;

    const { data, error } = await client
      .from("notifications_snapshot_settings")
      .upsert(
        {
          id: "default",
          enabled: next.enabled,
          frequency: next.frequency,
          hour: next.hour,
          minute: next.minute,
          next_run_at: nextRunAt,
        },
        { onConflict: "id" },
      )
      .select("id,enabled,frequency,hour,minute,last_run_at,next_run_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown snapshot settings update error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
