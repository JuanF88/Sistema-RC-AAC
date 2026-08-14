/**
 * Meses de anticipacion de cada alerta de vencimiento.
 *
 * Fuente unica de verdad: la usan tanto las vistas de alertas como la
 * plantilla de correo, para que el texto que lee el coordinador
 * ("Quedan seis meses...") nunca se desincronice de la fecha en la que el
 * sistema realmente habilita el envio.
 */

/** Inicio de renovacion: se cuenta desde la fecha de vencimiento. */
export const START_MONTHS = 24;

/** Primer recordatorio: se cuenta desde la fecha limite de entrega. */
export const DELIVERY_FIRST_REMINDER_MONTHS = 6;

/** Recordatorio final: se cuenta desde la fecha limite de entrega. */
export const DELIVERY_REMINDER_MONTHS = 1;

const MONTH_WORDS: Record<number, string> = {
  1: "un",
  2: "dos",
  3: "tres",
  4: "cuatro",
  5: "cinco",
  6: "seis",
  7: "siete",
  8: "ocho",
  9: "nueve",
  10: "diez",
  11: "once",
  12: "doce",
  18: "dieciocho",
  24: "veinticuatro",
};

/** "6 meses" / "1 mes", para etiquetas cortas y encabezados. */
export function monthsLabel(months: number): string {
  return months === 1 ? "1 mes" : `${months} meses`;
}

/** "seis meses" / "un mes", para redactar frases. */
export function monthsInWords(months: number): string {
  const word = MONTH_WORDS[months] ?? String(months);
  return months === 1 ? `${word} mes` : `${word} meses`;
}

/** "Queda un mes" / "Quedan seis meses", con la concordancia correcta. */
export function remainingMonthsPhrase(months: number): string {
  return months === 1 ? `Queda ${monthsInWords(months)}` : `Quedan ${monthsInWords(months)}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "Seis meses para la entrega de la documentacion", para la fila "Etapa". */
export function monthsStageLabel(months: number): string {
  return `${capitalize(monthsInWords(months))} para la entrega de la documentación`;
}
