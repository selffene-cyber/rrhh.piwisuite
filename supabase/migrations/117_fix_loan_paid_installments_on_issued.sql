-- Corregir paid_installments para préstamos que tienen loan_payments de liquidaciones emitidas
-- pero paid_installments no se actualizó correctamente
-- Este script se ejecuta cuando se emite una liquidación o manualmente para corregir datos históricos

-- Función para recalcular paid_installments de un préstamo específico
CREATE OR REPLACE FUNCTION recalculate_loan_paid_installments(loan_uuid UUID)
RETURNS TABLE(
  loan_id UUID,
  loan_number VARCHAR,
  old_paid_installments INTEGER,
  new_paid_installments INTEGER,
  old_remaining_amount DECIMAL,
  new_remaining_amount DECIMAL,
  old_status VARCHAR,
  new_status VARCHAR
) AS $$
DECLARE
    loan_record RECORD;
    actual_paid_count INTEGER;
    loan_total DECIMAL(12, 2);
    total_paid DECIMAL(12, 2);
    calculated_remaining DECIMAL(12, 2);
    new_status TEXT;
BEGIN
    -- Obtener datos del préstamo
    SELECT 
        l.id,
        l.loan_number,
        l.amount,
        l.total_amount,
        l.installment_amount,
        l.paid_installments,
        l.remaining_amount,
        l.status
    INTO loan_record
    FROM loans l
    WHERE l.id = loan_uuid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Préstamo con ID % no encontrado', loan_uuid;
    END IF;

    -- Contar pagos reales de liquidaciones emitidas (no borradores)
    SELECT COUNT(*)
    INTO actual_paid_count
    FROM loan_payments lp
    INNER JOIN payroll_slips ps ON lp.payroll_slip_id = ps.id
    WHERE lp.loan_id = loan_uuid
      AND ps.status = 'issued';
    
    -- Calcular montos
    loan_total := COALESCE(loan_record.total_amount, loan_record.amount, 0);
    total_paid := actual_paid_count * loan_record.installment_amount;
    calculated_remaining := GREATEST(0, loan_total - total_paid);
    
    -- Determinar nuevo estado
    IF calculated_remaining <= 0 THEN
        new_status := 'paid';
    ELSE
        new_status := 'active';
    END IF;
    
    -- Actualizar el préstamo
    UPDATE loans
    SET 
        paid_installments = actual_paid_count,
        remaining_amount = calculated_remaining,
        status = new_status,
        paid_at = CASE WHEN new_status = 'paid' THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE id = loan_uuid;
    
    -- Retornar resultados
    RETURN QUERY SELECT 
        loan_uuid,
        loan_record.loan_number,
        loan_record.paid_installments,
        actual_paid_count,
        loan_record.remaining_amount,
        calculated_remaining,
        loan_record.status,
        new_status;
END;
$$ LANGUAGE plpgsql;

-- Función para corregir todos los préstamos activos
CREATE OR REPLACE FUNCTION fix_all_loans_paid_installments()
RETURNS TABLE(
  loan_id UUID,
  loan_number VARCHAR,
  old_paid_installments INTEGER,
  new_paid_installments INTEGER,
  old_remaining_amount DECIMAL,
  new_remaining_amount DECIMAL,
  old_status VARCHAR,
  new_status VARCHAR
) AS $$
DECLARE
    loan_record RECORD;
BEGIN
    -- Iterar sobre todos los préstamos activos y usar RETURN QUERY
    FOR loan_record IN 
        SELECT id
        FROM loans
        WHERE status IN ('active', 'paid')
    LOOP
        -- Usar RETURN QUERY para retornar los resultados directamente
        RETURN QUERY 
        SELECT * FROM recalculate_loan_paid_installments(loan_record.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON FUNCTION recalculate_loan_paid_installments(UUID) IS 'Recalcula paid_installments, remaining_amount y status de un préstamo basándose en loan_payments de liquidaciones emitidas';
COMMENT ON FUNCTION fix_all_loans_paid_installments() IS 'Corrige paid_installments para todos los préstamos activos y pagados';
