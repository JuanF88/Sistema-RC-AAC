-- Directorio de gestores de calidad por facultad y dependencia.
--
-- Cada facultad tiene una o varias personas encargadas de acompanar los
-- procesos de calidad. Cuando se envia una alerta de renovacion a un programa,
-- el gestor de la facultad de ese programa recibe copia en su correo
-- institucional, para que el seguimiento no dependa unicamente del coordinador.
--
-- faculty guarda el nombre tal como aparece en consolidado_programas.faculty:
-- ese texto es la llave con la que la alerta encuentra al gestor. Las
-- dependencias que no son facultades (vicerrectorias, oficinas) se guardan en
-- la misma tabla como directorio, aunque no tengan programas asociados.
--
-- Migracion aditiva: no toca ninguna tabla existente.

CREATE TABLE IF NOT EXISTS public.gestores_calidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  faculty TEXT NOT NULL,
  title TEXT,
  full_name TEXT NOT NULL,
  institutional_email TEXT,
  personal_email TEXT,
  phone TEXT,
  office TEXT,
  extension TEXT,
  period TEXT,
  official_letter TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT gestores_calidad_faculty_name_key UNIQUE (faculty, full_name)
);

COMMENT ON COLUMN public.gestores_calidad.faculty IS
  'Facultad o dependencia. Debe coincidir con consolidado_programas.faculty para que la alerta copie al gestor.';
COMMENT ON COLUMN public.gestores_calidad.institutional_email IS
  'Unico correo al que se copian las alertas de renovacion.';
COMMENT ON COLUMN public.gestores_calidad.personal_email IS
  'Dato de contacto del directorio. No recibe alertas.';
COMMENT ON COLUMN public.gestores_calidad.official_letter IS
  'Nombre del oficio de designacion del gestor.';

CREATE INDEX IF NOT EXISTS idx_gestores_calidad_faculty
  ON public.gestores_calidad(faculty, is_active);

ALTER TABLE public.gestores_calidad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read gestores calidad" ON public.gestores_calidad;
CREATE POLICY "Allow read gestores calidad" ON public.gestores_calidad
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated write gestores calidad" ON public.gestores_calidad;
CREATE POLICY "Allow authenticated write gestores calidad" ON public.gestores_calidad
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_gestores_calidad_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gestores_calidad_updated_at ON public.gestores_calidad;
CREATE TRIGGER trigger_gestores_calidad_updated_at
BEFORE UPDATE ON public.gestores_calidad
FOR EACH ROW
EXECUTE FUNCTION update_gestores_calidad_updated_at();

GRANT SELECT ON public.gestores_calidad TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gestores_calidad TO authenticated;

-- Carga inicial del directorio vigente. Idempotente: al repetirse actualiza los
-- datos de contacto de cada persona sin duplicar filas.
INSERT INTO public.gestores_calidad
  (faculty, title, full_name, institutional_email, personal_email, phone, office, extension, period, official_letter)
VALUES
  ('Facultad de Artes', 'Magíster', 'María Andrea Cerón Ramírez', 'calidadartes@unicauca.edu.co', 'andreceron@unicauca.edu.co', '3005571098', NULL, NULL, NULL, NULL),
  ('Facultad de Ciencias Agrarias', 'Magíster', 'Carlos Andres Chantré Ortiz', 'acreditacionfaca@unicauca.edu.co', 'cchantre@unicauca.edu.co', '3014486869', '8245976', NULL, 'Año 2026', 'Facultad de Ciencias Agrarias.pdf'),
  ('Facultad de Ciencias Contables, Económicas y Administrativas', 'Magíster', 'Erika Yissela Ruiz Muñoz', 'calidad.fccea@unicauca.edu.co', 'eyissela@unicauca.edu.co', '3147383434', '8209800', '3101', NULL, NULL),
  ('Facultad de Ciencias de la Salud', 'Magíster', 'Alejandra Arias Gordillo', 'gestioncalidad@unicauca.edu.co', 'alejarisgo@unicauca.edu.co', '3016276222', '8209870', NULL, 'Año 2026', 'Facultad de Ciencias de la Salud.pdf'),
  ('Facultad de Ciencias Humanas y Sociales', 'Magíster', 'Mercy Lorena Urbano Pardo', 'acreditacionfchs@unicauca.edu.co', 'mercyurbano@unicauca.edu.co', '3167994615', NULL, NULL, '2026-1', 'Facultad de Ciencias Humanas y Sociales.pdf'),
  ('Facultad de Ciencias Naturales, Exactas y de la Educación', 'Magíster', 'Harold Andrés Erazo López', 'acreditafacned@unicauca.edu.co', 'aerazol@unicauca.edu.co', '3207541382', NULL, NULL, '2026-2', 'Facultad de Ciencias Naturales, Exactas y de la Educación 2026-2.pdf'),
  ('Facultad de Ciencias Naturales, Exactas y de la Educación', 'Magíster', 'Mayra Alejandra Velasco Reyes', NULL, 'alejavelasco@unicauca.edu.co', '3013437617', NULL, NULL, '2026-2', 'Facultad de Ciencias Naturales, Exactas y de la Educación 2026-2.pdf'),
  ('Facultad de Derecho, Ciencias Políticas y Sociales', 'Magíster', 'Marcela Tovar Toledo', 'gcalidadfacderecho@unicauca.edu.co', 'dmtovar@unicauca.edu.co', NULL, NULL, NULL, NULL, NULL),
  ('Facultad de Ingeniería Civil', 'Universitario', 'Cristian David Muñoz Paz', 'gcalidadfic@unicauca.edu.co', 'cristianmotta@unicauca.edu.co', '3217288814', '8209800', NULL, 'Año 2026', 'Facultad de Ingeniería Civil.pdf'),
  ('Facultad de Ingeniería Electrónica y Telecomunicaciones', 'Magíster', 'María Manuela Silva Zambrano', 'gestorfiet@unicauca.edu.co', 'mariasilva@unicauca.edu.co', '3164958150', '8209800', NULL, 'Años 2025 y 2026', 'Facultad de Ingeniería Electrónica y Telecomunicaciones.pdf'),
  ('Vicerrectoría Académica', 'Universitaria', 'Ruth Isabel Gamez Farias', 'calidadviceacad@unicauca.edu.co', 'rigamez@unicauca.edu.co', '3103750658', '8209900', '1117', 'Año 2026', 'Vicerrectoría Académica.pdf'),
  ('Vicerrectoría Administrativa', 'Universitaria', 'Maayann Lisseth Moriones Ruiz', 'calidadviceadm@unicauca.edu.co', 'lmoriones@unicauca.edu.co', '3128610010', '8209900', NULL, 'Año 2026', 'Vicerrectoría Administrativa.pdf'),
  ('Vicerrectoría de Investigaciones', 'Contratista', 'David Steven Hoyos Solís', 'calidadvri@unicauca.edu.co', 'davidhoyos@unicauca.edu.co', '3126400898', NULL, NULL, 'Año 2026-2', 'Vicerrectoría de Investigaciones 2026-2.pdf'),
  ('Vicerrectoría de Cultura y Bienestar', 'Universitaria', 'María Fernanda Mosquera Vidal', 'gestorcalidadvcb@unicauca.edu.co', 'mafemosquera@unicauca.edu.co', '3162264629', NULL, NULL, 'Año 2026', 'Vicerrectoría de Cultura y Bienestar.pdf'),
  ('Oficina de Control Interno', 'Universitario', 'Doris Stella Muñoz Cruz', 'cinterno@unicauca.edu.co', 'dsmunoz@unicauca.edu.co', '3217512243', '8209900', '1151', NULL, NULL),
  ('Área de Egresados', 'Universitarios', 'Mayra Cristina Ramos Benitez', 'mayrac@unicauca.edu.co', NULL, NULL, '8209900', '1431', NULL, NULL),
  ('Oficina de Planeación y Desarrollo Institucional', 'Universitaria', 'Diana Marcela Espinosa', 'dianamespinosa@unicauca.edu.co', NULL, '3178673250', '8209800', '2487', NULL, NULL),
  ('División de Admisiones Registro y Control Académico (DARCA)', 'Universitaria', 'Francisco Javier Echeverri', 'darca.calidad@unicauca.edu.co', 'franjavieche@unicauca.edu.co', '3207124030', '6028209800', '2179', NULL, NULL)
ON CONFLICT (faculty, full_name)
DO UPDATE SET
  title = EXCLUDED.title,
  institutional_email = EXCLUDED.institutional_email,
  personal_email = EXCLUDED.personal_email,
  phone = EXCLUDED.phone,
  office = EXCLUDED.office,
  extension = EXCLUDED.extension,
  period = EXCLUDED.period,
  official_letter = EXCLUDED.official_letter;
