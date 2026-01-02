'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatMonthYear, MONTHS } from '@/lib/utils/date'
import { FaFilePdf, FaFileCsv, FaCheck, FaLock, FaUnlock } from 'react-icons/fa'
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

export default function PayrollBookPage() {
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [books, setBooks] = useState<PayrollBook[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [closing, setClosing] = useState<string | null>(null)
  
  // Filtros
  const currentYear = new Date().getFullYear()
  const [filterYear, setFilterYear] = useState<number>(currentYear)
  const [filterMonth, setFilterMonth] = useState<number | ''>('')

  useEffect(() => {
    if (currentCompany) {
      loadBooks()
    } else {
      setBooks([])
      setLoading(false)
    }
  }, [currentCompany, filterYear, filterMonth])

  const loadBooks = async () => {
    if (!currentCompany) return

    try {
      setLoading(true)
      let query = supabase
        .from('payroll_books')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('year', filterYear)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (filterMonth) {
        query = query.eq('month', filterMonth)
      }

      const { data, error } = await query

      if (error) throw error
      setBooks((data || []) as PayrollBook[])
    } catch (error: any) {
      console.error('Error al cargar libros:', error)
      alert('Error al cargar libros de remuneraciones: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (year: number, month: number) => {
    if (!currentCompany) return

    const key = `${year}-${month}`
    setGenerating(key)

    try {
      const response = await fetch('/api/payroll-book/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: currentCompany.id,
          year,
          month,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al generar libro')
      }

      alert('Libro generado correctamente')
      loadBooks()
    } catch (error: any) {
      alert('Error al generar libro: ' + error.message)
    } finally {
      setGenerating(null)
    }
  }

  const handleClose = async (bookId: string) => {
    if (!confirm('¿Estás seguro de que deseas cerrar este libro? Una vez cerrado, no podrá modificarse.')) {
      return
    }

    setClosing(bookId)

    try {
      const response = await fetch(`/api/payroll-book/${bookId}/close`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cerrar libro')
      }

      alert('Libro cerrado correctamente')
      loadBooks()
    } catch (error: any) {
      alert('Error al cerrar libro: ' + error.message)
    } finally {
      setClosing(null)
    }
  }

  const handleExportCSV = (bookId: string) => {
    window.open(`/api/payroll-book/${bookId}/export-csv`, '_blank')
  }

  if (!currentCompany) {
    return (
      <div>
        <h1>Libro de Remuneraciones</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver el libro de remuneraciones.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Libro de Remuneraciones</h1>
        <Link href="/payroll">
          <button className="secondary">Volver a Liquidaciones</button>
        </Link>
      </div>

      {/* Información legal */}
      <div className="card" style={{ marginBottom: '24px', backgroundColor: '#f0f9ff', border: '1px solid #3b82f6' }}>
        <h3 style={{ color: '#1e40af', marginBottom: '8px' }}>📋 Información Legal</h3>
        <p style={{ fontSize: '14px', color: '#1e3a8a', lineHeight: '1.6' }}>
          El Libro de Remuneraciones es obligatorio según el <strong>artículo 62 del Código del Trabajo</strong> 
          para empresas con 5 o más trabajadores. El <strong>Libro de Remuneraciones Electrónico (LRE)</strong> 
          cumple esta obligación cuando se registra mensualmente en el portal de la Dirección del Trabajo, 
          según el <strong>Dictamen DT N.º 887/006 de 10.03.2021</strong>.
        </p>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Filtros</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Año</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Mes (opcional)</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value) : '')}
            >
              <option value="">Todos los meses</option>
              {MONTHS.map((month, index) => (
                <option key={index + 1} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de libros */}
      {loading ? (
        <div className="card">
          <p>Cargando libros de remuneraciones...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay libros de remuneraciones para el período seleccionado.
          </p>
        </div>
      ) : (
        <div className="card">
          <h2>Libros Generados</h2>
          <table>
            <thead>
              <tr>
                <th>Período</th>
                <th>Estado</th>
                <th>Trabajadores</th>
                <th>Total Haberes Imp.</th>
                <th>Total Haberes No Imp.</th>
                <th>Total Descuentos</th>
                <th>Líquido Total</th>
                <th>Generado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => {
                const key = `${book.year}-${book.month}`
                return (
                  <tr key={book.id}>
                    <td>
                      <strong>{formatMonthYear(book.year, book.month)}</strong>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: STATUS_COLORS[book.status] || '#6b7280',
                          color: 'white',
                        }}
                      >
                        {STATUS_LABELS[book.status] || book.status}
                      </span>
                    </td>
                    <td>{book.total_employees}</td>
                    <td>${book.total_taxable_earnings.toLocaleString('es-CL')}</td>
                    <td>${book.total_non_taxable_earnings.toLocaleString('es-CL')}</td>
                    <td>${(book.total_legal_deductions + book.total_other_deductions).toLocaleString('es-CL')}</td>
                    <td>
                      <strong>${book.total_net_pay.toLocaleString('es-CL')}</strong>
                    </td>
                    <td>
                      {book.generated_at
                        ? new Date(book.generated_at).toLocaleDateString('es-CL')
                        : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <Link href={`/payroll-book/${book.id}`}>
                          <button
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            className="secondary"
                            title="Ver detalle"
                          >
                            Ver
                          </button>
                        </Link>
                        <button
                          onClick={() => handleExportCSV(book.id)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          className="secondary"
                          title="Exportar CSV (LRE)"
                        >
                          <FaFileCsv size={12} /> CSV
                        </button>
                        {book.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleGenerate(book.year, book.month)}
                              disabled={generating === key}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              title="Regenerar libro"
                            >
                              {generating === key ? '...' : 'Regenerar'}
                            </button>
                            <button
                              onClick={() => handleClose(book.id)}
                              disabled={closing === book.id}
                              style={{ padding: '4px 8px', fontSize: '12px', background: '#10b981', color: 'white' }}
                              title="Cerrar libro"
                            >
                              {closing === book.id ? '...' : <><FaLock size={12} /> Cerrar</>}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Botón para generar nuevo libro */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h2>Generar Nuevo Libro</h2>
        <p style={{ marginBottom: '16px', color: '#6b7280' }}>
          Seleccione el año y mes para generar el Libro de Remuneraciones. 
          El libro se generará a partir de las liquidaciones emitidas del período.
        </p>
        <div className="form-row">
          <div className="form-group">
            <label>Año</label>
            <select id="new-year">
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Mes</label>
            <select id="new-month">
              {MONTHS.map((month, index) => (
                <option key={index + 1} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => {
                const yearSelect = document.getElementById('new-year') as HTMLSelectElement
                const monthSelect = document.getElementById('new-month') as HTMLSelectElement
                if (yearSelect && monthSelect) {
                  handleGenerate(parseInt(yearSelect.value), parseInt(monthSelect.value))
                }
              }}
            >
              <FaCheck style={{ marginRight: '8px' }} />
              Generar Libro
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

