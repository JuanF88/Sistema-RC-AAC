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
