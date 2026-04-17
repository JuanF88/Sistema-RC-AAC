import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { runSnapshotExport } from "@/app/api/historial/export-snapshot/route";

type SnapshotFrequency = "daily" | "weekly" | "biweekly" | "monthly";

type SnapshotSettingsRow = {
  id: "default";
  enabled: boolean;
  frequency: SnapshotFrequency;
  hour: number;
  minute: number;
  next_run_at: string | null;
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
    throw new Error("Missing Supabase environment variables for cron snapshots.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function buildNextRunAt(frequency: SnapshotFrequency, hour: number, minute: number, baseDate = new Date()): string {
  const intervalDays = FREQUENCY_TO_DAYS[frequency];
  const nowBogotaShifted = new Date(baseDate.getTime() + BOGOTA_OFFSET_MS);

  const year = nowBogotaShifted.getUTCFullYear();
  const month = nowBogotaShifted.getUTCMonth();
  const day = nowBogotaShifted.getUTCDate();

  const targetBogotaShifted = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  if (targetBogotaShifted.getTime() <= nowBogotaShifted.getTime()) {
    targetBogotaShifted.setUTCDate(targetBogotaShifted.getUTCDate() + intervalDays);
  }

  return new Date(targetBogotaShifted.getTime() - BOGOTA_OFFSET_MS).toISOString();
}

function isAuthorizedCronRequest(request: Request): boolean {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization")?.trim();
  const xCron = request.headers.get("x-vercel-cron");

  if (configuredSecret) {
    return auth === `Bearer ${configuredSecret}`;
  }

  // If no explicit secret is configured, only accept Vercel Cron invocations.
  return Boolean(xCron);
}

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: "Unauthorized cron invocation." }, { status: 401 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("notifications_snapshot_settings")
      .select("id,enabled,frequency,hour,minute,next_run_at")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const settings = (data ?? {
      id: "default",
      enabled: true,
      frequency: "biweekly",
      hour: 8,
      minute: 0,
      next_run_at: null,
    }) as SnapshotSettingsRow;

    if (!settings.enabled) {
      return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
    }

    const nextRunAt = settings.next_run_at ? new Date(settings.next_run_at) : null;
    const now = new Date();

    if (!nextRunAt || Number.isNaN(nextRunAt.getTime())) {
      const recomputed = buildNextRunAt(settings.frequency, settings.hour, settings.minute, now);
      await client
        .from("notifications_snapshot_settings")
        .upsert({
          id: "default",
          enabled: settings.enabled,
          frequency: settings.frequency,
          hour: settings.hour,
          minute: settings.minute,
          next_run_at: recomputed,
        }, { onConflict: "id" });

      return NextResponse.json({ ok: true, skipped: true, reason: "next_run_initialized", nextRunAt: recomputed });
    }

    if (now.getTime() < nextRunAt.getTime()) {
      return NextResponse.json({ ok: true, skipped: true, reason: "not_due", nextRunAt: settings.next_run_at });
    }

    const exportResult = await runSnapshotExport({ trigger: "scheduled" });
    const computedNextRunAt = buildNextRunAt(settings.frequency, settings.hour, settings.minute, now);

    const { error: updateError } = await client
      .from("notifications_snapshot_settings")
      .update({
        last_run_at: now.toISOString(),
        next_run_at: computedNextRunAt,
      })
      .eq("id", "default");

    if (updateError) {
      return NextResponse.json({
        ok: true,
        warning: updateError.message,
        snapshot: exportResult,
      });
    }

    return NextResponse.json({
      ok: true,
      scheduledRun: true,
      nextRunAt: computedNextRunAt,
      snapshot: exportResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron snapshot error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
