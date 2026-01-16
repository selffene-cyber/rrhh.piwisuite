-- =====================================================
-- MIGRACIÓN 095: Tabla de Feriados Chilenos
-- =====================================================
-- Descripción: Crea tabla para almacenar feriados legales de Chile
-- Fecha: 2026-01-15
-- Objetivo: Soporte para cálculo correcto de días hábiles en vacaciones
-- =====================================================

-- Tabla de feriados
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  year INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('nacional', 'regional', 'religioso')),
  is_irrenunciable BOOLEAN DEFAULT false,
  law_number TEXT NULL,
  region TEXT NULL, -- Para feriados regionales
  communes TEXT[] NULL, -- Para feriados de comunas específicas
  source TEXT DEFAULT 'api', -- 'api' | 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: un feriado por fecha
  UNIQUE(date)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_year ON public.holidays(year);
CREATE INDEX IF NOT EXISTS idx_holidays_type ON public.holidays(type);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_holidays_updated_at
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW
  EXECUTE FUNCTION update_holidays_updated_at();

-- RLS: Solo administradores pueden modificar feriados
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver feriados
CREATE POLICY "Todos pueden ver feriados"
  ON public.holidays
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo admins pueden insertar/actualizar/eliminar
CREATE POLICY "Solo admins pueden gestionar feriados"
  ON public.holidays
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- =====================================================
-- Datos Iniciales: Feriados 2019-2026
-- =====================================================
-- Fuente: Gobierno de Chile - https://www.feriados.cl
-- Última actualización: Enero 2026

-- Feriados 2019
INSERT INTO public.holidays (date, year, name, type, is_irrenunciable, law_number) VALUES
('2019-01-01', 2019, 'Año Nuevo', 'nacional', true, 'Ley 2.977'),
('2019-04-19', 2019, 'Viernes Santo', 'religioso', false, NULL),
('2019-04-20', 2019, 'Sábado Santo', 'religioso', false, NULL),
('2019-05-01', 2019, 'Día del Trabajo', 'nacional', true, 'Ley 2.200'),
('2019-05-21', 2019, 'Día de las Glorias Navales', 'nacional', false, 'Ley 2.977'),
('2019-06-29', 2019, 'San Pedro y San Pablo', 'nacional', false, 'Ley 18.432'),
('2019-07-16', 2019, 'Virgen del Carmen', 'nacional', false, 'Ley 20.148'),
('2019-08-15', 2019, 'Asunción de la Virgen', 'nacional', false, 'Ley 2.977'),
('2019-09-18', 2019, 'Independencia Nacional', 'nacional', true, 'Ley 2.977'),
('2019-09-19', 2019, 'Día de las Glorias del Ejército', 'nacional', true, 'Ley 2.977'),
('2019-09-20', 2019, 'Feriado Adicional', 'nacional', false, 'Ley 20.983'),
('2019-10-12', 2019, 'Encuentro de Dos Mundos', 'nacional', false, 'Ley 3.810'),
('2019-10-31', 2019, 'Día de las Iglesias Evangélicas y Protestantes', 'nacional', false, 'Ley 20.299'),
('2019-11-01', 2019, 'Día de Todos los Santos', 'nacional', false, 'Ley 2.977'),
('2019-12-08', 2019, 'Inmaculada Concepción', 'nacional', false, 'Ley 2.977'),
('2019-12-25', 2019, 'Navidad', 'nacional', true, 'Ley 2.977')
ON CONFLICT (date) DO NOTHING;

-- Feriados 2020
INSERT INTO public.holidays (date, year, name, type, is_irrenunciable, law_number) VALUES
('2020-01-01', 2020, 'Año Nuevo', 'nacional', true, 'Ley 2.977'),
('2020-04-10', 2020, 'Viernes Santo', 'religioso', false, NULL),
('2020-04-11', 2020, 'Sábado Santo', 'religioso', false, NULL),
('2020-05-01', 2020, 'Día del Trabajo', 'nacional', true, 'Ley 2.200'),
('2020-05-21', 2020, 'Día de las Glorias Navales', 'nacional', false, 'Ley 2.977'),
('2020-06-29', 2020, 'San Pedro y San Pablo', 'nacional', false, 'Ley 18.432'),
('2020-07-16', 2020, 'Virgen del Carmen', 'nacional', false, 'Ley 20.148'),
('2020-08-15', 2020, 'Asunción de la Virgen', 'nacional', false, 'Ley 2.977'),
('2020-09-18', 2020, 'Independencia Nacional', 'nacional', true, 'Ley 2.977'),
('2020-09-19', 2020, 'Día de las Glorias del Ejército', 'nacional', true, 'Ley 2.977'),
('2020-10-12', 2020, 'Encuentro de Dos Mundos', 'nacional', false, 'Ley 3.810'),
('2020-10-31', 2020, 'Día de las Iglesias Evangélicas y Protestantes', 'nacional', false, 'Ley 20.299'),
('2020-11-01', 2020, 'Día de Todos los Santos', 'nacional', false, 'Ley 2.977'),
('2020-12-08', 2020, 'Inmaculada Concepción', 'nacional', false, 'Ley 2.977'),
('2020-12-25', 2020, 'Navidad', 'nacional', true, 'Ley 2.977')
ON CONFLICT (date) DO NOTHING;

-- Feriados 2021
INSERT INTO public.holidays (date, year, name, type, is_irrenunciable, law_number) VALUES
('2021-01-01', 2021, 'Año Nuevo', 'nacional', true, 'Ley 2.977'),
('2021-04-02', 2021, 'Viernes Santo', 'religioso', false, NULL),
('2021-04-03', 2021, 'Sábado Santo', 'religioso', false, NULL),
('2021-05-01', 2021, 'Día del Trabajo', 'nacional', true, 'Ley 2.200'),
('2021-05-21', 2021, 'Día de las Glorias Navales', 'nacional', false, 'Ley 2.977'),
('2021-06-21', 2021, 'Día Nacional de los Pueblos Indígenas', 'nacional', false, 'Ley 20.911'),
('2021-06-28', 2021, 'San Pedro y San Pablo', 'nacional', false, 'Ley 18.432'),
('2021-07-16', 2021, 'Virgen del Carmen', 'nacional', false, 'Ley 20.148'),
('2021-08-15', 2021, 'Asunción de la Virgen', 'nacional', false, 'Ley 2.977'),
('2021-09-18', 2021, 'Independencia Nacional', 'nacional', true, 'Ley 2.977'),
('2021-09-19', 2021, 'Día de las Glorias del Ejército', 'nacional', true, 'Ley 2.977'),
('2021-10-11', 2021, 'Encuentro de Dos Mundos', 'nacional', false, 'Ley 3.810'),
('2021-10-31', 2021, 'Día de las Iglesias Evangélicas y Protestantes', 'nacional', false, 'Ley 20.299'),
('2021-11-01', 2021, 'Día de Todos los Santos', 'nacional', false, 'Ley 2.977'),
('2021-12-08', 2021, 'Inmaculada Concepción', 'nacional', false, 'Ley 2.977'),
('2021-12-25', 2021, 'Navidad', 'nacional', true, 'Ley 2.977')
ON CONFLICT (date) DO NOTHING;

-- Feriados 2022
INSERT INTO public.holidays (date, year, name, type, is_irrenunciable, law_number) VALUES
('2022-01-01', 2022, 'Año Nuevo', 'nacional', true, 'Ley 2.977'),
('2022-04-15', 2022, 'Viernes Santo', 'religioso', false, NULL),
('2022-04-16', 2022, 'Sábado Santo', 'religioso', false, NULL),
('2022-05-01', 2022, 'Día del Trabajo', 'nacional', true, 'Ley 2.200'),
('2022-05-21', 2022, 'Día de las Glorias Navales', 'nacional', false, 'Ley 2.977'),
('2022-06-20', 2022, 'Día Nacional de los Pueblos Indígenas', 'nacional', false, 'Ley 20.911'),
('2022-06-27', 2022, 'San Pedro y San Pablo', 'nacional', false, 'Ley 18.432'),
('2022-07-16', 2022, 'Virgen del Carmen', 'nacional', false, 'Ley 20.148'),
('2022-08-15', 2022, 'Asunción de la Virgen', 'nacional', false, 'Ley 2.977'),
('2022-09-18', 2022, 'Independencia Nacional', 'nacional', true, 'Ley 2.977'),
('2022-09-19', 2022, 'Día de las Glorias del Ejército', 'nacional', true, 'Ley 2.977'),
('2022-10-10', 2022, 'Encuentro de Dos Mundos', 'nacional', false, 'Ley 3.810'),
('2022-10-31', 2022, 'Día de las Iglesias Evangélicas y Protestantes', 'nacional', false, 'Ley 20.299'),
('2022-11-01', 2022, 'Día de Todos los Santos', 'nacional', false, 'Ley 2.977'),
('2022-12-08', 2022, 'Inmaculada Concepción', 'nacional', false, 'Ley 2.977'),
('2022-12-25', 2022, 'Navidad', 'nacional', true, 'Ley 2.977')
ON CONFLICT (date) DO NOTHING;

-- Feriados 2023
INSERT INTO public.holidays (date, year, name, type, is_irrenunciable, law_number) VALUES
('2023-01-01', 2023, 'Año Nuevo', 'nacional', true, 'Ley 2.977'),
('2023-04-07', 2023, 'Viernes Santo', 'religioso', false, NULL),
('2023-04-08', 2023, 'Sábado Santo', 'religioso', false, NULL),
('2023-05-01', 2023, 'Día del Trabajo', 'nacional', true, 'Ley 2.200'),
('2023-05-21', 2023, 'Día de las Glorias Navales', 'nacional', false, 'Ley 2.977'),
('2023-06-20', 2023, 'Día Nacional de los Pueblos Indígenas', 'nacional', false, 'Ley 20.911'),
('2023-06-26', 2023, 'San Pedro y San Pablo', 'nacional', false, 'Ley 18.432'),
('2023-07-16', 2023, 'Virgen del Carmen', 'nacional', false, 'Ley 20.148'),
('2023-08-15', 2023, 'Asunción de la Virgen', 'nacional', false, 'Ley 2.977'),
('2023-09-18', 2023, 'Independencia Nacional', 'nacional', true, 'Ley 2.977'),
('2023-09-19', 2023, 'Día de las Glorias del Ejército', 'nacional', true, 'Ley 2.977'),
('2023-10-09', 2023, 'Encuentro de Dos Mundos', 'nacional', false, 'Ley 3.810'),
('2023-10-27', 2023, 'Día de las Iglesias Evangélicas y Protestantes', 'nacional', false, 'Ley 20.299'),
('2023-11-01', 2023, 'Día de Todos los Santos', 'nacional', false, 'Ley 2.977'),
('2023-12-08', 2023, 'Inmaculada Concepción', 'nacional', false, 'Ley 2.977'),
('2023-12-25', 2023, 'Navidad', 'nacional', true, 'Ley 2.977')
ON CONFLICT (date) DO NOTHING;

-- Feriados 2024
INSERT INTO public.holidays (date, year, name, type, is_irrenunciable, law_number) VALUES
('2024-01-01', 2024, 'Año Nuevo', 'nacional', true, 'Ley 2.977'),
('2024-03-29', 2024, 'Viernes Santo', 'religioso', false, NULL),
('2024-03-30', 2024, 'Sábado Santo', 'religioso', false, NULL),
('2024-05-01', 2024, 'Día del Trabajo', 'nacional', true, 'Ley 2.200'),
('2024-05-21', 2024, 'Día de las Glorias Navales', 'nacional', false, 'Ley 2.977'),
('2024-06-20', 2024, 'Día Nacional de los Pueblos Indígenas', 'nacional', false, 'Ley 20.911'),
('2024-07-01', 2024, 'San Pedro y San Pablo', 'nacional', false, 'Ley 18.432'),
('2024-07-16', 2024, 'Virgen del Carmen', 'nacional', false, 'Ley 20.148'),
('2024-08-15', 2024, 'Asunción de la Virgen', 'nacional', false, 'Ley 2.977'),
('2024-09-18', 2024, 'Independencia Nacional', 'nacional', true, 'Ley 2.977'),
('2024-09-19', 2024, 'Día de las Glorias del Ejército', 'nacional', true, 'Ley 2.977'),
('2024-09-20', 2024, 'Feriado Adicional', 'nacional', false, 'Ley 20.983'),
('2024-10-12', 2024, 'Encuentro de Dos Mundos', 'nacional', false, 'Ley 3.810'),
('2024-10-31', 2024, 'Día de las Iglesias Evangélicas y Protestantes', 'nacional', false, 'Ley 20.299'),
('2024-11-01', 2024, 'Día de Todos los Santos', 'nacional', false, 'Ley 2.977'),
('2024-12-08', 2024, 'Inmaculada Concepción', 'nacional', false, 'Ley 2.977'),
('2024-12-25', 2024, 'Navidad', 'nacional', true, 'Ley 2.977')
ON CONFLICT (date) DO NOTHING;

-- Feriados 2025
INSERT INTO public.holidays (date, year, name, type, is_irrenunciable, law_number) VALUES
('2025-01-01', 2025, 'Año Nuevo', 'nacional', true, 'Ley 2.977'),
('2025-04-18', 2025, 'Viernes Santo', 'religioso', false, NULL),
('2025-04-19', 2025, 'Sábado Santo', 'religioso', false, NULL),
('2025-05-01', 2025, 'Día del Trabajo', 'nacional', true, 'Ley 2.200'),
('2025-05-21', 2025, 'Día de las Glorias Navales', 'nacional', false, 'Ley 2.977'),
('2025-06-20', 2025, 'Día Nacional de los Pueblos Indígenas', 'nacional', false, 'Ley 20.911'),
('2025-06-29', 2025, 'San Pedro y San Pablo', 'nacional', false, 'Ley 18.432'),
('2025-07-16', 2025, 'Virgen del Carmen', 'nacional', false, 'Ley 20.148'),
('2025-08-15', 2025, 'Asunción de la Virgen', 'nacional', false, 'Ley 2.977'),
('2025-09-18', 2025, 'Independencia Nacional', 'nacional', true, 'Ley 2.977'),
('2025-09-19', 2025, 'Día de las Glorias del Ejército', 'nacional', true, 'Ley 2.977'),
('2025-10-12', 2025, 'Encuentro de Dos Mundos', 'nacional', false, 'Ley 3.810'),
('2025-10-31', 2025, 'Día de las Iglesias Evangélicas y Protestantes', 'nacional', false, 'Ley 20.299'),
('2025-11-01', 2025, 'Día de Todos los Santos', 'nacional', false, 'Ley 2.977'),
('2025-12-08', 2025, 'Inmaculada Concepción', 'nacional', false, 'Ley 2.977'),
('2025-12-25', 2025, 'Navidad', 'nacional', true, 'Ley 2.977')
ON CONFLICT (date) DO NOTHING;

-- Feriados 2026
INSERT INTO public.holidays (date, year, name, type, is_irrenunciable, law_number) VALUES
('2026-01-01', 2026, 'Año Nuevo', 'nacional', true, 'Ley 2.977'),
('2026-04-03', 2026, 'Viernes Santo', 'religioso', false, NULL),
('2026-04-04', 2026, 'Sábado Santo', 'religioso', false, NULL),
('2026-05-01', 2026, 'Día del Trabajo', 'nacional', true, 'Ley 2.200'),
('2026-05-21', 2026, 'Día de las Glorias Navales', 'nacional', false, 'Ley 2.977'),
('2026-06-21', 2026, 'Día Nacional de los Pueblos Indígenas', 'nacional', false, 'Ley 20.911'),
('2026-06-29', 2026, 'San Pedro y San Pablo', 'nacional', false, 'Ley 18.432'),
('2026-07-16', 2026, 'Virgen del Carmen', 'nacional', false, 'Ley 20.148'),
('2026-08-15', 2026, 'Asunción de la Virgen', 'nacional', false, 'Ley 2.977'),
('2026-09-18', 2026, 'Independencia Nacional', 'nacional', true, 'Ley 2.977'),
('2026-09-19', 2026, 'Día de las Glorias del Ejército', 'nacional', true, 'Ley 2.977'),
('2026-10-12', 2026, 'Encuentro de Dos Mundos', 'nacional', false, 'Ley 3.810'),
('2026-10-31', 2026, 'Día de las Iglesias Evangélicas y Protestantes', 'nacional', false, 'Ley 20.299'),
('2026-11-01', 2026, 'Día de Todos los Santos', 'nacional', false, 'Ley 2.977'),
('2026-12-08', 2026, 'Inmaculada Concepción', 'nacional', false, 'Ley 2.977'),
('2026-12-25', 2026, 'Navidad', 'nacional', true, 'Ley 2.977')
ON CONFLICT (date) DO NOTHING;

COMMENT ON TABLE public.holidays IS 'Feriados legales de Chile para cálculo de días hábiles';
COMMENT ON COLUMN public.holidays.is_irrenunciable IS 'Feriados irrenunciables según ley (no se pueden trabajar)';
COMMENT ON COLUMN public.holidays.law_number IS 'Número de ley que establece el feriado';
COMMENT ON COLUMN public.holidays.region IS 'Región para feriados regionales (ej: Arica y Parinacota)';
COMMENT ON COLUMN public.holidays.communes IS 'Comunas específicas para feriados locales (ej: Chillán)';
