-- ============================================
-- FIX: Números de préstamo duplicados
-- ============================================

-- 1️⃣ Ver préstamos duplicados
SELECT 
  '1️⃣ PRÉSTAMOS DUPLICADOS' as paso,
  loan_number,
  COUNT(*) as cantidad,
  string_agg(id::text, ', ') as ids_duplicados
FROM loans
WHERE loan_number IS NOT NULL
GROUP BY loan_number
HAVING COUNT(*) > 1
ORDER BY loan_number;

-- 2️⃣ Renumerar préstamos duplicados
DO $$
DECLARE
  r RECORD;
  new_number INTEGER;
  max_number INTEGER;
BEGIN
  -- Obtener el número máximo actual
  SELECT COALESCE(MAX(CAST(REPLACE(loan_number, 'PT-', '') AS INTEGER)), 0) 
  INTO max_number
  FROM loans
  WHERE loan_number LIKE 'PT-%';
  
  RAISE NOTICE '📊 Número máximo actual: PT-%', max_number;
  
  -- Para cada préstamo duplicado (excepto el más antiguo), asignar nuevo número
  FOR r IN (
    SELECT id, loan_number, created_at,
           ROW_NUMBER() OVER (PARTITION BY loan_number ORDER BY created_at) as rn
    FROM loans
    WHERE loan_number IS NOT NULL
  ) LOOP
    IF r.rn > 1 THEN
      max_number := max_number + 1;
      UPDATE loans
      SET loan_number = 'PT-' || LPAD(max_number::text, 2, '0')
      WHERE id = r.id;
      
      RAISE NOTICE '✅ Renumerado: % -> PT-%', r.loan_number, LPAD(max_number::text, 2, '0');
    END IF;
  END LOOP;
END $$;

-- 3️⃣ Asignar números a préstamos sin número
DO $$
DECLARE
  r RECORD;
  new_number INTEGER;
  max_number INTEGER;
BEGIN
  -- Obtener el número máximo actual
  SELECT COALESCE(MAX(CAST(REPLACE(loan_number, 'PT-', '') AS INTEGER)), 0) 
  INTO max_number
  FROM loans
  WHERE loan_number LIKE 'PT-%';
  
  -- Asignar números a préstamos sin loan_number
  FOR r IN (
    SELECT id, created_at
    FROM loans
    WHERE loan_number IS NULL
    ORDER BY created_at
  ) LOOP
    max_number := max_number + 1;
    UPDATE loans
    SET loan_number = 'PT-' || LPAD(max_number::text, 2, '0')
    WHERE id = r.id;
    
    RAISE NOTICE '✅ Asignado número: PT-% al préstamo %', LPAD(max_number::text, 2, '0'), r.id;
  END LOOP;
END $$;

-- 4️⃣ Verificación final
SELECT 
  '4️⃣ VERIFICACIÓN FINAL' as paso,
  COUNT(*) as total_prestamos,
  COUNT(DISTINCT loan_number) as numeros_unicos,
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT loan_number) THEN '✅ Sin duplicados'
    ELSE '❌ Todavía hay duplicados'
  END as estado
FROM loans
WHERE loan_number IS NOT NULL;

-- 5️⃣ Ver todos los préstamos ordenados
SELECT 
  '5️⃣ PRÉSTAMOS ORDENADOS' as paso,
  l.loan_number,
  e.full_name as trabajador,
  l.amount,
  l.created_at
FROM loans l
JOIN employees e ON e.id = l.employee_id
ORDER BY 
  CAST(REPLACE(l.loan_number, 'PT-', '') AS INTEGER);

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Números de préstamo reparados';
  RAISE NOTICE '============================================';
END $$;
