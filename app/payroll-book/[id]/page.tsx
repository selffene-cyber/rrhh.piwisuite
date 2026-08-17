'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatMonthYear, formatDate } from '@/lib/utils/date'
import { FaFileCsv, FaFilePdf, FaLock, FaArrowLeft, FaExclamationTriangle, FaCheckCircle, FaDownload, FaTimes } from 'react-icons/fa'
import { PayrollBook, PayrollBookEntry, LREValidationError } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  closed: 'Cerrado',
  sent_dt: 'Enviado a DT',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  closed: '#10b981',
  sent_dt: '#3b82f6',
}

type LREValidationState = 'idle' | 'validating' | 'downloading'

export default function PayrollBookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [book, setBook] = useState<PayrollBook | null>(null)
  const [entries, setEntries] = useState<PayrollBookEntry[]>([])
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [lreState, setLreState] = useState<LREValidationState>('idle')
  const [lreErrors, setLreErrors] = useState<LREValidationError[]>([])
  const [lreBlockingErrors, setLreBlockingErrors] = useState(0)
  const [lreWarnings, setLreWarnings] = useState(0)
  const [showLreModal, setShowLreModal] = useState(false)

  useEffect(() => {
    if (currentCompany && params.id) {
      loadData()
    }
  }, [currentCompany, params.id])

  const loadData = async () => {
    if (!currentCompany) return

    try {
      setLoading(true)

      // Cargar libro directamente desde Supabase
      const { data: bookData, error: bookError } = await supabase
        .from('payroll_books')
        .select('*')
        .eq('id', params.id)
        .eq('company_id', currentCompany.id)
        .single()

      if (bookError || !bookData) {
        alert('Libro no encontrado')
        router.push('/payroll-book')
        return
      }

      setBook(bookData as PayrollBook)

      // Cargar entradas
      const { data: entriesData, error: entriesError } = await supabase
        .from('payroll_book_entries')
        .select('*')
        .eq('payroll_book_id', params.id)
        .order('employee_name', { ascending: true })

      if (entriesError) throw entriesError
      setEntries((entriesData || []) as PayrollBookEntry[])

      // Cargar empresa
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', currentCompany.id)
        .single()

      setCompany(companyData)
    } catch (error: any) {
      console.error('Error al cargar libro:', error)
      alert('Error al cargar libro: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = async () => {
    if (!book) return

    if (!confirm('¿Estás seguro de que deseas cerrar este libro? Una vez cerrado, no podrá modificarse.')) {
      return
    }

    setClosing(true)

    try {
      const response = await fetch(`/api/payroll-book/${book.id}/close`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cerrar libro')
      }

      alert('Libro cerrado correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al cerrar libro: ' + error.message)
    } finally {
      setClosing(false)
    }
  }

  const handleExportCSV = () => {
    if (!book) return
    window.open(`/api/payroll-book/${book.id}/export-csv`, '_blank')
  }

  const handleExportPDF = () => {
    if (!book) return
    window.open(`/api/payroll-book/${book.id}/export-pdf`, '_blank')
  }

  const handleLREValidation = async () => {
    if (!book || !currentCompany) return
    setLreState('validating')
    setShowLreModal(true)
    setLreErrors([])
    setLreBlockingErrors(0)
    setLreWarnings(0)

    try {
      const response = await fetch('/api/lre/export-lre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: currentCompany.id,
          year: book.year,
          month: book.month,
          bookId: book.id,
        }),
      })

      const data = await response.json()

      if (data.errors) {
        setLreErrors(data.errors || [])
        setLreBlockingErrors(data.blocking_errors || 0)
        setLreWarnings(data.warnings || 0)
      }

      if (data.success && data.file_content) {
        const blob = new Blob([data.file_content], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.file_name || `LRE_${book.year}${String(book.month).padStart(2, '0')}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setLreState('idle')
        if (data.warnings > 0) {
          setLreErrors(data.errors || [])
          setLreBlockingErrors(0)
          setLreWarnings(data.warnings)
          setShowLreModal(true)
        } else {
          setShowLreModal(false)
          alert('Archivo LRE descargado exitosamente')
        }
      } else if (data.blocking_errors > 0) {
        setLreState('idle')
      } else {
        throw new Error(data.error || 'Error desconocido al generar archivo LRE')
      }
    } catch (error: any) {
      alert('Error al validar LRE: ' + error.message)
      setLreState('idle')
    }
  }

  const handleDownloadLRE = async () => {
    if (!book || !currentCompany) return
    setLreState('downloading')

    try {
      const response = await fetch('/api/lre/export-lre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: currentCompany.id,
          year: book.year,
          month: book.month,
          bookId: book.id,
        }),
      })

      const data = await response.json()

      if (data.success && data.file_content) {
        const blob = new Blob([data.file_content], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.file_name || `LRE_${book.year}${String(book.month).padStart(2, '0')}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setShowLreModal(false)
        alert('Archivo LRE descargado exitosamente')
      } else {
        throw new Error(data.error || 'Error al generar archivo LRE')
      }
    } catch (error: any) {
      alert('Error al descargar LRE: ' + error.message)
    } finally {
      setLreState('idle')
    }
  }

  if (loading) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Detalle del Libro de Remuneraciones</h1>
          <Link href="/payroll-book">
            <button className="secondary">
              <FaArrowLeft style={{ marginRight: '8px' }} />
              Volver
            </button>
          </Link>
        </div>
        <div className="card">
          <p>Cargando libro...</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Detalle del Libro de Remuneraciones</h1>
          <Link href="/payroll-book">
            <button className="secondary">
              <FaArrowLeft style={{ marginRight: '8px' }} />
              Volver
            </button>
          </Link>
        </div>
        <div className="card">
          <p>Libro no encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1>Libro de Remuneraciones - {formatMonthYear(book.year, book.month)}</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportPDF}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#dc2626', color: 'white', border: '1px solid #b91c1c', borderRadius: '4px', cursor: 'pointer', padding: '6px 12px' }}
          >
            <FaFilePdf size={16} />
            Exportar PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaFileCsv size={16} />
            Exportar CSV
          </button>
          <button
            onClick={handleLREValidation}
            disabled={lreState !== 'idle' || book.status === 'draft'}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: book.status === 'draft' ? '#9ca3af' : '#2563eb',
              color: 'white', border: 'none', borderRadius: '4px',
              cursor: book.status === 'draft' ? 'not-allowed' : 'pointer',
              padding: '6px 12px',
              opacity: book.status === 'draft' ? 0.5 : 1,
            }}
            title={book.status === 'draft' ? 'El libro debe estar cerrado para exportar a la DT' : 'Descargar archivo LRE para la Dirección del Trabajo'}
          >
            <FaDownload size={16} />
            {lreState === 'validating' ? 'Validando...' : 'Descargar LRE-DT'}
          </button>
          {book.status === 'draft' && (
            <button
              onClick={handleClose}
              disabled={closing}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: 'white' }}
            >
              <FaLock size={16} />
              {closing ? 'Cerrando...' : 'Cerrar Libro'}
            </button>
          )}
          <Link href="/payroll-book">
            <button className="secondary">
              <FaArrowLeft style={{ marginRight: '8px' }} />
              Volver
            </button>
          </Link>
        </div>
      </div>

      {/* Información del libro */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Información del Libro</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Período</label>
            <p><strong>{formatMonthYear(book.year, book.month)}</strong></p>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <p>
              <span
                className="badge"
                style={{
                  backgroundColor: STATUS_COLORS[book.status] || '#6b7280',
                  color: 'white',
                }}
              >
                {STATUS_LABELS[book.status] || book.status}
              </span>
            </p>
          </div>
          <div className="form-group">
            <label>Trabajadores</label>
            <p><strong>{book.total_employees}</strong></p>
          </div>
        </div>
        {company && (
          <div className="form-group">
            <label>Empresa</label>
            <p>{company.name} - RUT: {company.rut}</p>
          </div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label>Generado el</label>
            <p>{book.generated_at ? formatDate(book.generated_at) : '-'}</p>
          </div>
          {book.closed_at && (
            <div className="form-group">
              <label>Cerrado el</label>
              <p>{formatDate(book.closed_at)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Resumen de totales */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Resumen de Totales</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Total Haberes Imponibles</label>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
              ${book.total_taxable_earnings.toLocaleString('es-CL')}
            </p>
          </div>
          <div className="form-group">
            <label>Total Haberes No Imponibles</label>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
              ${book.total_non_taxable_earnings.toLocaleString('es-CL')}
            </p>
          </div>
          <div className="form-group">
            <label>Total Descuentos Legales</label>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
              ${book.total_legal_deductions.toLocaleString('es-CL')}
            </p>
          </div>
          <div className="form-group">
            <label>Total Otros Descuentos</label>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
              ${book.total_other_deductions.toLocaleString('es-CL')}
            </p>
          </div>
          <div className="form-group">
            <label>Total Aportes Empleador</label>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#8b5cf6' }}>
              ${book.total_employer_contributions.toLocaleString('es-CL')}
            </p>
          </div>
          <div className="form-group">
            <label>Líquido Total a Pagar</label>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
              ${book.total_net_pay.toLocaleString('es-CL')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de entradas */}
      <div className="card">
        <h2>Detalle por Trabajador ({entries.length} trabajadores)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>RUT</th>
                <th>Nombre</th>
                <th>Cargo</th>
                <th>AFP</th>
                <th>Salud</th>
                <th>Hab. Imp.</th>
                <th>Hab. No Imp.</th>
                <th>Desc. Legales</th>
                <th>Otros Desc.</th>
                <th>Líquido</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.employee_rut}</td>
                  <td>{entry.employee_name}</td>
                  <td>{entry.employee_position || '-'}</td>
                  <td>{entry.employee_afp}</td>
                  <td>{entry.employee_health_system}</td>
                  <td>${entry.total_taxable_earnings.toLocaleString('es-CL')}</td>
                  <td>${entry.total_non_taxable_earnings.toLocaleString('es-CL')}</td>
                  <td>${entry.total_legal_deductions.toLocaleString('es-CL')}</td>
                  <td>${entry.total_other_deductions.toLocaleString('es-CL')}</td>
                  <td><strong>${entry.net_pay.toLocaleString('es-CL')}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Validación LRE */}
      {showLreModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'white', borderRadius: '8px', padding: '24px',
            maxWidth: '900px', width: '90%', maxHeight: '80vh', overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>
                {lreBlockingErrors > 0 ? 'Errores de Validación LRE' : 'Advertencias de Validación LRE'}
              </h2>
              <button onClick={() => setShowLreModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>
                <FaTimes />
              </button>
            </div>

            {lreBlockingErrors > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '4px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ color: '#dc2626', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                  <FaExclamationTriangle style={{ marginRight: '8px' }} />
                  Se encontraron {lreBlockingErrors} errores bloqueantes. Debe corregirlos antes de exportar.
                </p>
              </div>
            )}

            {lreWarnings > 0 && lreBlockingErrors === 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '4px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ color: '#d97706', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                  <FaExclamationTriangle style={{ marginRight: '8px' }} />
                  Se encontraron {lreWarnings} advertencias. Puede exportar pero revise los datos.
                </p>
              </div>
            )}

            {lreBlockingErrors === 0 && lreWarnings === 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '4px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ color: '#16a34a', fontWeight: 'bold', margin: 0 }}>
                  <FaCheckCircle style={{ marginRight: '8px' }} />
                  Validación exitosa. No se encontraron errores ni advertencias.
                </p>
              </div>
            )}

            {lreErrors.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>RUT</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Nombre</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Código</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Campo</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Severidad</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lreErrors.map((err, idx) => (
                      <tr key={idx} style={{ background: err.severity === 'blocking' ? '#fef2f2' : '#fffbeb' }}>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{err.employee_rut || '-'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{err.employee_name || '-'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{err.field_code}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{err.field_name}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{
                            background: err.severity === 'blocking' ? '#dc2626' : '#f59e0b',
                            color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                          }}>
                            {err.severity === 'blocking' ? 'Bloqueante' : 'Advertencia'}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              {lreBlockingErrors === 0 && (
                <button
                  onClick={handleDownloadLRE}
                  disabled={lreState !== 'idle'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: '#2563eb', color: 'white', border: 'none',
                    borderRadius: '4px', cursor: lreState === 'idle' ? 'pointer' : 'not-allowed',
                    padding: '8px 16px',
                  }}
                >
                  <FaDownload size={14} />
                  {lreState === 'downloading' ? 'Descargando...' : 'Descargar archivo LRE'}
                </button>
              )}
              <button
                onClick={() => setShowLreModal(false)}
                className="secondary"
                style={{ padding: '8px 16px' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}





