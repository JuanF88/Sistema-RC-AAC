export const DURATION_UNIT_OPTIONS = ["Semestres", "Años"] as const;

export type DurationUnit = (typeof DURATION_UNIT_OPTIONS)[number];

export function normalizeDurationUnit(value: unknown): DurationUnit | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes("ano") || normalized.includes("años") || normalized.includes("anos") || normalized.includes("year")) {
    return "Años";
  }

  if (normalized.includes("semestre")) {
    return "Semestres";
  }

  return null;
}

export function formatDurationLabel(duration: number | null | undefined, unit: unknown): string {
  if (duration === null || duration === undefined || !Number.isFinite(duration)) return "-";
  const normalizedUnit = normalizeDurationUnit(unit) ?? "Semestres";
  return `${duration} ${normalizedUnit}`;
}

export function parseDurationFromValue(value: unknown): { duration: number | null; durationUnit: DurationUnit | null } {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : Number(String(value ?? "").replace(",", ".").match(/-?\d+(\.\d+)?/)?.[0]);
  const duration = Number.isFinite(numeric) ? numeric : null;
  const durationUnit = normalizeDurationUnit(value) ?? (duration !== null ? "Semestres" : null);
  return { duration, durationUnit };
}
