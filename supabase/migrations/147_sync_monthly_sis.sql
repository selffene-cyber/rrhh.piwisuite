BEGIN;

-- Previred: 1,78% para remuneraciones de agosto a octubre de 2026
-- https://www.previred.com/tasa-seguro-de-invalidez-y-sobrevivencia-sis/
-- Previred: 1,79% para remuneraciones de noviembre de 2026
-- https://www.previred.com/wp-content/uploads/2026/11/Indicadores-Previsionales-Previred-Noviembre-2026.pdf
-- No extrapolar una tasa sin fin ni modificar documentos ya emitidos.
LOCK TABLE public.prevision_rates IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  UPDATE public.prevision_rates
  SET rate = 1.78,
      valid_to = DATE '2026-10-31',
      data_source = 'previred_api',
      legal_reference = 'Previred: tasa SIS ago-oct 2026. Oficio SP N° 15295'
  WHERE concept_code = 'SIS'
    AND valid_from = DATE '2026-08-01'
    AND valid_to IS NULL
    AND rate = 2.00
    AND validation_status = 'validated'
    AND data_source = 'internal_validated';

  IF FOUND THEN
    INSERT INTO public.prevision_rates (
      concept_code, valid_from, valid_to, rate, financing_party,
      taxable_base_type, collection_entity, legal_reference, data_source, validation_status
    ) VALUES (
      'SIS', DATE '2026-11-01', DATE '2026-11-30', 1.79, 'empleador',
      'imponible_afp', 'SCIS', 'Previred: indicadores de noviembre 2026', 'previred_api', 'validated'
    );
  ELSIF NOT (
    EXISTS (SELECT 1 FROM public.prevision_rates WHERE concept_code = 'SIS'
      AND valid_from = DATE '2026-08-01' AND valid_to = DATE '2026-10-31'
      AND rate = 1.78 AND validation_status = 'validated')
    AND EXISTS (SELECT 1 FROM public.prevision_rates WHERE concept_code = 'SIS'
      AND valid_from = DATE '2026-11-01' AND valid_to = DATE '2026-11-30'
      AND rate = 1.79 AND validation_status = 'validated')
  ) THEN
    RAISE EXCEPTION 'Vigencias SIS distintas de las esperadas; revisar antes de aplicar la migración 147';
  END IF;
END $$;

-- La escritura y la verificación de solapamientos se hacen en una transacción.
-- La rutina no modifica una vigencia manual o histórica ni toca nóminas emitidas.
CREATE OR REPLACE FUNCTION public.sync_monthly_sis(p_period date, p_rate numeric)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  month_end date;
  existing public.prevision_rates%ROWTYPE;
BEGIN
  IF p_period IS NULL OR EXTRACT(DAY FROM p_period) <> 1 OR p_period < DATE '2026-08-01'
     OR p_rate IS NULL OR p_rate <= 0 OR p_rate > 2.50 OR p_rate <> trunc(p_rate, 2) THEN
    RAISE EXCEPTION 'Período o tasa SIS inválidos';
  END IF;

  month_end := (p_period + interval '1 month')::date - 1;
  LOCK TABLE public.prevision_rates IN SHARE ROW EXCLUSIVE MODE;

  SELECT * INTO existing
  FROM public.prevision_rates
  WHERE concept_code = 'SIS'
    AND valid_from <= month_end
    AND (valid_to IS NULL OR valid_to >= p_period)
  ORDER BY valid_from DESC
  LIMIT 1;

  IF FOUND THEN
    IF existing.valid_from > p_period OR (existing.valid_to IS NOT NULL AND existing.valid_to < month_end) THEN
      RETURN 'conflict';
    END IF;
    IF existing.validation_status = 'validated' AND existing.rate = p_rate THEN
      RETURN 'unchanged';
    END IF;
    IF existing.valid_from <> p_period OR existing.valid_to IS DISTINCT FROM month_end
       OR existing.validation_status <> 'validated' OR existing.data_source <> 'previred_api'
       OR EXISTS (
         SELECT 1 FROM public.payroll_periods
         WHERE year = EXTRACT(YEAR FROM p_period) AND month = EXTRACT(MONTH FROM p_period) AND status = 'closed'
       ) THEN
      RETURN 'conflict';
    END IF;

    UPDATE public.prevision_rates
    SET rate = p_rate, legal_reference = 'Indicadores Previred vía Gael Cloud: ' || to_char(p_period, 'YYYY-MM')
    WHERE id = existing.id;
    RETURN 'updated';
  END IF;

  INSERT INTO public.prevision_rates (
    concept_code, valid_from, valid_to, rate, financing_party,
    taxable_base_type, collection_entity, legal_reference, data_source, validation_status
  ) VALUES (
    'SIS', p_period, month_end, p_rate, 'empleador', 'imponible_afp', 'SCIS',
    'Indicadores Previred vía Gael Cloud: ' || to_char(p_period, 'YYYY-MM'), 'previred_api', 'validated'
  );
  RETURN 'inserted';
END;
$$;

REVOKE ALL ON FUNCTION public.sync_monthly_sis(date, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_monthly_sis(date, numeric) TO service_role;

COMMIT;
