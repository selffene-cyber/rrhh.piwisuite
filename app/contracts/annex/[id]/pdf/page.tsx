import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AnnexPDFClient from './pdf-client'

export const revalidate = 0

export default async function AnnexPDFPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()
  
  // DEBUG: Log de entrada
  console.log('[ANEXO PDF PAGE] Iniciando carga para anexo ID:', params.id)
  
  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('[ANEXO PDF PAGE] Usuario no autenticado')
    notFound()
  }
  
  console.log('[ANEXO PDF PAGE] Usuario autenticado:', user.id)

  // Verificar si es trabajador para validar acceso
  const { data: currentEmployee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  
  // SOLO obtener el id y employee_id del anexo (consulta mínima)
  // Nota: pdf_url puede no existir si la migración 072 no se ha aplicado aún
  const { data: annex, error } = await supabase
    .from('contract_annexes')
    .select('id, employee_id')
    .eq('id', params.id)
    .maybeSingle()
    
  // Intentar obtener pdf_url por separado si existe (sin fallar si no existe)
  let pdfUrl: string | null = null
  try {
    const { data: annexWithPdf } = await supabase
      .from('contract_annexes')
      .select('pdf_url')
      .eq('id', params.id)
      .single()
    pdfUrl = annexWithPdf?.pdf_url || null
  } catch {
    // Campo pdf_url no existe aún, continuar sin él
    pdfUrl = null
  }

  if (error) {
    console.error('[ANEXO PDF PAGE] Error al obtener anexo:', error)
    notFound()
  }
  
  if (!annex) {
    console.log('[ANEXO PDF PAGE] Anexo no encontrado para ID:', params.id)
    notFound()
  }
  
  console.log('[ANEXO PDF PAGE] Anexo encontrado:', annex.id, 'Employee ID:', annex.employee_id)

  // Si es trabajador, verificar que el anexo sea suyo
  if (currentEmployee) {
    console.log('[ANEXO PDF PAGE] Es trabajador, verificando permisos. Anexo employee_id:', annex.employee_id, 'Current employee_id:', currentEmployee.id)
    if (annex.employee_id !== currentEmployee.id) {
      console.log('[ANEXO PDF PAGE] Acceso denegado: el anexo no pertenece al trabajador')
      notFound()
    }
  } else {
    console.log('[ANEXO PDF PAGE] No es trabajador, permitiendo acceso (admin)')
  }

  // DEBUG: Verificar si tiene pdf_url
  console.log('[PDF PAGE] Anexo ID:', params.id, 'Tiene pdf_url:', !!pdfUrl, 'URL:', pdfUrl)

  // Si existe pdf_url, mostrar directamente el PDF del bucket (como los certificados)
  if (pdfUrl) {
    console.log('[PDF PAGE] Mostrando PDF guardado del bucket:', pdfUrl)
    return (
      <div style={{ 
        margin: 0, 
        padding: 0, 
        width: '100vw', 
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <iframe 
          src={pdfUrl} 
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none'
          }}
          title="Anexo de Contrato"
        />
      </div>
    )
  }

  // Si NO existe pdf_url, cargar TODOS los datos y usar AnnexPDF component
  console.log('[PDF PAGE] No tiene pdf_url, generando PDF dinámicamente')
  
  // Cargar anexo completo (sin relaciones primero)
  const { data: fullAnnex, error: fullError } = await supabase
    .from('contract_annexes')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fullError) {
    console.error('[ANEXO PDF PAGE] Error al cargar anexo completo:', fullError)
    console.error('[ANEXO PDF PAGE] Error details:', JSON.stringify(fullError, null, 2))
    notFound()
  }
  
  if (!fullAnnex) {
    console.log('[ANEXO PDF PAGE] Anexo completo no encontrado')
    notFound()
  }

  console.log('[ANEXO PDF PAGE] Anexo cargado, contract_id:', fullAnnex.contract_id, 'employee_id:', fullAnnex.employee_id, 'company_id:', fullAnnex.company_id)

  // Cargar relaciones por separado para evitar problemas con RLS
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', fullAnnex.contract_id)
    .single()

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', fullAnnex.employee_id)
    .single()

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', fullAnnex.company_id)
    .single()

  console.log('[ANEXO PDF PAGE] Relaciones cargadas:', {
    hasContract: !!contract,
    contractError: contractError?.message,
    hasEmployee: !!employee,
    employeeError: employeeError?.message,
    hasCompany: !!company,
    companyError: companyError?.message
  })

  if (contractError || employeeError || companyError) {
    console.error('[ANEXO PDF PAGE] Errores al cargar relaciones:', {
      contractError: contractError?.message,
      employeeError: employeeError?.message,
      companyError: companyError?.message
    })
  }

  if (!contract || !employee || !company) {
    console.error('[ANEXO PDF PAGE] Faltan relaciones:', {
      contract: contract ? 'OK' : 'FALTANTE',
      employee: employee ? 'OK' : 'FALTANTE',
      company: company ? 'OK' : 'FALTANTE'
    })
    notFound()
  }

  // DEBUG: Verificar datos cargados
  console.log('[PDF PAGE] Datos cargados:', {
    annex_id: fullAnnex.id,
    contract_id: contract.id,
    employee_id: employee.id,
    company_id: company.id
  })

  // Usar AnnexPDFClient (wrapper client-side)
  return (
    <AnnexPDFClient 
      annex={fullAnnex}
      contract={contract}
      employee={employee}
      company={company}
    />
  )
}
