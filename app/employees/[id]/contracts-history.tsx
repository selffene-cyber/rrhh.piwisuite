'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { FaFileContract, FaFileAlt } from 'react-icons/fa'

export default function ContractsHistory({ employeeId }: { employeeId: string }) {
  const [contracts, setContracts] = useState<any[]>([])
  const [annexes, setAnnexes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [employeeId])

  const loadData = async () => {
    try {
      // Cargar contratos
      const { data: contractsData } = await supabase
        .from('contracts')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })

      setContracts(contractsData || [])

      // Cargar anexos
      const { data: annexesData } = await supabase
        .from('contract_annexes')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })

      setAnnexes(annexesData || [])
    } catch (error: any) {
      console.error('Error al cargar contratos:', error)
    } finally {
      setLoading(false)
    }
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
          fontSize: '11px',
        }}
      >
        {badge.text}
      </span>
    )
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

  if (loading) {
    return <p>Cargando contratos...</p>
  }

  const allDocuments = [
    ...contracts.map((c) => ({ ...c, type: 'contract' })),
    ...annexes.map((a) => ({ ...a, type: 'annex' })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (allDocuments.length === 0) {
    return (
      <div>
        <p>No hay contratos ni anexos registrados para este trabajador.</p>
        <Link href={`/contracts/new?employee_id=${employeeId}`}>
          <button style={{ marginTop: '16px' }}>Crear Primer Contrato</button>
        </Link>
      </div>
    )
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Número</th>
          <th>Tipo Documento</th>
          <th>Fecha Inicio</th>
          <th>Fecha Término</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {allDocuments.map((doc: any) => (
          <tr key={doc.id}>
            <td>
              {doc.type === 'contract' ? (
                <FaFileContract style={{ color: '#3b82f6' }} />
              ) : (
                <FaFileAlt style={{ color: '#8b5cf6' }} />
              )}
            </td>
            <td>
              <code style={{ fontSize: '11px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                {doc.type === 'contract' ? doc.contract_number : doc.annex_number}
              </code>
            </td>
            <td>
              {doc.type === 'contract' ? (
                <>
                  <span style={{ color: '#3b82f6' }}>Contrato</span>
                  <br />
                  <small style={{ color: '#6b7280' }}>{getContractTypeText(doc.contract_type)}</small>
                </>
              ) : (
                <>
                  <span style={{ color: '#8b5cf6' }}>Anexo</span>
                  <br />
                  <small style={{ color: '#6b7280' }}>
                    {doc.annex_type === 'modificacion_sueldo' ? 'Modificación Sueldo' :
                     doc.annex_type === 'cambio_cargo' ? 'Cambio Cargo' :
                     doc.annex_type === 'cambio_jornada' ? 'Cambio Jornada' :
                     doc.annex_type === 'prorroga' ? 'Prórroga' :
                     doc.annex_type || 'Otro'}
                  </small>
                </>
              )}
            </td>
            <td>{formatDate(doc.start_date)}</td>
            <td>{doc.end_date ? formatDate(doc.end_date) : '-'}</td>
            <td>{getStatusBadge(doc.status)}</td>
            <td>
              <Link href={doc.type === 'contract' ? `/contracts/${doc.id}` : `/contracts/annex/${doc.id}`}>
                <button style={{ padding: '4px 8px', fontSize: '12px' }}>Ver</button>
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}



