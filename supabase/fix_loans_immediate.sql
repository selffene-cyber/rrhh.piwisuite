-- Script de corrección inmediata para préstamos
-- Ejecutar este script en Supabase SQL Editor para corregir paid_installments de todos los préstamos
-- que tienen loan_payments de liquidaciones emitidas pero paid_installments no se actualizó

DO $$
DECLARE
    loan_record RECORD;
    actual_paid_count INTEGER;
    loan_total DECIMAL(12, 2);
    total_paid DECIMAL(12, 2);
    calculated_remaining DECIMAL(12, 2);
    new_status TEXT;
    corrected_count INTEGER := 0;
BEGIN
    -- Iterar sobre todos los préstamos activos y pagados
    FOR loan_record IN 
        SELECT 
            l.id,
            l.loan_number,
            l.amount,
            l.total_amount,
            l.installment_amount,
            l.paid_installments,
            l.remaining_amount,
            l.status
        FROM loans l
        WHERE l.status IN ('active', 'paid')
    LOOP
        -- Contar pagos reales de liquidaciones emitidas (no borradores)
        SELECT COUNT(*)
        INTO actual_paid_count
        FROM loan_payments lp
        INNER JOIN payroll_slips ps ON lp.payroll_slip_id = ps.id
        WHERE lp.loan_id = loan_record.id
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
        
        -- Actualizar solo si hay diferencia
        IF loan_record.paid_installments != actual_paid_count 
           OR loan_record.remaining_amount != calculated_remaining 
           OR loan_record.status != new_status THEN
            
            RAISE NOTICE 'Corrigiendo préstamo %: paid_installments % -> %, remaining_amount % -> %, status % -> %',
                loan_record.loan_number,
                loan_record.paid_installments,
                actual_paid_count,
                loan_record.remaining_amount,
                calculated_remaining,
                loan_record.status,
                new_status;
            
            UPDATE loans
            SET 
                paid_installments = actual_paid_count,
                remaining_amount = calculated_remaining,
                status = new_status,
                paid_at = CASE WHEN new_status = 'paid' THEN NOW() ELSE NULL END,
                updated_at = NOW()
            WHERE id = loan_record.id;
            
            corrected_count := corrected_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Corrección completada. % préstamos corregidos.', corrected_count;
END $$;
