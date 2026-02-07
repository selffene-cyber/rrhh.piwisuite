-- ============================================
-- COPIAR FIRMA DIGITAL PARA hmartinez
-- ============================================

-- 1️⃣ Copiar la firma existente y asignarla a hmartinez
INSERT INTO digital_signatures (
  id,
  company_id,
  user_id,
  signature_image_url,
  signer_name,
  signer_position,
  signer_rut,
  is_active,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  company_id,
  (SELECT id FROM user_profiles WHERE email = 'hmartinez@hlms.cl'), -- Asignar a hmartinez
  signature_image_url,
  signer_name,
  signer_position,
  signer_rut,
  true, -- Activar
  NOW(),
  NOW()
FROM digital_signatures
WHERE company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11'
  AND is_active = true
LIMIT 1;

-- 2️⃣ Verificación
SELECT 
  '✅ FIRMAS DISPONIBLES PARA HMARTINEZ' as resultado,
  ds.id,
  up.email as usuario,
  ds.signer_name,
  ds.signer_position,
  ds.is_active,
  ds.created_at
FROM digital_signatures ds
JOIN user_profiles up ON up.id = ds.user_id
WHERE ds.company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11'
  AND (ds.user_id = (SELECT id FROM user_profiles WHERE email = 'hmartinez@hlms.cl') OR up.email LIKE '%jeans%')
ORDER BY ds.created_at DESC;

DO $$
BEGIN
  RAISE NOTICE '✅ Firma copiada para hmartinez@hlms.cl';
  RAISE NOTICE '✅ Ahora puede firmar documentos';
END $$;
