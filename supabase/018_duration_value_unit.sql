-- Normalize duration as structured value + unit (Semestres/Años)

ALTER TABLE public.consolidado_programas
  ADD COLUMN IF NOT EXISTS duration_unit TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'consolidado_programas_duration_unit_check'
  ) THEN
    ALTER TABLE public.consolidado_programas
      ADD CONSTRAINT consolidado_programas_duration_unit_check
      CHECK (duration_unit IS NULL OR duration_unit IN ('Semestres', 'Años'));
  END IF;
END $$;

-- Backfill existing numeric durations as Semestres when unit is empty.
UPDATE public.consolidado_programas
SET duration_unit = 'Semestres'
WHERE duration IS NOT NULL
  AND (duration_unit IS NULL OR btrim(duration_unit) = '');

-- Apply curated duration mapping provided by academic teams.
WITH mapping(program_name, duration_value, duration_unit_value) AS (
  VALUES
    ('Artes Plásticas', 10, 'Semestres'),
    ('Maestría en Música', 4, 'Semestres'),
    ('Licenciatura en Música', 10, 'Semestres'),
    ('Música Instrumental', 12, 'Semestres'),
    ('Diseño Gráfico', 9, 'Semestres'),
    ('Dirección de Banda', 10, 'Semestres'),
    ('Ingeniería Agroindustrial', 10, 'Semestres'),
    ('Especialización en Sanidad en Producción Agraria Integrada', 2, 'Semestres'),
    ('Especialización en Gestión Integral del Recurso Hídrico', 2, 'Semestres'),
    ('Ingeniería Agropecuaria', 10, 'Semestres'),
    ('Maestría en Ciencias Agrarias', 4, 'Semestres'),
    ('Doctorado en Ciencias Agrarias y Agroindustriales', 8, 'Semestres'),
    ('Ingeniería Forestal', 10, 'Semestres'),
    ('Contaduría Pública', 10, 'Semestres'),
    ('Especialización en Gerencia de Impuestos', 2, 'Semestres'),
    ('Especialización en Revisoría Fiscal y Auditoría Internacional', 2, 'Semestres'),
    ('Especialización en Gerencia de Proyectos', 2, 'Semestres'),
    ('Especialización en Mercadeo Corporativo', 2, 'Semestres'),
    ('Administración de Empresas', 10, 'Semestres'),
    ('Maestría en Gestión de Organizaciones y Proyectos', 4, 'Semestres'),
    ('Maestría en Economía Regional y Políticas Públicas', 4, 'Semestres'),
    ('Maestría en Gestión del Conocimiento y la Innovación', 4, 'Semestres'),
    ('Economía', 10, 'Semestres'),
    ('Maestría en Estudios Interdisciplinarios del Desarrollo', 4, 'Semestres'),
    ('Turismo', 10, 'Semestres'),
    ('Maestría en Desarrollo Humano y Salud', 4, 'Semestres'),
    ('Fonoaudiología', 10, 'Semestres'),
    ('Especialización en Anestesiología', 3, 'Años'),
    ('Especialización en Pediatría', 3, 'Años'),
    ('Especialización en Ginecología y Obstetricia', 3, 'Años'),
    ('Especialización en Cirugía General', 4, 'Años'),
    ('Enfermería', 10, 'Semestres'),
    ('Especialización en Intervención del Lenguaje Infantil', 2, 'Semestres'),
    ('Especialización en Medicina Interna', 3, 'Años'),
    ('Especialización en Medicina Familiar', 3, 'Años'),
    ('Fisioterapia', 10, 'Semestres'),
    ('Especialización en Seguridad y Salud en el Trabajo', 2, 'Semestres'),
    ('Enfermería (S.Q)', 10, 'Semestres'),
    ('Licenciatura en Lenguas Modernas con énfasis en Inglés y Francés (Santander de Quilichao)', 10, 'Semestres'),
    ('Filosofía', 8, 'Semestres'),
    ('Geografía del Desarrollo Regional y Ambiental', 10, 'Semestres'),
    ('Doctorado en Antropología', 8, 'Semestres'),
    ('Maestría en Antropología', 4, 'Semestres'),
    ('Maestría en Ciencias Humanas', 4, 'Semestres'),
    ('Doctorado en Ciencias Humanas', 8, 'Semestres'),
    ('Licenciatura en Lenguas Modernas con Énfasis en Inglés y Francés', 10, 'Semestres'),
    ('Historia', 10, 'Semestres'),
    ('Maestría en Artes Integradas con el Ambiente', 4, 'Semestres'),
    ('Licenciatura en Literatura y Lengua Castellana', 10, 'Semestres'),
    ('Licenciatura en Etnoeducación y Ciencias Sociales', 10, 'Semestres'),
    ('Antropología', 10, 'Semestres'),
    ('Especialización en Educación Comunitaria', 2, 'Semestres'),
    ('Ingeniería Física', 10, 'Semestres'),
    ('Maestría en Educación Popular', 4, 'Semestres'),
    ('Maestría en Educación Popular (Santander de Quilichao)', 4, 'Semestres'),
    ('Maestría en Educación (MI)', 4, 'Semestres'),
    ('Biología', 10, 'Semestres'),
    ('Maestría en Ingeniería Física', 4, 'Semestres'),
    ('Maestría en Biología', 4, 'Semestres'),
    ('Maestría en Educación, Estudios del Cuerpo y la Motricidad', 4, 'Semestres'),
    ('Maestría en Educación Superior', 4, 'Semestres'),
    ('Licenciatura en Educación Física, Recreación y Deportes', 10, 'Semestres'),
    ('Licenciatura en Educación Artística', 10, 'Semestres'),
    ('Licenciatura en Ciencias Naturales y Educación Ambiental', 10, 'Semestres'),
    ('Licenciatura en Educación Básica Primaria', 10, 'Semestres'),
    ('Maestría en Deporte y Actividad Física', 4, 'Semestres'),
    ('Doctorado en Ciencias Matemáticas', 8, 'Semestres'),
    ('Matemáticas', 10, 'Semestres'),
    ('Química', 10, 'Semestres'),
    ('Especialización en Educación y Discapacidad', 2, 'Semestres'),
    ('Maestría en Ciencias Matemáticas', 4, 'Semestres'),
    ('Doctorado en Ciencias de la Educación', 10, 'Semestres'),
    ('Doctorado en Etnobiología y Estudios Bioculturales', 8, 'Semestres'),
    ('Doctorado en Ciencias Química', 8, 'Semestres'),
    ('Maestría en Recursos Hidrobiológicos Continentales', 4, 'Semestres'),
    ('Maestría en Ciencias Química', 4, 'Semestres'),
    ('Doctorado en Ciencias Ambientales', 8, 'Semestres'),
    ('Licenciatura en Matemáticas', 10, 'Semestres'),
    ('Maestría en Bioingeniería', 4, 'Semestres'),
    ('Derecho', 10, 'Semestres'),
    ('Comunicación Social', 9, 'Semestres'),
    ('Ciencia Política', 8, 'Semestres'),
    ('Especialización en Derecho de Familia', 2, 'Semestres'),
    ('Especialización en Gobierno y Políticas Públicas', 2, 'Semestres'),
    ('Especialización Derecho Procesal', 2, 'Semestres'),
    ('Especialización en Ingeniería de Vías Terrestres', 2, 'Semestres'),
    ('Maestría en Ingeniería Hidráulica e Hidrológica', 4, 'Semestres'),
    ('Maestría en Ingeniería Ambiental', 4, 'Semestres'),
    ('Ingeniería Ambiental', 10, 'Semestres'),
    ('Especialización en Estructuras', 2, 'Semestres'),
    ('Ingeniería Civil', 10, 'Semestres'),
    ('Maestría en Ingeniería de la Construcción', 4, 'Semestres'),
    ('Maestría en Ingeniería de Pavimentos', 4, 'Semestres'),
    ('Geotecnología', 6, 'Semestres'),
    ('Maestría en Ingeniería de Vías Terrestres', 4, 'Semestres'),
    ('Maestría en Geomática', 4, 'Semestres'),
    ('Especialización en Ingeniería de Recursos Hídricos', 2, 'Semestres'),
    ('Arquitectura', 9, 'Semestres'),
    ('Ingeniería en Inteligencia Artificial y Ciencia de Datos', 4, 'Años'),
    ('Especialización en Redes y Servicios Telemáticos', 2, 'Semestres'),
    ('Ingeniería Electrónica y Telecomunicaciones', 10, 'Semestres'),
    ('Maestría en Ingeniería Telemática', 4, 'Semestres'),
    ('Doctorado en Ciencias de la Computación', 8, 'Semestres'),
    ('Tecnología en Telemática', 6, 'Semestres'),
    ('Ingeniería de Sistemas', 10, 'Semestres'),
    ('Maestría en Electrónica y Telecomunicaciones', 4, 'Semestres'),
    ('Doctorado en Ingeniería Telemática', 10, 'Semestres'),
    ('Maestría en Telecomunicaciones', 4, 'Semestres'),
    ('Especialización en TIC para la Innovación Educativa', 2, 'Semestres'),
    ('Maestría en Automática', 4, 'Semestres'),
    ('Doctorado en Ciencias de la Electrónica', 10, 'Semestres'),
    ('Maestría en Computación', 4, 'Semestres'),
    ('Ingeniería en Automática Industrial', 10, 'Semestres')
)
UPDATE public.consolidado_programas cp
SET duration = m.duration_value,
    duration_unit = m.duration_unit_value
FROM mapping m
WHERE lower(btrim(cp.program)) = lower(btrim(m.program_name));
