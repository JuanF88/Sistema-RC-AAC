import type { ConsolidadoProgram } from "@/lib/consolidado";

export type ViewMode = "consolidado" | "alertas";

export type MenuItem = {
  id: ViewMode;
  label: string;
  subtitle: string;
};

export type ProgramRecord = ConsolidadoProgram;

export type ProgramDocument = {
  id: string;
  programId: string;
  name: string;
  sourceType: "file" | "url";
  url: string;
  storagePath: string | null;
  createdAt: string;
};
