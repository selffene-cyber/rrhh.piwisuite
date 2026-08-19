-- Migration 136: Add LRE configuration fields to companies table
-- Company-level settings for Mutual/Ley 16.744 (code 1152) and SAT accident rate (code 4152)

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS mutual_ley16744_code integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sat_accident_rate numeric(6,4) DEFAULT 0;

COMMENT ON COLUMN companies.mutual_ley16744_code IS 'Codigo DT del organismo administrador Ley 16.744 (0=Sin mutual, 1=ACHS, 2=Mutual CCHC, 3=IST). Nivel empresa, se usa para LRE codigo 1152.';
COMMENT ON COLUMN companies.sat_accident_rate IS 'Tasa del Seguro contra Accidentes del Trabajo y Enfermedades Profesionales (SAT). Porcentaje sobre base imponible. Usado para LRE codigo 4152 desde agosto 2026.';

-- Propagar el mutual_ley16744_code existente desde employees a companies
-- Para cada empresa, tomar el valor mas frecuente de dt_mutual_code en sus empleados
UPDATE companies c
SET mutual_ley16744_code = sub.most_common_mutual
FROM (
  SELECT e.company_id, 
         MODE() WITHIN GROUP (ORDER BY e.dt_mutual_code) AS most_common_mutual
  FROM employees e
  WHERE e.dt_mutual_code IS NOT NULL AND e.dt_mutual_code > 0
  GROUP BY e.company_id
) sub
WHERE c.id = sub.company_id;