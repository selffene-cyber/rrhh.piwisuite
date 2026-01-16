import { PDFDocument, PDFPage, rgb } from 'pdf-lib'
import QRCode from 'qrcode'
import CryptoJS from 'crypto-js'
import { createClient } from '@supabase/supabase-js'

/**
 * Servicio genérico para firmar documentos PDF
 * Solo para certificados, vacaciones y permisos
 */

interface SignatureData {
  signatureImageUrl: string
  signerName: string
  signerPosition: string
  signerRut: string
}

interface SignDocumentOptions {
  pdfBytes: Uint8Array
  signatureData: SignatureData
  verificationCode: string
  verificationUrl: string
  companyId: string
  documentType: 'certificate' | 'vacation' | 'permission'
  documentId: string
}

interface SignDocumentResult {
  signedPdfBytes: Uint8Array
  pdfHash: string
  qrCodeDataUrl: string
  qrCodeData: {
    code: string
    url: string
    hash: string
  }
}

/**
 * Genera un código de verificación único
 */
export function generateVerificationCode(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${random}`.toUpperCase()
}

/**
 * Calcula el hash SHA-256 de un PDF
 */
export function calculatePdfHash(pdfBytes: Uint8Array): string {
  const wordArray = CryptoJS.lib.WordArray.create(pdfBytes as any)
  const hash = CryptoJS.SHA256(wordArray)
  return hash.toString(CryptoJS.enc.Hex)
}

/**
 * Genera un QR code con los datos de verificación
 */
export async function generateQRCode(data: {
  code: string
  url: string
  hash: string
}): Promise<string> {
  const qrData = JSON.stringify(data)
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 200,
    margin: 2,
  })
  return qrCodeDataUrl
}

/**
 * Carga una imagen desde una URL
 */
async function loadImageFromUrl(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Error al cargar imagen de firma: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Inserta la firma digital y el QR code en un PDF
 */
export async function signDocument(
  options: SignDocumentOptions
): Promise<SignDocumentResult> {
  const {
    pdfBytes,
    signatureData,
    verificationCode,
    verificationUrl,
    companyId,
    documentType,
    documentId,
  } = options

  // Cargar el PDF
  const pdfDoc = await PDFDocument.load(pdfBytes)

  // Cargar la imagen de la firma
  const signatureImageBytes = await loadImageFromUrl(signatureData.signatureImageUrl)
  const signatureImage = await pdfDoc.embedPng(signatureImageBytes)

  // Obtener la última página del PDF
  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  const { width, height } = lastPage.getSize()

  // Calcular hash del PDF original (antes de agregar la firma)
  const originalHash = calculatePdfHash(pdfBytes)

  // Obtener la fuente Helvetica para calcular el ancho del texto
  const helveticaFont = await pdfDoc.embedFont('Helvetica')
  
  // ============================================
  // 1. FIRMA DIGITAL (más arriba, donde estaba "FIRMA EMPLEADOR")
  // ============================================
  const signatureWidth = 120
  const signatureHeight = 60
  const signatureCenterX = width / 2
  const signatureX = signatureCenterX - (signatureWidth / 2) // Centrar la firma
  const signatureY = 200 // Más arriba que antes (donde estaba "FIRMA EMPLEADOR")

  lastPage.drawImage(signatureImage, {
    x: signatureX,
    y: signatureY,
    width: signatureWidth,
    height: signatureHeight,
  })

  // Agregar información del firmante debajo de la firma (centrado)
  const fontSize = 8
  const textYStart = signatureY - 20
  const textCenterX = width / 2
  
  const signerNameText = `Firmado por: ${signatureData.signerName}`
  const signerNameWidth = helveticaFont.widthOfTextAtSize(signerNameText, fontSize)
  lastPage.drawText(signerNameText, {
    x: textCenterX - (signerNameWidth / 2),
    y: textYStart,
    size: fontSize,
    color: rgb(0, 0, 0),
    font: helveticaFont,
  })
  
  const positionText = signatureData.signerPosition
  const positionWidth = helveticaFont.widthOfTextAtSize(positionText, fontSize)
  lastPage.drawText(positionText, {
    x: textCenterX - (positionWidth / 2),
    y: textYStart - 12,
    size: fontSize,
    color: rgb(0, 0, 0),
    font: helveticaFont,
  })
  
  const rutText = `RUT: ${signatureData.signerRut}`
  const rutWidth = helveticaFont.widthOfTextAtSize(rutText, fontSize)
  lastPage.drawText(rutText, {
    x: textCenterX - (rutWidth / 2),
    y: textYStart - 24,
    size: fontSize,
    color: rgb(0, 0, 0),
    font: helveticaFont,
  })

  // ============================================
  // 2. QR CODE (más abajo, justo arriba del footer)
  // ============================================
  const qrCodeData = {
    code: verificationCode,
    url: verificationUrl,
    hash: originalHash,
  }
  const qrCodeDataUrl = await generateQRCode(qrCodeData)

  // Cargar y agregar QR code
  const qrCodeImageBytes = Uint8Array.from(
    Buffer.from(qrCodeDataUrl.split(',')[1], 'base64')
  )
  const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes)

  const qrSize = 70
  const qrX = 50 // Esquina inferior izquierda
  const qrY = 80 // Justo arriba del footer (más abajo que antes)

  lastPage.drawImage(qrCodeImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  })

  // ============================================
  // 3. FOOTER (ID, Código y URL en dos filas)
  // ============================================
  const footerY = 50 // Muy abajo, en el footer
  const footerX = qrX
  const footerFontSize = 7
  
  // Primera fila: "ID Documento: {id}" y "Código Verificación: {código}"
  const idText = `ID Documento: ${documentId}`
  lastPage.drawText(idText, {
    x: footerX,
    y: footerY,
    size: footerFontSize,
    color: rgb(0, 0, 0),
    font: helveticaFont,
  })
  
  const codeText = `Código Verificación: ${verificationCode}`
  // Colocar el código a la derecha del ID
  const codeX = width / 2 + 20
  lastPage.drawText(codeText, {
    x: codeX,
    y: footerY,
    size: footerFontSize,
    color: rgb(0, 0, 0),
    font: helveticaFont,
  })
  
  // Segunda fila: URL de verificación
  const urlText = verificationUrl.replace('https://', '').replace('http://', '')
  lastPage.drawText(urlText, {
    x: footerX,
    y: footerY - 12,
    size: 6,
    color: rgb(0, 0, 0),
    font: helveticaFont,
  })

  // Generar PDF firmado
  const signedPdfBytes = await pdfDoc.save()

  // Calcular hash del PDF firmado
  const pdfHash = calculatePdfHash(signedPdfBytes)

  return {
    signedPdfBytes,
    pdfHash,
    qrCodeDataUrl,
    qrCodeData,
  }
}

/**
 * Guarda el PDF firmado en Supabase Storage
 */
export async function saveSignedPdfToStorage(
  pdfBytes: Uint8Array,
  companyId: string,
  documentType: 'certificate' | 'vacation' | 'permission',
  documentId: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Crear path en Storage: signed-documents/{company_id}/{document_type}/{document_id}.pdf
  const filePath = `signed-documents/${companyId}/${documentType}/${documentId}.pdf`

  // Subir PDF a Storage
  const { data, error } = await supabase.storage
    .from('signed-documents')
    .upload(filePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) {
    throw new Error(`Error al guardar PDF firmado: ${error.message}`)
  }

  // Obtener URL pública del PDF
  const {
    data: { publicUrl },
  } = supabase.storage.from('signed-documents').getPublicUrl(filePath)

  return publicUrl
}

/**
 * Genera la URL de verificación pública
 */
export function generateVerificationUrl(
  baseUrl: string,
  verificationCode: string,
  documentType: 'certificate' | 'vacation' | 'permission',
  documentId: string
): string {
  // Mapear tipos de documentos a los nombres de tabla
  const typeMap: Record<string, string> = {
    certificate: 'certificates',
    vacation: 'vacations',
    permission: 'permissions',
  }
  const tableType = typeMap[documentType] || documentType
  return `${baseUrl}/verify?code=${verificationCode}&type=${tableType}&id=${documentId}`
}


