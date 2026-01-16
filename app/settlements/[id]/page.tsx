'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import SettlementPDF from '@/components/SettlementPDF'
import { formatDate } from '@/lib/utils/date'
import { formatCurrency } from '@/lib/services/payrollCalculator'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

export default function SettlementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [settlement, setSettlement] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPDF, setShowPDF] = useState(false)

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Cargar finiquito
      const settlementResponse = await fetch(`/api/settlements/${params.id}`)
      const settlementData = await settlementResponse.json()
      
      if (settlementResponse.ok) {
        setSettlement(settlementData.settlement)
        
        // Cargar empresa
        if (currentCompany) {
          setCompany(currentCompany)
        }
      } else {
        alert('Error al cargar finiquito: ' + settlementData.error)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!confirm('¿Está seguro de aprobar este finiquito?')) return

    try {
      const response = await fetch(`/api/settlements/${params.id}/approve`, {
        method: 'POST'
      })

      if (response.ok) {
        loadData()
      } else {
        const data = await response.json()
        alert('Error al aprobar: ' + data.error)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  const handleSign = async () => {
    if (!confirm('¿Marcar finiquito como firmado?')) return

    try {
      const response = await fetch(`/api/settlements/${params.id}/sign`, {
        method: 'POST'
      })

      if (response.ok) {
        loadData()
      } else {
        const data = await response.json()
        alert('Error: ' + data.error)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  const handlePay = async () => {
    if (!confirm('¿Marcar finiquito como pagado?')) return

    try {
      const response = await fetch(`/api/settlements/${params.id}/pay`, {
        method: 'POST'
      })

      if (response.ok) {
        loadData()
      } else {
        const data = await response.json()
        alert('Error: ' + data.error)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!settlement) {
    return (
      <div className="card">
        <p>Finiquito no encontrado</p>
      </div>
    )
  }

  const earnings = settlement.items?.filter((item: any) => item.type === 'earning') || []
  const deductions = settlement.items?.filter((item: any) => item.type === 'deduction') || []

  if (showPDF) {
    return (
      <div>
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setShowPDF(false)}
            style={{
              padding: '8px 16px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Volver al detalle
          </button>
        </div>
        <SettlementPDF
          settlement={settlement}
          employee={settlement.employee}
          company={company}
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1000px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Finiquito {settlement.settlement_number || ''}</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowPDF(true)}
              style={{
                padding: '10px 20px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Ver PDF
            </button>
            {settlement.status === 'draft' && (
              <button
                onClick={handleApprove}
                style={{
                  padding: '10px 20px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Aprobar
              </button>
            )}
            {settlement.status === 'approved' && (
              <button
                onClick={handleSign}
                style={{
                  padding: '10px 20px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Marcar como Firmado
              </button>
            )}
            {settlement.status === 'signed' && (
              <button
                onClick={handlePay}
                style={{
                  padding: '10px 20px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Marcar como Pagado
              </button>
            )}
          </div>
        </div>

        {/* Información General */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Información General</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Trabajador</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>{settlement.employee?.full_name || 'N/A'}</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>RUT: {settlement.employee?.rut || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Estado</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>
                {settlement.status === 'draft' && 'Borrador'}
                {settlement.status === 'under_review' && 'En Revisión'}
                {settlement.status === 'approved' && 'Aprobado'}
                {settlement.status === 'signed' && 'Firmado'}
                {settlement.status === 'paid' && 'Pagado'}
                {settlement.status === 'void' && 'Anulado'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Fecha Inicio Contrato</div>
              <div style={{ fontSize: '14px' }}>{formatDate(settlement.contract_start_date, 'dd/MM/yyyy')}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Fecha Término</div>
              <div style={{ fontSize: '14px' }}>{formatDate(settlement.termination_date, 'dd/MM/yyyy')}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Causal de Término</div>
              <div style={{ fontSize: '14px' }}>{settlement.cause?.article || ''} - {settlement.cause?.label || ''}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Años de Servicio</div>
              <div style={{ fontSize: '14px' }}>
                {settlement.service_years_effective} año(s) efectivo(s)
                {settlement.service_years_capped < settlement.service_years_effective && 
                  ` (${settlement.service_years_capped} para cálculo IAS)`
                }
              </div>
            </div>
          </div>
        </div>

        {/* Desglose de Cálculo */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Desglose de Cálculo</h2>
          
          {/* Haberes */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Haberes</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Concepto</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px', fontSize: '14px' }}>{item.description}</td>
                    <td style={{ padding: '10px', fontSize: '14px', textAlign: 'right', fontWeight: '500' }}>
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #000', backgroundColor: '#f3f4f6' }}>
                  <td style={{ padding: '10px', fontSize: '16px', fontWeight: '600' }}>Total Haberes</td>
                  <td style={{ padding: '10px', fontSize: '16px', fontWeight: '600', textAlign: 'right' }}>
                    {formatCurrency(settlement.total_earnings)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Descuentos */}
          {deductions.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Descuentos</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Concepto</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {deductions.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px', fontSize: '14px' }}>{item.description}</td>
                      <td style={{ padding: '10px', fontSize: '14px', textAlign: 'right', fontWeight: '500' }}>
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #000', backgroundColor: '#f3f4f6' }}>
                    <td style={{ padding: '10px', fontSize: '16px', fontWeight: '600' }}>Total Descuentos</td>
                    <td style={{ padding: '10px', fontSize: '16px', fontWeight: '600', textAlign: 'right' }}>
                      {formatCurrency(settlement.total_deductions)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Total */}
          <div style={{ 
            padding: '20px', 
            background: '#2563eb', 
            color: 'white', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>Líquido a Pagar</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
              {formatCurrency(settlement.net_to_pay)}
            </div>
          </div>
        </div>

        {/* Notas */}
        {settlement.notes && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Notas</h3>
            <p style={{ fontSize: '14px', color: '#374151' }}>{settlement.notes}</p>
          </div>
        )}

        {/* Botón volver */}
        <div>
          <button
            onClick={() => router.back()}
            style={{
              padding: '10px 20px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← Volver
          </button>
        </div>
      </div>
  )
}

