-- Ciclo de renovacion al que pertenece cada alerta enviada.
--
-- Antes, el historial se identificaba solo por (programa, tipo, etapa), asi que
-- un programa con sus alertas enviadas quedaba marcado como "enviado" para
-- siempre: si mas adelante renovaba y se actualizaba su fecha de vencimiento,
-- las alertas del nuevo ciclo nunca volvian a habilitarse.
--
-- Con cycle_date el historial queda ligado a la fecha de vencimiento vigente al
-- momento del envio, de modo que un ciclo nuevo vuelve a habilitar sus alertas.
--
-- Migracion aditiva: no elimina ni modifica ninguna columna existente.

ALTER TABLE public.notifications_alertas_envios
  ADD COLUMN IF NOT EXISTS cycle_date DATE;

COMMENT ON COLUMN public.notifications_alertas_envios.cycle_date IS
  'Fecha de vencimiento (rc_end / aac_end) vigente cuando se envio la alerta. Identifica el ciclo de renovacion.';

-- Relleno del historial existente.
--
-- Un envio pertenece al ciclo vigente solo si ocurrio en la fecha programada de
-- su etapa o despues; la aplicacion no permite enviar antes. Si ocurrio antes,
-- es que la fecha del programa se actualizo despues del envio: esa fila es de
-- un ciclo anterior y se marca con su propia fecha de envio, para que el ciclo
-- vigente vuelva a habilitar sus alertas.
--
-- Los meses son los mismos de src/lib/alertSchedule.ts (24 / 6 / 1). Si alli
-- cambian, este relleno ya no aplica: corre una sola vez, sobre el historial
-- que existia antes de la columna.
--
-- Idempotente: solo toca filas con cycle_date NULL.
UPDATE public.notifications_alertas_envios AS e
SET cycle_date = CASE
      WHEN e.sent_at::date >= (
        CASE e.alert_kind
          WHEN 'inicio' THEN
            (CASE WHEN e.alert_type = 'rrc' THEN p.rc_end ELSE p.aac_end END)::date
              - INTERVAL '24 months'
          WHEN 'recordatorio' THEN
            (CASE WHEN e.alert_type = 'rrc' THEN p.rc_siga ELSE p.aac_cgcai_delivery END)::date
              - INTERVAL '6 months'
          ELSE
            (CASE WHEN e.alert_type = 'rrc' THEN p.rc_siga ELSE p.aac_cgcai_delivery END)::date
              - INTERVAL '1 month'
        END
      )
      THEN (CASE WHEN e.alert_type = 'rrc' THEN p.rc_end ELSE p.aac_end END)::date
      ELSE e.sent_at::date
    END
FROM public.consolidado_programas AS p
WHERE p.id = e.program_id
  AND e.cycle_date IS NULL;

-- Red de seguridad: filas sin programa asociado o sin fechas cargadas quedan
-- con su fecha de envio, nunca en NULL (NULL significa "historial sin migrar").
UPDATE public.notifications_alertas_envios
SET cycle_date = sent_at::date
WHERE cycle_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_alertas_envios_ciclo
  ON public.notifications_alertas_envios(program_id, alert_type, alert_kind, cycle_date);
