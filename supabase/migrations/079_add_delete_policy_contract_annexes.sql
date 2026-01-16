-- MIGRACIÓN 079: Agregar política RLS para DELETE en contract_annexes
-- Permite que admins/HR eliminen anexos solo si están en draft o cancelled

-- Habilitar RLS si no está habilitado
ALTER TABLE contract_annexes ENABLE ROW LEVEL SECURITY;

-- Eliminar política si existe
DROP POLICY IF EXISTS "Admins can delete contract annexes" ON contract_annexes;

-- Política para que admins/HR puedan eliminar anexos (solo si están en draft o cancelled)
CREATE POLICY "Admins can delete contract annexes"
  ON contract_annexes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = contract_annexes.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('hr', 'admin', 'owner')
      AND company_users.status = 'active'
    )
    AND status IN ('draft', 'cancelled')
  );

COMMENT ON POLICY "Admins can delete contract annexes" ON contract_annexes IS 
'Permite que usuarios con rol hr/admin/owner eliminen anexos de su empresa, pero solo si están en estado draft o cancelled';





