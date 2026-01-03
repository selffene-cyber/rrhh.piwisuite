'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { FaEdit, FaFilePdf, FaCheck, FaTimes } from 'react-icons/fa'
import { terminateContractAndCreateSettlement, activateEmployeeOnContractActivation } from '@/lib/services/contractService'

export default function ContractDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contract, setContract] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [annexes, setAnnexes] = useState<any[]>([])
  const [showTerminateModal, setShowTerminateModal] = useState(false)
  const [terminateForm, setTerminateForm] = useState({
    termination_date: new Date().toISOString().split('T')[0],
    cause_code: '',
    notice_given: false,
    notice_days: 0,
    notes: ''
  })
  const [causes, setCauses] = useState<any[]>([])
  const [terminating, setTerminating] = useState(false)

  useEffect(() => {
    loadData()
    loadCauses()
  }, [params.id])

  const loadCauses = async () => {
    try {
      const response = await fetch('/api/settlements/causes')
      const data = await response.json()
      if (response.ok) {
        setCauses(data.causes || [])
      }
    } catch (error) {
      console.error('Error al cargar causales:', error)
    }
  }

  const loadData = async () => {
    try {
      // Cargar contrato
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select(`
          *,
          employees (*),
          companies (*)
        `)
        .eq('id', params.id)
        .single()

      if (contractError) throw contractError

      setContract(contractData)
      setEmployee(contractData.employees)
      setCompany(contractData.companies)

      // Cargar anexos del contrato
      const { data: annexesData } = await supabase
        .from('contract_annexes')
        .select('*')
        .eq('contract_id', params.id)
        .order('created_at', { ascending: false })

      setAnnexes(annexesData || [])
    } catch (error: any) {
      console.error('Error al cargar contrato:', error)
      alert('Error al cargar contrato: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'terminated') {
      // Mostrar modal para terminar contrato
      setShowTerminateModal(true)
      return
    }

    if (!confirm(`¿Cambiar el estado del contrato a "${newStatus}"?`)) {
      return
    }

    try {
      const updateData: any = { status: newStatus }
      
      if (newStatus === 'issued') {
        updateData.issued_at = new Date().toISOString()
      } else if (newStatus === 'signed') {
        updateData.signed_at = new Date().toISOString()
      } else if (newStatus === 'active') {
        // Cuando se activa un contrato, cambiar estado del trabajador a "activo"
        if (contract && contract.employee_id) {
          await activateEmployeeOnContractActivation(contract.employee_id, supabase)
        }
      }

      const { error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', params.id)

      if (error) throw error

      alert('Estado actualizado correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al actualizar estado: ' + error.message)
    }
  }

  const handleTerminateContract = async () => {
    if (!terminateForm.cause_code || !terminateForm.termination_date) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    try {
      setTerminating(true)

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const result = await terminateContractAndCreateSettlement(
        params.id,
        terminateForm.termination_date,
        terminateForm.cause_code,
        terminateForm.notice_given,
        user.id,
        supabase,
        terminateForm.notice_days || undefined,
        terminateForm.notes || undefined
      )

      alert(`Contrato terminado correctamente. Se ha creado un pre-finiquito (${result.settlement.settlement_number}).`)
      setShowTerminateModal(false)
      router.push(`/settlements/${result.settlement.id}`)
    } catch (error: any) {
      alert('Error al terminar contrato: ' + error.message)
    } finally {
      setTerminating(false)
    }
  }

  const getContractTypeText = (type: string) => {
    const types: { [key: string]: string } = {
      indefinido: 'Indefinido',
      plazo_fijo: 'Plazo Fijo',
      obra_faena: 'Obra o Faena',
      part_time: 'Part-Time',
    }
    return types[type] || type
  }

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { text: string; color: string } } = {
      draft: { text: 'Borrador', color: '#6b7280' },
      issued: { text: 'Emitido', color: '#f59e0b' },
      signed: { text: 'Firmado', color: '#10b981' },
      active: { text: 'Activo', color: '#3b82f6' },
      terminated: { text: 'Terminado', color: '#ef4444' },
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
        <h1>Detalle del Contrato</h1>
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div>
        <h1>Contrato no encontrado</h1>
        <div className="card">
          <p>El contrato solicitado no existe.</p>
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
          <h1>Contrato {contract.contract_number}</h1>
          <p style={{ color: '#6b7280', margin: '4px 0' }}>
            {employee?.full_name} - {employee?.rut}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(contract.status === 'draft' || contract.status === 'issued') && (
            <Link href={`/contracts/${params.id}/edit`}>
              <button>
                <FaEdit style={{ marginRight: '8px' }} />
                Editar
              </button>
            </Link>
          )}
          <Link href={`/contracts/${params.id}/pdf`} target="_blank">
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
            <div>{getStatusBadge(contract.status)}</div>
          </div>
          <div className="form-group">
            <label>Tipo de Contrato</label>
            <p>{getContractTypeText(contract.contract_type)}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Fecha de Inicio</label>
            <p>{formatDate(contract.start_date)}</p>
          </div>
          <div className="form-group">
            <label>Fecha de Término</label>
            <p>{contract.end_date ? formatDate(contract.end_date) : 'Indefinido'}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Cargo</label>
            <p>{contract.position}</p>
          </div>
          <div className="form-group">
            <label>Sueldo Base</label>
            <p>${contract.base_salary.toLocaleString('es-CL')}</p>
          </div>
        </div>
      </div>

      {/* Detalles del Contrato */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Detalles del Contrato</h2>
        {contract.position_description && (
          <div className="form-group">
            <label>Descripción de Funciones</label>
            <p style={{ whiteSpace: 'pre-wrap' }}>{contract.position_description}</p>
          </div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label>Horario de Trabajo</label>
            <p>{contract.work_schedule}</p>
          </div>
          <div className="form-group">
            <label>Lugar de Trabajo</label>
            <p>{contract.work_location}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Forma de Pago</label>
            <p>{contract.payment_method === 'transferencia' ? 'Transferencia Bancaria' : 
                contract.payment_method === 'efectivo' ? 'Efectivo' : 'Cheque'}</p>
          </div>
          <div className="form-group">
            <label>Periodicidad de Pago</label>
            <p>{contract.payment_periodicity === 'mensual' ? 'Mensual' :
                contract.payment_periodicity === 'quincenal' ? 'Quincenal' : 'Semanal'}</p>
          </div>
        </div>
        {contract.payment_method === 'transferencia' && (contract.bank_name || contract.account_number) && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Datos Bancarios</h3>
            <div className="form-row">
              {contract.bank_name && (
                <div className="form-group">
                  <label>Banco</label>
                  <p>{contract.bank_name}</p>
                </div>
              )}
              {contract.account_type && (
                <div className="form-group">
                  <label>Tipo de Cuenta</label>
                  <p>
                    {contract.account_type === 'corriente' ? 'Cuenta Corriente' :
                     contract.account_type === 'ahorro' ? 'Cuenta de Ahorro' :
                     contract.account_type === 'vista' ? 'Cuenta Vista' :
                     contract.account_type}
                  </p>
                </div>
              )}
            </div>
            {contract.account_number && (
              <div className="form-group">
                <label>Número de Cuenta</label>
                <p>{contract.account_number}</p>
              </div>
            )}
          </div>
        )}
        {contract.gratuity && (
          <div className="form-group">
            <label>Gratificación</label>
            <p>
              {contract.gratuity_amount 
                ? `$${contract.gratuity_amount.toLocaleString('es-CL')} (fijo)`
                : 'Gratificación Legal'}
            </p>
          </div>
        )}
        {contract.other_allowances && (
          <div className="form-group">
            <label>Otros Bonos o Asignaciones</label>
            <p style={{ whiteSpace: 'pre-wrap' }}>{contract.other_allowances}</p>
          </div>
        )}
      </div>

      {/* Cláusulas */}
      {(contract.confidentiality_clause || 
        contract.authorized_deductions || 
        contract.advances_clause || 
        contract.internal_regulations || 
        contract.additional_clauses) && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Cláusulas</h2>
          {contract.confidentiality_clause && (
            <div className="form-group">
              <label>Confidencialidad</label>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{contract.confidentiality_clause}</p>
            </div>
          )}
          {contract.authorized_deductions && (
            <div className="form-group">
              <label>Descuentos Autorizados</label>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{contract.authorized_deductions}</p>
            </div>
          )}
          {contract.advances_clause && (
            <div className="form-group">
              <label>Anticipos</label>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{contract.advances_clause}</p>
            </div>
          )}
          {contract.internal_regulations && (
            <div className="form-group">
              <label>Reglamento Interno</label>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{contract.internal_regulations}</p>
            </div>
          )}
          {contract.additional_clauses && (
            <div className="form-group">
              <label>Cláusulas Adicionales</label>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{contract.additional_clauses}</p>
            </div>
          )}
        </div>
      )}

      {/* Anexos */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Anexos</h2>
          <Link href={`/contracts/annex/new?contract_id=${params.id}`}>
            <button>Nuevo Anexo</button>
          </Link>
        </div>
        {annexes.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Tipo</th>
                <th>Fecha Inicio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {annexes.map((annex) => (
                <tr key={annex.id}>
                  <td>{annex.annex_number}</td>
                  <td>
                    {annex.annex_type === 'modificacion_sueldo' ? 'Modificación Sueldo' :
                     annex.annex_type === 'cambio_cargo' ? 'Cambio Cargo' :
                     annex.annex_type === 'cambio_jornada' ? 'Cambio Jornada' :
                     annex.annex_type === 'prorroga' ? 'Prórroga' :
                     annex.annex_type || 'Otro'}
                  </td>
                  <td>{formatDate(annex.start_date)}</td>
                  <td>{getStatusBadge(annex.status)}</td>
                  <td>
                    <Link href={`/contracts/annex/${annex.id}`}>
                      <button style={{ padding: '4px 8px', fontSize: '12px' }}>Ver</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay anexos registrados para este contrato.</p>
        )}
      </div>

      {/* Acciones */}
      <div className="card">
        <h2>Acciones</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {contract.status === 'draft' && (
            <button onClick={() => handleStatusChange('issued')}>
              <FaCheck style={{ marginRight: '8px' }} />
              Emitir Contrato
            </button>
          )}
          {contract.status === 'issued' && (
            <button onClick={() => handleStatusChange('signed')}>
              <FaCheck style={{ marginRight: '8px' }} />
              Marcar como Firmado
            </button>
          )}
          {contract.status === 'signed' && (
            <button onClick={() => handleStatusChange('active')}>
              <FaCheck style={{ marginRight: '8px' }} />
              Activar Contrato
            </button>
          )}
          {contract.status === 'active' && (
            <button 
              onClick={() => handleStatusChange('terminated')}
              style={{ background: '#ef4444', color: 'white' }}
            >
              <FaTimes style={{ marginRight: '8px' }} />
              Terminar Contrato
            </button>
          )}
        </div>
      </div>

      {/* Modal para terminar contrato */}
      {showTerminateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '20px' }}>Terminar Contrato</h2>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>
              Al terminar este contrato, se creará automáticamente un pre-finiquito y el estado del trabajador cambiará a "Despido".
            </p>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Fecha de Término *</label>
              <input
                type="date"
                value={terminateForm.termination_date}
                onChange={(e) => setTerminateForm({ ...terminateForm, termination_date: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Causal de Término *</label>
              <select
                value={terminateForm.cause_code}
                onChange={(e) => setTerminateForm({ ...terminateForm, cause_code: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
              >
                <option value="">Seleccione una causal</option>
                {causes.map((cause) => (
                  <option key={cause.code} value={cause.code}>
                    {cause.article} - {cause.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={terminateForm.notice_given}
                  onChange={(e) => setTerminateForm({ ...terminateForm, notice_given: e.target.checked })}
                />
                Se dio aviso previo
              </label>
            </div>

            {terminateForm.notice_given && (
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Días de Aviso Previo</label>
                <input
                  type="number"
                  min="0"
                  value={terminateForm.notice_days}
                  onChange={(e) => setTerminateForm({ ...terminateForm, notice_days: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Notas</label>
              <textarea
                value={terminateForm.notes}
                onChange={(e) => setTerminateForm({ ...terminateForm, notes: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                placeholder="Notas adicionales sobre el término del contrato..."
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowTerminateModal(false)}
                className="secondary"
                disabled={terminating}
              >
                Cancelar
              </button>
              <button
                onClick={handleTerminateContract}
                style={{ background: '#ef4444', color: 'white' }}
                disabled={terminating}
              >
                {terminating ? 'Procesando...' : 'Terminar Contrato'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

