'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { ReportFilters, SalaryReportRow, SalarySummary } from '@/types'
import { getSalaryReport } from '@/lib/services/reports/salaryReports'
import ReportFiltersComponent from '@/components/reports/ReportFilters'
import { FaFilePdf, FaFileExcel, FaArrowLeft } from 'react-icons/fa'
import { formatCurrency } from '@/lib/services/payrollCalculator'

export default function SalaryReportPage() {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<SalaryReportRow[]>([])
  const [summary, setSummary] = useState<SalarySummary | null>(null)
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
      const result = await getSalaryReport(filters, supabase)
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
      const response = await fetch('/api/reports/salary/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      })

      if (!response.ok) throw new Error('Error al generar PDF')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Reporte_Sueldos_${new Date().toISOString().split('T')[0]}.pdf`
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
      const response = await fetch('/api/reports/salary/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      })

      if (!response.ok) throw new Error('Error al generar CSV')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Reporte_Sueldos_${new Date().toISOString().split('T')[0]}.csv`
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
            Reporte de Trabajadores con Información de Sueldo
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
        showEmployeeStatus={true}
        showContractType={false}
        showAFP={false}
        showHealthSystem={false}
        showDateRange={false}
      />

      {summary && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Resumen</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Sueldo Base</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>{formatCurrency(summary.totalBaseSalary)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Movilización</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>{formatCurrency(summary.totalTransportation)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Colación</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>{formatCurrency(summary.totalMealAllowance)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Remuneración</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#10b981' }}>
                {formatCurrency(summary.totalRemuneration)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Detalle de Trabajadores</h2>
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
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>Cargo</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Sueldo Base</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Movilización</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Colación</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Anticipo</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Total</th>
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
                    <td style={{ padding: '12px', fontSize: '14px' }}>{row.position || '-'}</td>
                    <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right' }}>
                      {formatCurrency(row.base_salary)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right' }}>
                      {formatCurrency(row.transportation)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right' }}>
                      {formatCurrency(row.meal_allowance)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right' }}>
                      {row.requests_advance ? formatCurrency(row.advance_amount) : '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right', fontWeight: '600' }}>
                      {formatCurrency(row.total_remuneration)}
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

