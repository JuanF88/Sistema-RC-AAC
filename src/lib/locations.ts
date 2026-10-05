/**
 * Lugares de desarrollo de un programa.
 *
 * Un programa puede ofrecerse en varias sedes. Se siguen guardando en el mismo
 * campo de texto "location", separados por "; ", para no cambiar la estructura
 * de la base de datos ni perder nada de lo que ya esta registrado: un programa
 * con un solo lugar queda exactamente igual que antes.
 *
 * Todo el sistema lee los lugares a traves de estas funciones, asi que el
 * filtro, las tablas y las exportaciones ven siempre la misma lista.
 */

/** Separador con el que se guardan y se muestran varios lugares. */
export const LOCATION_SEPARATOR = "; ";

/** Etiqueta del filtro para los programas que no tienen lugar registrado. */
export const LOCATION_UNDEFINED = "Sin definir";

/**
 * Separadores que aparecen en los datos cargados a mano: saltos de linea, punto
 * y coma, comas y la "y" que une el ultimo lugar de una enumeracion
 * ("Popayan, Santander de Quilichao y Guapi").
 *
 * El guion NO separa: "Pasto - Nariño" y "Cali - Valle" son un solo lugar,
 * escrito como ciudad y departamento.
 */
const SPLIT_PATTERN = /\r?\n|;|,|\s+y\s+/i;

/**
 * Dos lugares escritos seguidos sin ningun separador, cuando el primero termina
 * en un parentesis: "Patía (El Bordo) Santander de Quilichao" son dos lugares.
 * El nombre de un municipio no continua despues de cerrar un parentesis, asi
 * que ahi empieza el siguiente.
 */
const GLUED_AFTER_PARENTHESIS = /\)\s+(?=\p{Lu})/gu;

/**
 * Lista de lugares de un programa, sin repetidos y sin espacios de sobra.
 * Devuelve un arreglo vacio cuando el programa no tiene lugar registrado.
 */
export function parseLocations(value: string | null | undefined): string[] {
  if (!value) return [];

  const seen = new Set<string>();
  const places: string[] = [];

  // Se marca el corte sin perder el parentesis, que pertenece al primer lugar.
  const marked = String(value).replace(GLUED_AFTER_PARENTHESIS, ");");

  for (const part of marked.split(SPLIT_PATTERN)) {
    const place = part.trim().replace(/\s+/g, " ");
    if (!place) continue;

    // Dos veces el mismo lugar cuenta como uno, sin importar mayusculas.
    const key = place.toLocaleLowerCase("es");
    if (seen.has(key)) continue;

    seen.add(key);
    places.push(place);
  }

  return places;
}

/** Junta una lista de lugares en el texto que se guarda en "location". */
export function formatLocations(places: readonly string[]): string {
  return places
    .map((place) => place.trim())
    .filter((place) => place.length > 0)
    .join(LOCATION_SEPARATOR);
}

/**
 * Deja un valor guardado en el formato unico. Se aplica al leer los programas,
 * de modo que los registros antiguos (con comas o saltos de linea) se vean
 * bien sin tener que modificar la base de datos.
 */
export function normalizeLocations(value: string | null | undefined): string | null {
  return formatLocations(parseLocations(value)) || null;
}
