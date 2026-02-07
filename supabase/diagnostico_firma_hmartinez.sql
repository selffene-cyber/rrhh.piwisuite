-- ============================================
-- DIAGNÓSTICO: Firmas digitales para hmartinez
-- ============================================

-- 1️⃣ Ver TODAS las firmas de la empresa
SELECT 
  '1️⃣ FIRMAS EN LA EMPRESA' as paso,
  ds.id,
  up.email as creada_por,
  up.full_name,
  ds.signer_name as nombre_firmante,
  ds.signer_position as cargo_firmante,
  ds.signer_rut as rut_firmante,
  ds.is_active,
  ds.created_at
FROM digital_signatures ds
JOIN user_profiles up ON up.id = ds.user_id
WHERE ds.company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11'
ORDER BY ds.created_at DESC;

-- 2️⃣ Ver firma que el CÓDIGO está buscando (user_id = hmartinez)
SELECT 
  '2️⃣ FIRMA QUE BUSCA EL CÓDIGO' as paso,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Existe firma para hmartinez'
    ELSE '❌ NO existe firma para hmartinez'
  END as resultado,
  COUNT(*) as cantidad
FROM digital_signatures
WHERE company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11'
  AND user_id = (SELECT id FROM user_profiles WHERE email = 'hmartinez@hlms.cl')
  AND is_active = true;

-- 3️⃣ Detalle de la firma (si existe)
SELECT 
  '3️⃣ DETALLE DE FIRMA DE HMARTINEZ' as paso,
  id,
  signer_name,
  signer_position,
  signer_rut,
  is_active,
  created_at,
  signature_image_url
FROM digital_signatures
WHERE company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11'
  AND user_id = (SELECT id FROM user_profiles WHERE email = 'hmartinez@hlms.cl');

-- 4️⃣ Diagnóstico completo
SELECT 
  '4️⃣ DIAGNÓSTICO' as paso,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM digital_signatures
      WHERE company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11'
      AND user_id = (SELECT id FROM user_profiles WHERE email = 'hmartinez@hlms.cl')
      AND is_active = true
    ) THEN '✅ hmartinez PUEDE firmar documentos'
    WHEN EXISTS (
      SELECT 1 FROM digital_signatures
      WHERE company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11'
      AND is_active = true
    ) THEN '⚠️  Hay firma en la empresa pero NO pertenece a hmartinez'
    ELSE '❌ NO hay firmas activas en la empresa'
  END as resultado;
