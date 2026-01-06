-- ============================================
-- MIGRACIÓN 035: Crear tabla departments con jerarquía
-- ============================================
-- Tabla de departamentos con estructura jerárquica tipo árbol
-- ============================================

-- Tabla de departamentos con jerarquía
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT departments_company_name_unique UNIQUE (company_id, name),
  CONSTRAINT departments_no_self_parent CHECK (id != parent_department_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_company_status ON departments(company_id, status);

-- Comentarios
COMMENT ON TABLE departments IS 'Tabla de departamentos con estructura jerárquica. Representa la estructura organizacional de la empresa.';
COMMENT ON COLUMN departments.company_id IS 'ID de la empresa a la que pertenece el departamento';
COMMENT ON COLUMN departments.name IS 'Nombre del departamento';
COMMENT ON COLUMN departments.code IS 'Código opcional del departamento';
COMMENT ON COLUMN departments.status IS 'Estado del departamento: active o inactive';
COMMENT ON COLUMN departments.parent_department_id IS 'ID del departamento padre. NULL para departamentos raíz. La jerarquía de departamentos es independiente de la jerarquía laboral entre trabajadores.';

-- ============================================
-- Función para prevenir ciclos jerárquicos
-- ============================================
CREATE OR REPLACE FUNCTION check_department_cycle()
RETURNS TRIGGER AS $$
DECLARE
  current_id UUID := NEW.id;
  parent_id UUID := NEW.parent_department_id;
  visited UUID[] := ARRAY[current_id];
BEGIN
  -- Si no tiene padre, no hay ciclo
  IF parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Verificar que el padre no sea descendiente del nodo actual
  WHILE parent_id IS NOT NULL LOOP
    -- Si encontramos el ID actual en el camino, hay un ciclo
    IF parent_id = current_id OR parent_id = ANY(visited) THEN
      RAISE EXCEPTION 'Ciclo jerárquico detectado: un departamento no puede ser ancestro de sí mismo';
    END IF;
    
    -- Agregar a visitados
    visited := array_append(visited, parent_id);
    
    -- Obtener el padre del padre
    SELECT d.parent_department_id INTO parent_id
    FROM departments d
    WHERE d.id = parent_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para prevenir ciclos
CREATE TRIGGER prevent_department_cycle
  BEFORE INSERT OR UPDATE ON departments
  FOR EACH ROW
  WHEN (NEW.parent_department_id IS NOT NULL)
  EXECUTE FUNCTION check_department_cycle();

-- ============================================
-- Trigger para updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_departments_timestamp
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_departments_updated_at();

-- ============================================
-- Habilitar RLS
-- ============================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Políticas RLS
-- ============================================

-- SELECT: Super admin ve todos, usuarios ven solo departamentos de sus empresas
DROP POLICY IF EXISTS "Super admins see all departments" ON departments;
CREATE POLICY "Super admins see all departments"
  ON departments FOR SELECT
  USING (is_super_admin());

DROP POLICY IF EXISTS "Users see departments of their companies" ON departments;
CREATE POLICY "Users see departments of their companies"
  ON departments FOR SELECT
  USING (user_belongs_to_company(auth.uid(), company_id));

-- INSERT: Super admin puede crear en cualquier empresa, usuarios solo en sus empresas
DROP POLICY IF EXISTS "Super admins insert all departments" ON departments;
CREATE POLICY "Super admins insert all departments"
  ON departments FOR INSERT
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Users insert departments in their companies" ON departments;
CREATE POLICY "Users insert departments in their companies"
  ON departments FOR INSERT
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- UPDATE: Super admin puede actualizar todos, usuarios solo de sus empresas
DROP POLICY IF EXISTS "Super admins update all departments" ON departments;
CREATE POLICY "Super admins update all departments"
  ON departments FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Users update departments of their companies" ON departments;
CREATE POLICY "Users update departments of their companies"
  ON departments FOR UPDATE
  USING (user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- DELETE: Super admin puede eliminar todos, usuarios solo de sus empresas
DROP POLICY IF EXISTS "Super admins delete all departments" ON departments;
CREATE POLICY "Super admins delete all departments"
  ON departments FOR DELETE
  USING (is_super_admin());

DROP POLICY IF EXISTS "Users delete departments of their companies" ON departments;
CREATE POLICY "Users delete departments of their companies"
  ON departments FOR DELETE
  USING (user_belongs_to_company(auth.uid(), company_id));

