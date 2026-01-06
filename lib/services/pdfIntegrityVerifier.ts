import CryptoJS from 'crypto-js'

/**
 * Servicio para verificar la integridad de documentos PDF firmados
 */

/**
 * Calcula el hash SHA-256 de un PDF
 */
export function calculatePdfHash(pdfBytes: Uint8Array): string {
  const wordArray = CryptoJS.lib.WordArray.create(pdfBytes as any)
  const hash = CryptoJS.SHA256(wordArray)
  return hash.toString(CryptoJS.enc.Hex)
}

/**
 * Calcula el hash SHA-256 de un PDF desde un ArrayBuffer
 */
export function calculatePdfHashFromBuffer(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer)
  return calculatePdfHash(uint8Array)
}

/**
 * Calcula el hash SHA-256 de un PDF desde una URL
 */
export async function calculatePdfHashFromUrl(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Error al cargar PDF: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return calculatePdfHashFromBuffer(arrayBuffer)
}

/**
 * Verifica la integridad de un PDF comparando su hash con el almacenado
 */
export function verifyPdfIntegrity(
  pdfBytes: Uint8Array,
  storedHash: string
): boolean {
  const calculatedHash = calculatePdfHash(pdfBytes)
  return calculatedHash.toLowerCase() === storedHash.toLowerCase()
}

/**
 * Verifica la integridad de un PDF desde una URL
 */
export async function verifyPdfIntegrityFromUrl(
  pdfUrl: string,
  storedHash: string
): Promise<boolean> {
  const calculatedHash = await calculatePdfHashFromUrl(pdfUrl)
  return calculatedHash.toLowerCase() === storedHash.toLowerCase()
}

/**
 * Parsea los datos del QR code
 */
export interface QRCodeData {
  code: string
  url: string
  hash: string
}

export function parseQRCodeData(qrData: string): QRCodeData {
  try {
    return JSON.parse(qrData) as QRCodeData
  } catch (error) {
    throw new Error('Formato de QR code inválido')
  }
}

/**
 * Verifica un documento usando su código de verificación.
 * @param documentType Tipo de documento ('certificates', 'vacations', 'permissions').
 * @param documentId ID del documento.
 * @param verificationCode Código de verificación proporcionado.
 * @param supabase Cliente de Supabase.
 * @returns Los datos del documento si la verificación es exitosa, null en caso contrario.
 */
export async function verifyDocumentByCode(
  documentType: 'certificates' | 'vacations' | 'permissions',
  documentId: string,
  verificationCode: string,
  supabase: any
): Promise<any | null> {
  const { data, error } = await supabase
    .from(documentType)
    .select('*')
    .eq('id', documentId)
    .eq('verification_code', verificationCode)
    .single()

  if (error || !data) {
    console.error(`Error al verificar ${documentType} por código:`, error?.message)
    return null
  }

  return data
}

