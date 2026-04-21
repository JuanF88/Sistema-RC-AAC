export const METHODOLOGY_OPTIONS = ["Investigación", "Profundización", "N/A"] as const;

export type MethodologyValue = (typeof METHODOLOGY_OPTIONS)[number];

export function normalizeMethodology(value: unknown): MethodologyValue {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "investigacion" || normalized === "investigación" || normalized === "investigation") {
    return "Investigación";
  }

  if (normalized === "profundizacion" || normalized === "profundización" || normalized === "deepening") {
    return "Profundización";
  }

  return "N/A";
}