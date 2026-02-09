-- Script para eliminar el préstamo PT-09 con fecha incorrecta
-- ID del préstamo: c69e069b-1c14-46ef-b8e6-2669cfffa78a

-- Verificar si el préstamo tiene pagos asociados
DO $$
DECLARE
  v_loan_id UUID := 'c69e069b-1c14-46ef-b8e6-2669cfffa78a';
  v_has_payments BOOLEAN;
  v_has_installments BOOLEAN;
  v_has_payroll_items BOOLEAN;
BEGIN
  -- Verificar pagos
  SELECT EXISTS(SELECT 1 FROM loan_payments WHERE loan_id = v_loan_id) INTO v_has_payments;
  
  -- Verificar cuotas
  SELECT EXISTS(SELECT 1 FROM loan_installments WHERE loan_id = v_loan_id) INTO v_has_installments;
  
  -- Verificar items de liquidación
  SELECT EXISTS(SELECT 1 FROM payroll_items WHERE loan_id = v_loan_id) INTO v_has_payroll_items;
  
  RAISE NOTICE 'Verificación del préstamo:';
  RAISE NOTICE '  - Tiene pagos: %', v_has_payments;
  RAISE NOTICE '  - Tiene cuotas: %', v_has_installments;
  RAISE NOTICE '  - Tiene items de liquidación: %', v_has_payroll_items;
  
  -- Si tiene pagos o items de liquidación, no se puede eliminar directamente
  IF v_has_payments OR v_has_payroll_items THEN
    RAISE EXCEPTION 'El préstamo tiene pagos o items de liquidación asociados. No se puede eliminar directamente.';
  END IF;
  
  -- Eliminar cuotas primero (si existen)
  IF v_has_installments THEN
    DELETE FROM loan_installments WHERE loan_id = v_loan_id;
    RAISE NOTICE 'Cuotas eliminadas';
  END IF;
  
  -- Eliminar el préstamo
  DELETE FROM loans WHERE id = v_loan_id;
  RAISE NOTICE 'Préstamo eliminado correctamente';
  
END $$;
