/**
 * Nombres de los procesos y de las etapas de las alertas de vencimiento.
 *
 * Fuente unica para la vista de alertas y su pestana de estadisticas: asi la
 * tabla, la vista previa del correo y los conteos nombran igual cada alerta.
 */

export type AlertType = "rrc" | "aac";

export type AlertKind = "inicio" | "recordatorio" | "entrega";

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  rrc: "Registro Calificado",
  aac: "Acreditacion",
};

export const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  inicio: "Inicio de renovacion",
  recordatorio: "Recordatorio previo a entrega",
  entrega: "Recordatorio de entrega",
};
