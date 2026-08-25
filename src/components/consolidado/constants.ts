export const FACULTY_OPTIONS = [
  "Facultad de Artes",
  "Facultad de Ciencias Agrarias",
  "Facultad de Ciencias Contables, Económicas y Administrativas",
  "Facultad de Ciencias de la Salud",
  "Facultad de Ciencias Humanas y Sociales",
  "Facultad de Ciencias Naturales, Exactas y de la Educación",
  "Facultad de Derecho, Ciencias Políticas y Sociales",
  "Facultad de Ingeniería Civil",
  "Facultad de Ingeniería Electrónica y Telecomunicaciones",
] as const;

export type FacultyOption = (typeof FACULTY_OPTIONS)[number];

// Dependencias que tienen gestor de calidad pero no programas academicos.
// Solo se usan en el directorio de gestores: no aparecen como facultad de un
// programa, asi que ninguna alerta se dirige a ellas.
export const ADMIN_UNIT_OPTIONS = [
  "Vicerrectoría Académica",
  "Vicerrectoría Administrativa",
  "Vicerrectoría de Investigaciones",
  "Vicerrectoría de Cultura y Bienestar",
  "Oficina de Control Interno",
  "Área de Egresados",
  "Oficina de Planeación y Desarrollo Institucional",
  "División de Admisiones Registro y Control Académico (DARCA)",
] as const;
