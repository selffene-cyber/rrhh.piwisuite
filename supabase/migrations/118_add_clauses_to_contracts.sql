-- Agregar columna clauses (JSONB) a la tabla contracts
-- Almacena las cláusulas editables del contrato con sus labels y textos
-- Formato: [{num: 1, title: "PRIMERO", label: "Cargo y Funciones", text: "..."}, ...]

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS clauses JSONB DEFAULT NULL;

COMMENT ON COLUMN contracts.clauses IS 'Cláusulas editables del contrato. Array de objetos {num, title, label, text}. Si es NULL, se usa generación automática desde contractText.ts para compatibilidad con contratos existentes.';