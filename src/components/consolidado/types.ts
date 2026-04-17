import type { ConsolidadoProgram } from "@/lib/consolidado";

export type ViewMode = "consolidado" | "alertas" | "registro-calificado" | "acreditacion-programas" | "visitas-pares" | "estadisticas" | "historial" | "usuarios";

export type UserRole = "administrador" | "usuario" | "visualizador";

export type RegistroCalificadoGroupingMode = "programas" | "facultades";

export type AcreditacionGroupingMode = "programas" | "facultades" | "historicos";

export type EstadisticasSubTab = "generales" | "registro-calificado" | "acreditacion-programas";

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
