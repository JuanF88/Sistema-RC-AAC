// Reglas compartidas del directorio de gestores de calidad.
//
// El envio de la alerta y el encabezado de "Gestion de alertas" tienen que
// resolver el gestor de la misma forma: si cada uno aplicara su propio criterio,
// la pantalla podria anunciar una copia que el correo no envia. Por eso ambos
// usan findFacultyManagers.

export type QualityManager = {
  id: string;
  faculty: string;
  title: string | null;
  full_name: string;
  institutional_email: string | null;
  personal_email: string | null;
  phone: string | null;
  office: string | null;
  extension: string | null;
  period: string | null;
  official_letter: string | null;
  is_active: boolean;
};

// Lo minimo que necesita findFacultyManagers para decidir.
export type QualityManagerContact = {
  faculty: string | null;
  full_name: string | null;
  institutional_email: string | null;
  is_active?: boolean | null;
};

// El directorio de gestores y el consolidado guardan el nombre de la facultad
// por separado, asi que se comparan normalizados: una tilde o una mayuscula de
// diferencia no debe dejar al gestor sin copia. NFD separa cada letra de su
// tilde y el reemplazo descarta todo lo que no sea letra o digito; ambos lados
// pasan por aqui, asi que el resultado siempre es comparable.
export function normalizeFaculty(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Gestores que efectivamente recibirian copia de una alerta de esa facultad.
// Se exige el correo institucional porque es el unico canal de notificacion:
// un gestor activo sin ese correo no recibe nada y no debe anunciarse.
export function findFacultyManagers<T extends QualityManagerContact>(managers: T[], faculty: string | null): T[] {
  const target = normalizeFaculty(faculty);
  if (!target) return [];

  return managers.filter(
    (manager) =>
      manager.is_active !== false &&
      Boolean(manager.institutional_email?.trim()) &&
      normalizeFaculty(manager.faculty) === target,
  );
}
