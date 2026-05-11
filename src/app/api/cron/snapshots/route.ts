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
  last_run_at: string | null;
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
      console.warn("[cron][snapshots] unauthorized");
      return NextResponse.json({ error: "Unauthorized cron invocation." }, { status: 401 });
    }

    console.log("[cron][snapshots] authorized");
    const client = getAdminClient();
    const { data, error } = await client
      .from("notifications_snapshot_settings")
      .select("id,enabled,frequency,hour,minute,last_run_at,next_run_at")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      console.error("[cron][snapshots] settings_error", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const settings = (data ?? {
      id: "default",
      enabled: true,
      frequency: "biweekly",
      hour: 8,
      minute: 0,
      last_run_at: null,
      next_run_at: null,
    }) as SnapshotSettingsRow;

    if (!settings.enabled) {
      console.log("[cron][snapshots] skipped", { reason: "disabled" });
      return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
    }

    const expectedNextRunAt = settings.last_run_at
      ? buildNextRunAt(settings.frequency, settings.hour, settings.minute, new Date(settings.last_run_at), true)
      : null;
    const nextRunAtValue = expectedNextRunAt ?? settings.next_run_at;
    const nextRunAt = nextRunAtValue ? new Date(nextRunAtValue) : null;
    const now = new Date();

    if (!nextRunAt || Number.isNaN(nextRunAt.getTime())) {
      console.log("[cron][snapshots] next_run_invalid", { nextRunAt: nextRunAtValue });
      const recomputed = buildNextRunAt(settings.frequency, settings.hour, settings.minute, now);
      await client
        .from("notifications_snapshot_settings")
        .upsert({
          id: "default",
          enabled: settings.enabled,
          frequency: settings.frequency,
          hour: settings.hour,
          minute: settings.minute,
          last_run_at: settings.last_run_at,
          next_run_at: recomputed,
        }, { onConflict: "id" });

      console.log("[cron][snapshots] next_run_initialized", { nextRunAt: recomputed });
      return NextResponse.json({ ok: true, skipped: true, reason: "next_run_initialized", nextRunAt: recomputed });
    }

    if (expectedNextRunAt && settings.next_run_at !== expectedNextRunAt) {
      console.log("[cron][snapshots] schedule_mismatch", {
        stored: settings.next_run_at,
        expected: expectedNextRunAt,
      });
      const { error: repairError } = await client
        .from("notifications_snapshot_settings")
        .update({
          next_run_at: expectedNextRunAt,
        })
        .eq("id", "default");

      if (repairError) {
        return NextResponse.json({ ok: true, warning: repairError.message, nextRunAt: expectedNextRunAt });
      }

      console.log("[cron][snapshots] schedule_repaired", { nextRunAt: expectedNextRunAt });
      return NextResponse.json({ ok: true, skipped: true, reason: "schedule_repaired", nextRunAt: expectedNextRunAt });
    }

    if (now.getTime() < nextRunAt.getTime()) {
      console.log("[cron][snapshots] skipped", { reason: "not_due", nextRunAt: nextRunAtValue });
      return NextResponse.json({ ok: true, skipped: true, reason: "not_due", nextRunAt: nextRunAtValue });
    }

    console.log("[cron][snapshots] running_export", { trigger: "scheduled" });
    const exportResult = await runSnapshotExport({ trigger: "scheduled" });
    const computedNextRunAt = buildNextRunAt(settings.frequency, settings.hour, settings.minute, now, true);

    const { error: updateError } = await client
      .from("notifications_snapshot_settings")
      .update({
        last_run_at: now.toISOString(),
        next_run_at: computedNextRunAt,
      })
      .eq("id", "default");

    if (updateError) {
      console.error("[cron][snapshots] update_error", updateError.message);
      return NextResponse.json({
        ok: true,
        warning: updateError.message,
        snapshot: exportResult,
      });
    }

    console.log("[cron][snapshots] completed", { nextRunAt: computedNextRunAt });
    return NextResponse.json({
      ok: true,
      scheduledRun: true,
      nextRunAt: computedNextRunAt,
      snapshot: exportResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron snapshot error";
    console.error("[cron][snapshots] fatal", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
