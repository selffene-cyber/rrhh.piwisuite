'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { ReportFilters, LeaveReportRow, LeaveSummary } from '@/types'
import { getLeavesReport } from '@/lib/services/reports/leavesReports'
import ReportFiltersComponent from '@/components/reports/ReportFilters'
import { FaFilePdf, FaFileExcel, FaArrowLeft } from 'react-icons/fa'
import { formatDate } from '@/lib/utils/date'
import { getEmployeeStatusLabel } from '@/lib/utils/employeeStatus'

export default function LeavesReportPage() {
  const router = useRouter()
  const { companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<LeaveReportRow[]>([])
  const [summary, setSummary] = useState<LeaveSummary | null>(null)
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
      const result = await getLeavesReport(filters, supabase)
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
      const response = await fetch('/api/reports/leaves/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      })

      if (!response.ok) throw new Error('Error al generar PDF')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Reporte_Licencias_${new Date().toISOString().split('T')[0]}.pdf`
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
      const response = await fetch('/api/reports/leaves/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      })

      if (!response.ok) throw new Error('Error al generar CSV')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Reporte_Licencias_${new Date().toISOString().split('T')[0]}.csv`
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
            Reporte de Estados Laborales y Licencias Médicas
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
        showDateRange={true}
      />

      {summary && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Resumen</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Licencias Activas</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{summary.totalActiveMedicalLeaves}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Días Licencias</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{summary.totalMedicalLeaveDays}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Trabajadores con Licencias</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{summary.employeesWithActiveLeaves}</div>
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
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>Estado</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>Licencia Activa</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>Días Licencia</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>Inicio Licencia</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>Fin Licencia</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>Días Vacaciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{row.rut}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{row.full_name}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <span className="badge" style={{ 
                        backgroundColor: row.status === 'active' ? '#10b98120' : row.status === 'licencia_medica' ? '#f59e0b20' : '#6b728020',
                        color: row.status === 'active' ? '#10b981' : row.status === 'licencia_medica' ? '#f59e0b' : '#6b7280'
                      }}>
                        {getEmployeeStatusLabel(row.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>
                      {row.medical_leave_active ? (
                        <span style={{ color: '#10b981', fontWeight: '600' }}>Sí</span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>No</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>
                      {row.medical_leave_days > 0 ? row.medical_leave_days : '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {row.medical_leave_start ? formatDate(row.medical_leave_start) : '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {row.medical_leave_end ? formatDate(row.medical_leave_end) : '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>
                      {row.vacation_days_taken || 0}
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

