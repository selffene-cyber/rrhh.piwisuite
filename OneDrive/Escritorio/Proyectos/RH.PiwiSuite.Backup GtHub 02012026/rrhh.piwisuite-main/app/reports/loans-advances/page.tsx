'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { ReportFilters, LoanAdvanceReportRow, LoanAdvanceSummary } from '@/types'
import { getLoansAdvancesReport } from '@/lib/services/reports/loansAdvancesReports'
import ReportFiltersComponent from '@/components/reports/ReportFilters'
import { FaFilePdf, FaFileExcel, FaArrowLeft } from 'react-icons/fa'
import { formatCurrency } from '@/lib/services/payrollCalculator'

export default function LoansAdvancesReportPage() {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<LoanAdvanceReportRow[]>([])
  const [summary, setSummary] = useState<LoanAdvanceSummary | null>(null)
  const [filters, setFilters] = useState<ReportFilters>({
    companyId: companyId || undefined,
  })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (companyId) {
      setFilters((prev) => ({ ...prev, companyId }))
      loadReport()
    }
  }, [companyId])

  useEffect(() => {
    if (filters.companyId) {
      loadReport()
    }
  }, [filters])

  const loadReport = async () => {
    if (!filters.companyId) return

    setLoading(true)
    try {
      const result = await getLoansAdvancesReport(filters, supabase)
      setRows(result.rows)
      setSummary(result.summary)
    } catch (error: any) {
      console.error('Error al cargar reporte:', error)
      alert('Error al cargar el reporte: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/reports/loans-advances/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      })

      if (!response.ok) throw new Error('Error al generar PDF')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Reporte_Prestamos_Anticipos_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error: any) {
      alert('Error al exportar PDF: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/reports/loans-advances/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      })

      if (!response.ok) throw new Error('Error al generar CSV')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Reporte_Prestamos_Anticipos_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error: any) {
      alert('Error al exportar CSV: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  if (loading && rows.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando reporte...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <button className="secondary" onClick={() => router.push('/reports')} style={{ marginBottom: '8px' }}>
            <FaArrowLeft style={{ marginRight: '8px' }} /> Volver a Reportes
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0 }}>
            Reporte de Préstamos y Anticipos
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExportPDF} disabled={exporting || rows.length === 0}>
            <FaFilePdf style={{ marginRight: '8px' }} /> {exporting ? 'Generando...' : 'Exportar PDF'}
          </button>
          <button onClick={handleExportCSV} disabled={exporting || rows.length === 0}>
            <FaFileExcel style={{ marginRight: '8px' }} /> {exporting ? 'Generando...' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        showCostCenter={true}
        showPeriod={false}
        showEmployeeStatus={false}
        showContractType={false}
        showAFP={false}
        showHealthSystem={false}
        showDateRange={true}
      />

      {summary && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Resumen</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Préstamos</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{summary.totalLoans}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Saldo Préstamos</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>{formatCurrency(summary.totalLoanBalance)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Anticipos</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>{formatCurrency(summary.totalAdvances)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Deuda Total</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#ef4444' }}>
                {formatCurrency(summary.totalDebt)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Detalle de Préstamos y Anticipos</h2>
        {rows.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '32px' }}>
            No hay datos para mostrar con los filtros seleccionados
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>RUT</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>Nombre</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>Centro de Costo</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Saldo Préstamo</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Anticipos</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Deuda Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{row.rut}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{row.full_name}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {row.cost_center_code ? `${row.cost_center_code} - ${row.cost_center_name}` : '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right' }}>
                      {row.loan_balance > 0 ? formatCurrency(row.loan_balance) : '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right' }}>
                      {row.advance_amount > 0 ? formatCurrency(row.advance_amount) : '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right', fontWeight: '600', color: '#ef4444' }}>
                      {formatCurrency(row.total_debt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

