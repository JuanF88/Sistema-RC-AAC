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

/**
 * Suma (o resta) meses a una fecha ISO conservando el dia del mes.
 *
 * Cuando el mes destino es mas corto que el de origen la fecha se ancla a su
 * ultimo dia en vez de desbordarse al mes siguiente: al 31 de agosto menos seis
 * meses le corresponde el 28 de febrero, no el 3 de marzo. Sin ese ajuste las
 * alertas de programas con fechas de fin de mes se habilitaban unos dias tarde
 * y el texto del correo ("quedan seis meses") no cuadraba con la fecha real.
 *
 * Fuente unica: la usan las vistas de alertas y el calculo automatico de fechas
 * derivadas del modal de programas, para que ambos den siempre el mismo dia.
 */
export function addMonthsToIsoDate(value: string | null, months: number): string | null {
  if (!value || !Number.isFinite(months)) return null;

  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  // Se posiciona primero en el dia 1 del mes destino para que el desbordamiento
  // no ocurra, y solo despues se elige el dia.
  const target = new Date(Date.UTC(year, monthIndex + Math.trunc(months), 1));
  if (Number.isNaN(target.getTime())) return null;

  // Dia 0 del mes siguiente equivale al ultimo dia del mes destino.
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));

  return target.toISOString().slice(0, 10);
}

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
