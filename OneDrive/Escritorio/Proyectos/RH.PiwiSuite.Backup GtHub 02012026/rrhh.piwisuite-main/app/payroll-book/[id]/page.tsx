'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatMonthYear, formatDate } from '@/lib/utils/date'
import { FaFileCsv, FaLock, FaArrowLeft } from 'react-icons/fa'
import { PayrollBook, PayrollBookEntry } from '@/types'

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

export default function PayrollBookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [book, setBook] = useState<PayrollBook | null>(null)
  const [entries, setEntries] = useState<PayrollBookEntry[]>([])
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)

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
            onClick={handleExportCSV}
            className="secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaFileCsv size={16} />
            Exportar CSV (LRE)
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
    </div>
  )
}





