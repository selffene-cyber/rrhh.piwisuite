-- ============================================
-- MIGRACIÓN 009: Datos Mock para Pruebas Completas
-- ============================================
-- Este script crea una empresa de prueba con todos los datos necesarios
-- para probar todas las funcionalidades del sistema
-- 
-- IMPORTANTE: Para eliminar todos estos datos, simplemente elimina la empresa
-- con id = (SELECT id FROM companies WHERE name = 'TechSolutions Chile Ltda.')
-- Todos los datos relacionados se eliminarán automáticamente por CASCADE

-- ============================================
-- 1. CREAR EMPRESA DE PRUEBA
-- ============================================

DO $$
DECLARE
  v_company_id UUID;
  v_admin_user_id UUID;
  v_emp1_id UUID;
  v_emp2_id UUID;
  v_emp3_id UUID;
  v_emp4_id UUID;
  v_emp5_id UUID;
  v_contract1_id UUID;
  v_contract2_id UUID;
  v_contract3_id UUID;
  v_loan1_id UUID;
  v_loan2_id UUID;
  v_period1_id UUID;
  v_period2_id UUID;
  v_payroll1_id UUID;
  v_payroll2_id UUID;
  v_payroll3_period1_id UUID;
  v_payroll3_period2_id UUID;
  v_settlement1_id UUID;
BEGIN

  -- Obtener el user_id del administrador (jeans.selfene@outlook.com)
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE email = 'jeans.selfene@outlook.com'
  LIMIT 1;

  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario jeans.selfene@outlook.com no encontrado. Asegúrate de estar logueado con ese usuario.';
  END IF;

  -- Crear empresa de prueba
  INSERT INTO companies (
    name,
    employer_name,
    rut,
    address,
    city,
    status,
    subscription_tier
  ) VALUES (
    'TechSolutions Chile Ltda.',
    'TechSolutions Chile Limitada',
    '76.123.456-7',
    'Av. Providencia 1234, Oficina 501',
    'Santiago',
    'active',
    'pro'
  )
  RETURNING id INTO v_company_id;

  -- Asignar el usuario como admin de la empresa
  INSERT INTO company_users (
    user_id,
    company_id,
    role,
    status
  ) VALUES (
    v_admin_user_id,
    v_company_id,
    'admin',
    'active'
  );

  -- ============================================
  -- 2. CREAR TRABAJADORES
  -- ============================================

  -- Trabajador 1: Activo, con contrato, sueldo alto
  INSERT INTO employees (
    company_id,
    full_name,
    rut,
    birth_date,
    address,
    phone,
    email,
    hire_date,
    position,
    cost_center,
    afp,
    health_system,
    health_plan,
    base_salary,
    status
  ) VALUES (
    v_company_id,
    'Carlos Andrés Mendoza Rojas',
    '12.345.678-9',
    '1985-03-15',
    'Calle Los Alerces 456, Las Condes',
    '+56987654321',
    'carlos.mendoza@techsolutions.cl',
    '2020-01-15',
    'Desarrollador Senior',
    'IT',
    'HABITAT',
    'ISAPRE',
    'Banmédica Plan Premium',
    2500000,
    'active'
  )
  RETURNING id INTO v_emp1_id;

  -- Trabajador 2: Activo, con varios registros
  INSERT INTO employees (
    company_id,
    full_name,
    rut,
    birth_date,
    address,
    phone,
    email,
    hire_date,
    position,
    cost_center,
    afp,
    health_system,
    base_salary,
    status
  ) VALUES (
    v_company_id,
    'María Fernanda Silva Pérez',
    '15.678.901-2',
    '1990-07-22',
    'Av. Las Condes 7890, Las Condes',
    '+56912345678',
    'maria.silva@techsolutions.cl',
    '2021-06-01',
    'Analista de Recursos Humanos',
    'RRHH',
    'PROVIDA',
    'FONASA',
    1500000,
    'active'
  )
  RETURNING id INTO v_emp2_id;

  -- Trabajador 3: Con préstamos y anticipos
  INSERT INTO employees (
    company_id,
    full_name,
    rut,
    birth_date,
    address,
    phone,
    email,
    hire_date,
    position,
    cost_center,
    afp,
    health_system,
    health_plan,
    base_salary,
    status
  ) VALUES (
    v_company_id,
    'Juan Pablo Torres Morales',
    '18.234.567-8',
    '1988-11-30',
    'Calle Nueva Providencia 234, Providencia',
    '+56934567890',
    'juan.torres@techsolutions.cl',
    '2019-03-10',
    'Gerente de Proyectos',
    'Proyectos',
    'MODELO',
    'ISAPRE',
    'Colmena Plan Básico',
    3200000,
    'active'
  )
  RETURNING id INTO v_emp3_id;

  -- Trabajador 4: Con vacaciones y licencias
  INSERT INTO employees (
    company_id,
    full_name,
    rut,
    birth_date,
    address,
    phone,
    email,
    hire_date,
    position,
    cost_center,
    afp,
    health_system,
    health_plan,
    base_salary,
    status
  ) VALUES (
    v_company_id,
    'Ana Sofía Ramírez González',
    '11.456.789-0',
    '1992-05-18',
    'Av. Vitacura 3456, Vitacura',
    '+56965432109',
    'ana.ramirez@techsolutions.cl',
    '2022-02-01',
    'Diseñadora UX/UI',
    'Diseño',
    'CAPITAL',
    'ISAPRE',
    'Vida Tres Plan Estándar',
    1800000,
    'active'
  )
  RETURNING id INTO v_emp4_id;

  -- Trabajador 5: Para finiquito (que será dado de baja)
  INSERT INTO employees (
    company_id,
    full_name,
    rut,
    birth_date,
    address,
    phone,
    email,
    hire_date,
    position,
    cost_center,
    afp,
    health_system,
    base_salary,
    status
  ) VALUES (
    v_company_id,
    'Roberto Esteban Vásquez López',
    '16.789.012-3',
    '1987-09-12',
    'Calle San Martín 890, Ñuñoa',
    '+56943210987',
    'roberto.vasquez@techsolutions.cl',
    '2018-08-20',
    'Contador',
    'Contabilidad',
    'UNO',
    'FONASA',
    2000000,
    'active'
  )
  RETURNING id INTO v_emp5_id;

  -- ============================================
  -- 3. CREAR CONTRATOS
  -- ============================================

  -- Contrato 1: Indefinido para trabajador 1
  INSERT INTO contracts (
    employee_id,
    company_id,
    contract_type,
    start_date,
    position,
    work_schedule,
    work_location,
    base_salary,
    gratuity,
    payment_method,
    payment_periodicity,
    bank_name,
    account_type,
    account_number,
    status,
    created_by
  ) VALUES (
    v_emp1_id,
    v_company_id,
    'indefinido',
    '2020-01-15',
    'Desarrollador Senior',
    'Lunes a Viernes, 09:00 a 18:00',
    'Oficina Central - Providencia 1234',
    2500000,
    true,
    'transferencia',
    'mensual',
    'Banco de Chile',
    'corriente',
    '1234567890',
    'active',
    v_admin_user_id
  )
  RETURNING id INTO v_contract1_id;

  -- Contrato 2: Indefinido para trabajador 2
  INSERT INTO contracts (
    employee_id,
    company_id,
    contract_type,
    start_date,
    position,
    work_schedule,
    work_location,
    base_salary,
    gratuity,
    payment_method,
    payment_periodicity,
    status,
    created_by
  ) VALUES (
    v_emp2_id,
    v_company_id,
    'indefinido',
    '2021-06-01',
    'Analista de Recursos Humanos',
    'Lunes a Viernes, 08:30 a 17:30',
    'Oficina Central - Providencia 1234',
    1500000,
    true,
    'transferencia',
    'mensual',
    'active',
    v_admin_user_id
  )
  RETURNING id INTO v_contract2_id;

  -- Contrato 3: Plazo fijo para trabajador 3
  INSERT INTO contracts (
    employee_id,
    company_id,
    contract_type,
    start_date,
    end_date,
    position,
    work_schedule,
    work_location,
    base_salary,
    gratuity,
    payment_method,
    payment_periodicity,
    status,
    created_by
  ) VALUES (
    v_emp3_id,
    v_company_id,
    'plazo_fijo',
    '2019-03-10',
    '2025-12-31',
    'Gerente de Proyectos',
    'Lunes a Viernes, 09:00 a 19:00',
    'Oficina Central - Providencia 1234',
    3200000,
    true,
    'transferencia',
    'mensual',
    'active',
    v_admin_user_id
  )
  RETURNING id INTO v_contract3_id;

  -- ============================================
  -- 4. CREAR ANEXO DE CONTRATO (Modificación de sueldo)
  -- ============================================

  INSERT INTO contract_annexes (
    contract_id,
    employee_id,
    company_id,
    annex_type,
    start_date,
    content,
    modifications_summary,
    status,
    created_by
  ) VALUES (
    v_contract1_id,
    v_emp1_id,
    v_company_id,
    'modificacion_sueldo',
    '2023-06-01',
    'Se modifica el sueldo base del trabajador de $2.200.000 a $2.500.000 a partir del 1 de junio de 2023, manteniéndose todos los demás términos y condiciones del contrato original.',
    'Modificación de sueldo: aumento de $300.000 mensuales',
    'active',
    v_admin_user_id
  );

  -- ============================================
  -- 5. CREAR PERÍODOS DE LIQUIDACIÓN
  -- ============================================

  -- Período 1: Mes anterior (para tener historial)
  INSERT INTO payroll_periods (
    company_id,
    year,
    month,
    status
  ) VALUES (
    v_company_id,
    EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER,
    'closed'
  )
  RETURNING id INTO v_period1_id;

  -- Período 2: Mes actual
  INSERT INTO payroll_periods (
    company_id,
    year,
    month,
    status
  ) VALUES (
    v_company_id,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    'open'
  )
  RETURNING id INTO v_period2_id;

  -- ============================================
  -- 6. CREAR LIQUIDACIONES DE SUELDO
  -- ============================================

  -- Liquidación 1: Mes anterior para trabajador 1
  INSERT INTO payroll_slips (
    employee_id,
    period_id,
    days_worked,
    days_leave,
    base_salary,
    taxable_base,
    total_taxable_earnings,
    total_non_taxable_earnings,
    total_earnings,
    total_legal_deductions,
    total_other_deductions,
    total_deductions,
    net_pay,
    status
  ) VALUES (
    v_emp1_id,
    v_period1_id,
    30,
    0,
    2500000,
    2500000,
    3125000,
    0,
    3125000,
    450000,
    0,
    450000,
    2675000,
    'sent'
  )
  RETURNING id INTO v_payroll1_id;

  -- Items de liquidación 1
  INSERT INTO payroll_items (payroll_slip_id, type, category, description, amount) VALUES
    (v_payroll1_id, 'taxable_earning', 'sueldo_base', 'Sueldo Base', 2500000),
    (v_payroll1_id, 'taxable_earning', 'gratificacion', 'Gratificación Legal', 625000),
    (v_payroll1_id, 'legal_deduction', 'afp_10', 'AFP 10%', 250000),
    (v_payroll1_id, 'legal_deduction', 'salud', 'Salud', 150000),
    (v_payroll1_id, 'legal_deduction', 'seguro_cesantia', 'Seguro de Cesantía', 12500),
    (v_payroll1_id, 'legal_deduction', 'impuesto_unico', 'Impuesto Único', 37500);

  -- Liquidación 2: Mes actual para trabajador 2
  INSERT INTO payroll_slips (
    employee_id,
    period_id,
    days_worked,
    days_leave,
    base_salary,
    taxable_base,
    total_taxable_earnings,
    total_non_taxable_earnings,
    total_earnings,
    total_legal_deductions,
    total_other_deductions,
    total_deductions,
    net_pay,
    status
  ) VALUES (
    v_emp2_id,
    v_period2_id,
    30,
    0,
    1500000,
    1500000,
    1875000,
    0,
    1875000,
    300000,
    0,
    300000,
    1575000,
    'draft'
  )
  RETURNING id INTO v_payroll2_id;

  -- Items de liquidación 2
  INSERT INTO payroll_items (payroll_slip_id, type, category, description, amount) VALUES
    (v_payroll2_id, 'taxable_earning', 'sueldo_base', 'Sueldo Base', 1500000),
    (v_payroll2_id, 'taxable_earning', 'gratificacion', 'Gratificación Legal', 375000),
    (v_payroll2_id, 'legal_deduction', 'afp_10', 'AFP 10%', 150000),
    (v_payroll2_id, 'legal_deduction', 'salud', 'Salud', 120000),
    (v_payroll2_id, 'legal_deduction', 'seguro_cesantia', 'Seguro de Cesantía', 7500),
    (v_payroll2_id, 'legal_deduction', 'impuesto_unico', 'Impuesto Único', 22500);

  -- ============================================
  -- 7. CREAR ANTICIPOS
  -- ============================================

  -- Anticipo 1: Pagado y descontado
  INSERT INTO advances (
    employee_id,
    company_id,
    period,
    advance_date,
    amount,
    reason,
    payment_method,
    status,
    payroll_slip_id,
    created_by,
    issued_at,
    paid_at,
    discounted_at
  ) VALUES (
    v_emp3_id,
    v_company_id,
    TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
    CURRENT_DATE - INTERVAL '15 days',
    200000,
    'Anticipo por gastos médicos',
    'transferencia',
    'descontado',
    v_payroll1_id,
    v_admin_user_id,
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE - INTERVAL '14 days',
    CURRENT_DATE - INTERVAL '1 day'
  );

  -- Anticipo 2: Firmado pero no descontado
  INSERT INTO advances (
    employee_id,
    company_id,
    period,
    advance_date,
    amount,
    reason,
    payment_method,
    status,
    created_by,
    issued_at,
    signed_at
  ) VALUES (
    v_emp3_id,
    v_company_id,
    TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
    CURRENT_DATE - INTERVAL '5 days',
    150000,
    'Anticipo por emergencia familiar',
    'transferencia',
    'firmado',
    v_admin_user_id,
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE - INTERVAL '4 days'
  );

  -- Anticipo 3: Borrador
  INSERT INTO advances (
    employee_id,
    company_id,
    period,
    advance_date,
    amount,
    reason,
    payment_method,
    status,
    created_by
  ) VALUES (
    v_emp4_id,
    v_company_id,
    TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
    CURRENT_DATE,
    100000,
    'Anticipo para compra de materiales de trabajo',
    'transferencia',
    'borrador',
    v_admin_user_id
  );

  -- ============================================
  -- 8. CREAR PRÉSTAMOS
  -- ============================================

  -- Préstamo 1: Activo con pagos parciales
  INSERT INTO loans (
    employee_id,
    amount,
    interest_rate,
    total_amount,
    installments,
    installment_amount,
    status,
    paid_installments,
    remaining_amount,
    loan_date,
    description
  ) VALUES (
    v_emp3_id,
    2000000,
    0,
    2000000,
    10,
    200000,
    'active',
    2,
    1600000,
    CURRENT_DATE - INTERVAL '3 months',
    'Préstamo para compra de vehículo'
  )
  RETURNING id INTO v_loan1_id;

  -- Crear liquidación para trabajador 3 en período 1 (para pagos del préstamo)
  SELECT id INTO v_payroll3_period1_id FROM payroll_slips 
  WHERE employee_id = v_emp3_id AND period_id = v_period1_id;

  IF v_payroll3_period1_id IS NULL THEN
    INSERT INTO payroll_slips (
      employee_id,
      period_id,
      days_worked,
      days_leave,
      base_salary,
      taxable_base,
      total_taxable_earnings,
      total_non_taxable_earnings,
      total_earnings,
      total_legal_deductions,
      total_other_deductions,
      total_deductions,
      net_pay,
      status
    ) VALUES (
      v_emp3_id,
      v_period1_id,
      30,
      0,
      3200000,
      3200000,
      4000000,
      0,
      4000000,
      500000,
      200000,
      700000,
      3300000,
      'sent'
    )
    RETURNING id INTO v_payroll3_period1_id;
  END IF;

  -- Crear liquidación para trabajador 3 en período 2 (para tercer pago del préstamo)
  SELECT id INTO v_payroll3_period2_id FROM payroll_slips 
  WHERE employee_id = v_emp3_id AND period_id = v_period2_id;

  IF v_payroll3_period2_id IS NULL THEN
    INSERT INTO payroll_slips (
      employee_id,
      period_id,
      days_worked,
      days_leave,
      base_salary,
      taxable_base,
      total_taxable_earnings,
      total_non_taxable_earnings,
      total_earnings,
      total_legal_deductions,
      total_other_deductions,
      total_deductions,
      net_pay,
      status
    ) VALUES (
      v_emp3_id,
      v_period2_id,
      30,
      0,
      3200000,
      3200000,
      4000000,
      0,
      4000000,
      500000,
      200000,
      700000,
      3300000,
      'draft'
    )
    RETURNING id INTO v_payroll3_period2_id;
  END IF;

  -- Registrar 2 pagos del préstamo (uno en período 1, uno en período 2)
  -- Nota: El constraint UNIQUE(loan_id, payroll_slip_id) solo permite un pago por préstamo por liquidación
  -- En un escenario real, cada pago estaría en su propio período/mes
  INSERT INTO loan_payments (loan_id, payroll_slip_id, installment_number, amount, payment_date) 
  SELECT v_loan1_id, v_payroll3_period1_id, 1, 200000, CURRENT_DATE - INTERVAL '2 months'
  WHERE NOT EXISTS (
    SELECT 1 FROM loan_payments WHERE loan_id = v_loan1_id AND payroll_slip_id = v_payroll3_period1_id
  );

  INSERT INTO loan_payments (loan_id, payroll_slip_id, installment_number, amount, payment_date) 
  SELECT v_loan1_id, v_payroll3_period2_id, 2, 200000, CURRENT_DATE - INTERVAL '1 month'
  WHERE NOT EXISTS (
    SELECT 1 FROM loan_payments WHERE loan_id = v_loan1_id AND payroll_slip_id = v_payroll3_period2_id
  );

  -- Préstamo 2: Nuevo, sin pagos
  INSERT INTO loans (
    employee_id,
    amount,
    interest_rate,
    total_amount,
    installments,
    installment_amount,
    status,
    paid_installments,
    remaining_amount,
    loan_date,
    description
  ) VALUES (
    v_emp4_id,
    500000,
    0,
    500000,
    5,
    100000,
    'active',
    0,
    500000,
    CURRENT_DATE - INTERVAL '1 month',
    'Préstamo para gastos personales'
  )
  RETURNING id INTO v_loan2_id;

  -- ============================================
  -- 9. CREAR VACACIONES
  -- ============================================

  -- Vacación 1: Tomada (histórica)
  INSERT INTO vacations (
    employee_id,
    start_date,
    end_date,
    days_count,
    status,
    request_date,
    approval_date,
    notes
  ) VALUES (
    v_emp4_id,
    CURRENT_DATE - INTERVAL '6 months',
    CURRENT_DATE - INTERVAL '5 months' + INTERVAL '14 days',
    15,
    'tomada',
    CURRENT_DATE - INTERVAL '7 months',
    CURRENT_DATE - INTERVAL '7 months' + INTERVAL '5 days',
    'Vacaciones de verano'
  );

  -- Vacación 2: Aprobada (por tomar)
  INSERT INTO vacations (
    employee_id,
    start_date,
    end_date,
    days_count,
    status,
    request_date,
    approval_date,
    notes
  ) VALUES (
    v_emp1_id,
    CURRENT_DATE + INTERVAL '1 month',
    CURRENT_DATE + INTERVAL '1 month' + INTERVAL '9 days',
    10,
    'aprobada',
    CURRENT_DATE - INTERVAL '1 month',
    CURRENT_DATE - INTERVAL '20 days',
    'Vacaciones planificadas'
  );

  -- Vacación 3: Solicitada (pendiente de aprobación)
  INSERT INTO vacations (
    employee_id,
    start_date,
    end_date,
    days_count,
    status,
    request_date,
    notes
  ) VALUES (
    v_emp2_id,
    CURRENT_DATE + INTERVAL '2 months',
    CURRENT_DATE + INTERVAL '2 months' + INTERVAL '4 days',
    5,
    'solicitada',
    CURRENT_DATE - INTERVAL '10 days',
    'Vacaciones cortas'
  );

  -- ============================================
  -- 10. CREAR LICENCIAS MÉDICAS
  -- ============================================

  -- Licencia 1: Enfermedad común (histórica)
  INSERT INTO medical_leaves (
    employee_id,
    start_date,
    end_date,
    leave_type,
    days_count,
    folio_number,
    is_active,
    description
  ) VALUES (
    v_emp2_id,
    CURRENT_DATE - INTERVAL '3 months',
    CURRENT_DATE - INTERVAL '3 months' + INTERVAL '4 days',
    'enfermedad_comun',
    5,
    'LM-2024-001234',
    false,
    'Gripe y resfriado común'
  );

  -- Licencia 2: Accidente de trabajo (histórica)
  INSERT INTO medical_leaves (
    employee_id,
    start_date,
    end_date,
    leave_type,
    days_count,
    folio_number,
    is_active,
    description
  ) VALUES (
    v_emp1_id,
    CURRENT_DATE - INTERVAL '2 months',
    CURRENT_DATE - INTERVAL '2 months' + INTERVAL '9 days',
    'accidente_trabajo',
    10,
    'LM-2024-002345',
    false,
    'Accidente en oficina - caída'
  );

  -- Licencia 3: Activa (maternidad)
  INSERT INTO medical_leaves (
    employee_id,
    start_date,
    end_date,
    leave_type,
    days_count,
    folio_number,
    is_active,
    description
  ) VALUES (
    v_emp4_id,
    CURRENT_DATE - INTERVAL '1 month',
    CURRENT_DATE + INTERVAL '4 months',
    'maternidad',
    126,
    'LM-2024-003456',
    true,
    'Licencia por maternidad'
  );

  -- ============================================
  -- 11. CREAR FINIQUITO
  -- ============================================

  -- Finiquito para trabajador 5 (despido por necesidades de la empresa)
  INSERT INTO settlements (
    employee_id,
    company_id,
    contract_id,
    termination_date,
    cause_code,
    contract_start_date,
    last_salary_monthly,
    worked_days_last_month,
    service_days,
    service_years_raw,
    service_years_effective,
    service_years_capped,
    vacation_days_pending,
    notice_given,
    notice_days,
    salary_balance,
    vacation_payout,
    ias_amount,
    iap_amount,
    total_earnings,
    loan_balance,
    advance_balance,
    total_deductions,
    net_to_pay,
    status,
    calculation_version,
    created_by
  ) VALUES (
    v_emp5_id,
    v_company_id,
    NULL,
    CURRENT_DATE,
    '161_1',
    '2018-08-20',
    2000000,
    15,
    (CURRENT_DATE - DATE '2018-08-20')::INTEGER,
    (CURRENT_DATE - DATE '2018-08-20') / 365.0,
    6,
    6,
    15.5,
    false,
    0,
    1000000,
    1033333,
    12000000,
    2000000,
    16033333,
    0,
    0,
    0,
    16033333,
    'approved',
    1,
    v_admin_user_id
  )
  RETURNING id INTO v_settlement1_id;

  -- Items del finiquito
  INSERT INTO settlement_items (settlement_id, type, category, description, amount) VALUES
    (v_settlement1_id, 'earning', 'salary_balance', 'Saldo de sueldo proporcional', 1000000),
    (v_settlement1_id, 'earning', 'vacation', 'Pago de vacaciones pendientes (15.5 días)', 1033333),
    (v_settlement1_id, 'earning', 'ias', 'Indemnización por años de servicio (6 años)', 12000000),
    (v_settlement1_id, 'earning', 'iap', 'Indemnización por aviso previo', 2000000);

  -- Cambiar estado del trabajador a inactivo
  UPDATE employees SET status = 'inactive' WHERE id = v_emp5_id;

  RAISE NOTICE 'Datos mock creados exitosamente!';
  RAISE NOTICE 'Empresa ID: %', v_company_id;
  RAISE NOTICE 'Trabajadores creados: 5';
  RAISE NOTICE 'Contratos creados: 3';
  RAISE NOTICE 'Anexos creados: 1';
  RAISE NOTICE 'Liquidaciones creadas: 2';
  RAISE NOTICE 'Anticipos creados: 3';
  RAISE NOTICE 'Préstamos creados: 2';
  RAISE NOTICE 'Vacaciones creadas: 3';
  RAISE NOTICE 'Licencias médicas creadas: 3';
  RAISE NOTICE 'Finiquitos creados: 1';

END $$;

-- ============================================
-- VERIFICACIÓN: Contar registros creados
-- ============================================

DO $$
DECLARE
  v_company_id UUID;
  v_counts RECORD;
BEGIN
  SELECT id INTO v_company_id
  FROM companies
  WHERE name = 'TechSolutions Chile Ltda.'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE NOTICE 'Empresa no encontrada. Los datos pueden no haberse creado correctamente.';
    RETURN;
  END IF;

  SELECT 
    (SELECT COUNT(*) FROM employees WHERE company_id = v_company_id) as employees,
    (SELECT COUNT(*) FROM contracts WHERE company_id = v_company_id) as contracts,
    (SELECT COUNT(*) FROM contract_annexes WHERE company_id = v_company_id) as annexes,
    (SELECT COUNT(*) FROM payroll_periods WHERE company_id = v_company_id) as payroll_periods,
    (SELECT COUNT(*) FROM payroll_slips WHERE period_id IN (SELECT id FROM payroll_periods WHERE company_id = v_company_id)) as payroll_slips,
    (SELECT COUNT(*) FROM advances WHERE company_id = v_company_id) as advances,
    (SELECT COUNT(*) FROM loans WHERE employee_id IN (SELECT id FROM employees WHERE company_id = v_company_id)) as loans,
    (SELECT COUNT(*) FROM vacations WHERE employee_id IN (SELECT id FROM employees WHERE company_id = v_company_id)) as vacations,
    (SELECT COUNT(*) FROM medical_leaves WHERE employee_id IN (SELECT id FROM employees WHERE company_id = v_company_id)) as medical_leaves,
    (SELECT COUNT(*) FROM settlements WHERE company_id = v_company_id) as settlements
  INTO v_counts;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE DATOS CREADOS:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Empresa: TechSolutions Chile Ltda.';
  RAISE NOTICE 'Trabajadores: %', v_counts.employees;
  RAISE NOTICE 'Contratos: %', v_counts.contracts;
  RAISE NOTICE 'Anexos: %', v_counts.annexes;
  RAISE NOTICE 'Períodos de liquidación: %', v_counts.payroll_periods;
  RAISE NOTICE 'Liquidaciones: %', v_counts.payroll_slips;
  RAISE NOTICE 'Anticipos: %', v_counts.advances;
  RAISE NOTICE 'Préstamos: %', v_counts.loans;
  RAISE NOTICE 'Vacaciones: %', v_counts.vacations;
  RAISE NOTICE 'Licencias médicas: %', v_counts.medical_leaves;
  RAISE NOTICE 'Finiquitos: %', v_counts.settlements;
  RAISE NOTICE '========================================';

END $$;

-- ============================================
-- NOTAS:
-- ============================================
-- Para eliminar todos estos datos de prueba:
-- DELETE FROM companies WHERE name = 'TechSolutions Chile Ltda.';
-- (Todos los datos relacionados se eliminarán automáticamente por CASCADE)
--
-- Para verificar los datos creados:
-- SELECT * FROM companies WHERE name = 'TechSolutions Chile Ltda.';
-- SELECT * FROM employees WHERE company_id = (SELECT id FROM companies WHERE name = 'TechSolutions Chile Ltda.');

