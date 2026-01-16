-- MIGRACIÓN 081: Agregar políticas RLS completas para contract_annexes
-- Similar a las políticas de contracts, filtra por company_id

-- Habilitar RLS si no está habilitado
ALTER TABLE contract_annexes ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (excepto la de DELETE que ya existe)
DROP POLICY IF EXISTS "Super admins see all contract_annexes" ON contract_annexes;
DROP POLICY IF EXISTS "Users see contract_annexes of their companies" ON contract_annexes;
DROP POLICY IF EXISTS "Super admins manage all contract_annexes" ON contract_annexes;
DROP POLICY IF EXISTS "Users manage contract_annexes of their companies" ON contract_annexes;

-- SELECT: Super admin ve todas, usuarios ven solo anexos de sus empresas
CREATE POLICY "Super admins see all contract_annexes"
ON contract_annexes FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see contract_annexes of their companies"
ON contract_annexes FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

-- INSERT, UPDATE: Super admin gestiona todas, usuarios solo las de sus empresas
CREATE POLICY "Super admins manage all contract_annexes"
ON contract_annexes FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users manage contract_annexes of their companies"
ON contract_annexes FOR ALL
USING (user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

COMMENT ON POLICY "Super admins see all contract_annexes" ON contract_annexes IS 
'Permite que super admins vean todos los anexos de todas las empresas';

COMMENT ON POLICY "Users see contract_annexes of their companies" ON contract_annexes IS 
'Permite que usuarios vean solo los anexos de las empresas a las que pertenecen';

COMMENT ON POLICY "Super admins manage all contract_annexes" ON contract_annexes IS 
'Permite que super admins gestionen (INSERT, UPDATE) todos los anexos';

COMMENT ON POLICY "Users manage contract_annexes of their companies" ON contract_annexes IS 
'Permite que usuarios gestionen (INSERT, UPDATE) solo los anexos de sus empresas';

