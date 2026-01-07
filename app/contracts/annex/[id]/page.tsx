'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { FaEdit, FaFilePdf, FaCheck } from 'react-icons/fa'
import { generateAnnexText } from '@/lib/utils/annexText'

export default function AnnexDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [annex, setAnnex] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      const { data: annexData, error: annexError } = await supabase
        .from('contract_annexes')
        .select(`
          *,
          contracts (*),
          employees (*),
          companies (*)
        `)
        .eq('id', params.id)
        .single()

      if (annexError) throw annexError

      setAnnex(annexData)
      setContract(annexData.contracts)
      setEmployee(annexData.employees)
      setCompany(annexData.companies)
    } catch (error: any) {
      console.error('Error al cargar anexo:', error)
      alert('Error al cargar anexo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`¿Cambiar el estado del anexo a "${newStatus}"?`)) {
      return
    }

    try {
      // Guardar estado anterior para auditoría
      const previousStatus = annex?.status

      const updateData: any = { status: newStatus }
      
      if (newStatus === 'issued') {
        updateData.issued_at = new Date().toISOString()
      } else if (newStatus === 'signed') {
        updateData.signed_at = new Date().toISOString()
      }

      const { error, data: updatedAnnex } = await supabase
        .from('contract_annexes')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single()

      if (error) throw error

      // Registrar evento de auditoría
      const actionTypeMap: Record<string, string> = {
        issued: 'annex.issued',
        signed: 'annex.signed',
        active: 'annex.activated',
        cancelled: 'annex.cancelled',
      }

      const actionType = actionTypeMap[newStatus] || 'annex.updated'

      try {
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: annex?.company_id || company?.id,
            employeeId: annex?.employee_id,
            source: 'admin_dashboard',
            actionType,
            module: 'annexes',
            entityType: 'contract_annexes',
            entityId: params.id,
            status: 'success',
            beforeData: { status: previousStatus },
            afterData: { status: newStatus, ...updateData },
            metadata: {
              previous_status: previousStatus,
              new_status: newStatus,
            },
          }),
        }).catch((err) => console.error('Error al registrar auditoría:', err))
      } catch (auditError) {
        console.error('Error al registrar auditoría:', auditError)
      }

      // Si se activa o firma, actualizar contrato y empleado
      if ((newStatus === 'active' || newStatus === 'signed') && updatedAnnex) {
        try {
          // Obtener conceptValues desde metadata del anexo
          // Puede estar como concept_values (snake_case) o conceptValues (camelCase)
          const conceptValues = updatedAnnex.metadata?.concept_values || updatedAnnex.metadata?.conceptValues || {}
          
          console.log('[Annex Activation] Metadata del anexo:', updatedAnnex.metadata)
          console.log('[Annex Activation] ConceptValues encontrados:', conceptValues)
          
          // Solo actualizar si hay conceptValues
          if (Object.keys(conceptValues).length > 0) {
            // Importar el servicio dinámicamente
            const { createAnnexUpdateService } = await import('@/lib/services/annexUpdateService')
            const updateService = createAnnexUpdateService(supabase)
            
            // Actualizar contrato y empleado con los valores modificados
            await updateService.updateContractAndEmployeeFromAnnex(params.id as string, conceptValues)
            console.log('[Annex Activation] Contrato y empleado actualizados correctamente')
          } else {
            console.warn('[Annex Activation] No se encontraron conceptValues en metadata, no se actualizará el contrato')
          }
        } catch (updateError: any) {
          console.error('[Annex Activation] ❌ Error al actualizar contrato/empleado:', updateError)
          console.error('[Annex Activation] Detalles del error:', JSON.stringify(updateError, null, 2))
          // No bloquear el flujo si falla, pero mostrar el error claramente
          alert(`⚠️ El anexo se activó, pero hubo un error al actualizar el contrato: ${updateError?.message || 'Error desconocido'}`)
        }
      }

      alert('Estado actualizado correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al actualizar estado: ' + error.message)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { text: string; color: string } } = {
      draft: { text: 'Borrador', color: '#6b7280' },
      issued: { text: 'Emitido', color: '#f59e0b' },
      signed: { text: 'Firmado', color: '#10b981' },
      active: { text: 'Activo', color: '#3b82f6' },
      cancelled: { text: 'Cancelado', color: '#9ca3af' },
    }
    const badge = badges[status] || { text: status, color: '#6b7280' }
    return (
      <span
        className="badge"
        style={{
          background: badge.color + '20',
          color: badge.color,
          border: `1px solid ${badge.color}`,
        }}
      >
        {badge.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div>
        <h1>Detalle del Anexo</h1>
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!annex) {
    return (
      <div>
        <h1>Anexo no encontrado</h1>
        <div className="card">
          <p>El anexo solicitado no existe.</p>
          <Link href="/contracts">
            <button>Volver a Contratos</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Anexo {annex.annex_number}</h1>
          <p style={{ color: '#6b7280', margin: '4px 0' }}>
            {employee?.full_name} - {employee?.rut}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(annex.status === 'draft' || annex.status === 'issued') && (
            <Link href={`/contracts/annex/${params.id}/edit`}>
              <button>
                <FaEdit style={{ marginRight: '8px' }} />
                Editar
              </button>
            </Link>
          )}
          <Link href={`/contracts/annex/${params.id}/pdf`} target="_blank">
            <button>
              <FaFilePdf style={{ marginRight: '8px' }} />
              Ver PDF
            </button>
          </Link>
          <Link href="/contracts">
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      {/* Información General */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Información General</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Estado</label>
            <div>{getStatusBadge(annex.status)}</div>
          </div>
          <div className="form-group">
            <label>Tipo de Anexo</label>
            <p>
              {annex.annex_type === 'modificacion_sueldo' ? 'Modificación de Sueldo' :
               annex.annex_type === 'cambio_cargo' ? 'Cambio de Cargo' :
               annex.annex_type === 'cambio_jornada' ? 'Cambio de Jornada' :
               annex.annex_type === 'prorroga' ? 'Prórroga' :
               annex.annex_type || 'Otro'}
            </p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Contrato Base</label>
            <p>
              {contract ? (
                <Link href={`/contracts/${contract.id}`}>
                  {contract.contract_number}
                </Link>
              ) : 'N/A'}
            </p>
          </div>
          <div className="form-group">
            <label>Fecha de Inicio</label>
            <p>{formatDate(annex.start_date)}</p>
          </div>
        </div>
        {annex.end_date && (
          <div className="form-group">
            <label>Fecha de Término</label>
            <p>{formatDate(annex.end_date)}</p>
          </div>
        )}
        {annex.modifications_summary && (
          <div className="form-group">
            <label>Resumen de Modificaciones</label>
            <p style={{ whiteSpace: 'pre-wrap' }}>{annex.modifications_summary}</p>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Contenido del Anexo</h2>
        <div className="form-group">
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {contract && employee && company 
              ? generateAnnexText(annex, contract, employee, company)
              : annex.content || 'Cargando contenido...'}
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="card">
        <h2>Acciones</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {annex.status === 'draft' && (
            <button onClick={() => handleStatusChange('issued')}>
              <FaCheck style={{ marginRight: '8px' }} />
              Emitir Anexo
            </button>
          )}
          {annex.status === 'issued' && (
            <button onClick={() => handleStatusChange('signed')}>
              <FaCheck style={{ marginRight: '8px' }} />
              Marcar como Firmado
            </button>
          )}
          {annex.status === 'signed' && (
            <button onClick={() => handleStatusChange('active')}>
              <FaCheck style={{ marginRight: '8px' }} />
              Activar Anexo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}



