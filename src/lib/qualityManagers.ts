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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// Un gestor puede tener mas de un correo institucional en el mismo campo,
// separados por punto y coma o coma, igual que el campo de correos del
// coordinador. Todos reciben copia.
export function parseManagerEmails(value: string | null | undefined): string[] {
  if (!value) return [];

  const emails: string[] = [];
  for (const part of String(value).split(/[;,\n]+/)) {
    const email = part.trim();
    if (email && !emails.some((item) => item.toLowerCase() === email.toLowerCase())) {
      emails.push(email);
    }
  }

  return emails;
}

// Deja el campo como "a@x; b@y" en minusculas, o null si no quedo ninguno.
export function normalizeManagerEmails(value: string | null | undefined): string | null {
  const emails = parseManagerEmails(value).map((email) => email.toLowerCase());
  return emails.length > 0 ? emails.join("; ") : null;
}

export function areValidManagerEmails(value: string | null | undefined): boolean {
  const emails = parseManagerEmails(value);
  return emails.length > 0 && emails.every((email) => EMAIL_PATTERN.test(email));
}

// Gestores activos de una facultad. Todos se nombran en la alerta, incluso los
// que no tengan correo registrado: el correo dice quien acompana el proceso, y
// eso no depende de a quien se le pueda copiar.
export function findFacultyManagers<T extends QualityManagerContact>(managers: T[], faculty: string | null): T[] {
  const target = normalizeFaculty(faculty);
  if (!target) return [];

  return managers.filter((manager) => manager.is_active !== false && normalizeFaculty(manager.faculty) === target);
}

// Correos a los que se copiara la alerta: los institucionales de todos los
// gestores recibidos, sin repetir. El correo personal nunca entra aqui.
export function collectManagerEmails(managers: QualityManagerContact[]): string[] {
  const emails: string[] = [];

  for (const manager of managers) {
    for (const email of parseManagerEmails(manager.institutional_email)) {
      if (!emails.some((item) => item.toLowerCase() === email.toLowerCase())) {
        emails.push(email);
      }
    }
  }

  return emails;
}
