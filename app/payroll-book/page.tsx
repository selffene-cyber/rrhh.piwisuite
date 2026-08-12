'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatMonthYear, MONTHS } from '@/lib/utils/date'
import { PayrollBook } from '@/types'

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
  const { company: currentCompany } = useCurrentCompany()
  const [books, setBooks] = useState<PayrollBook[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerate, setShowGenerate] = useState(false)
  const [generateYear, setGenerateYear] = useState<number>(new Date().getFullYear())
  const [generateMonth, setGenerateMonth] = useState<number>(new Date().getMonth() + 1)
  const [generating, setGenerating] = useState(false)

  const handleDelete = async (bookId: string, status: string) => {
    if (status === 'closed' || status === 'sent_dt') {
      alert('No se puede eliminar un libro cerrado o enviado a DT.')
      return
    }

    if (!confirm('¿Está seguro de que desea eliminar este libro de remuneraciones? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/payroll-book/${bookId}/delete`, {
        method: 'DELETE',
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar el libro')
      }

      alert('Libro eliminado correctamente.')
      await loadData()
    } catch (error: any) {
      console.error('Error al eliminar libro:', error)
      alert('Error al eliminar libro: ' + error.message)
    }
  }

  useEffect(() => {
    if (currentCompany) {
      loadData()
    }
  }, [currentCompany])

  const loadData = async () => {
    if (!currentCompany) return

    try {
      setLoading(true)

      const { data: booksData, error } = await supabase
        .from('payroll_books')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (error) throw error
      setBooks((booksData || []) as PayrollBook[])
    } catch (error: any) {
      console.error('Error al cargar libros:', error)
      alert('Error al cargar libros: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!currentCompany) return

    const existing = books.find(b => b.year === generateYear && b.month === generateMonth)
    if (existing && (existing.status === 'closed' || existing.status === 'sent_dt')) {
      alert(`El libro para ${MONTHS[generateMonth - 1]} ${generateYear} ya está cerrado/enviado y no se puede regenerar.`)
      return
    }

    if (!confirm(`¿Generar el Libro de Remuneraciones para ${MONTHS[generateMonth - 1]} ${generateYear}?`)) {
      return
    }

    try {
      setGenerating(true)
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/payroll-book/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          company_id: currentCompany.id,
          year: generateYear,
          month: generateMonth,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al generar el libro')
      }

      alert(`Libro de Remuneraciones para ${MONTHS[generateMonth - 1]} ${generateYear} generado correctamente.`)
      setShowGenerate(false)
      await loadData()
    } catch (error: any) {
      console.error('Error al generar libro:', error)
      alert('Error al generar libro: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  if (!currentCompany) {
    return (
      <div>
        <h1>Libros de Remuneraciones</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            Seleccione una empresa para ver los libros de remuneraciones.
          </p>
        </div>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Libros de Remuneraciones</h1>
        <button onClick={() => setShowGenerate(true)}>Generar Libro</button>
      </div>

      {showGenerate && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h2 style={{ marginTop: 0 }}>Generar Nuevo Libro</h2>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr auto', alignItems: 'end' }}>
            <div className="form-group">
              <label>Año</label>
              <select value={generateYear} onChange={(e) => setGenerateYear(Number(e.target.value))}>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Mes</label>
              <select value={generateMonth} onChange={(e) => setGenerateMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generando...' : 'Generar'}
              </button>
              <button onClick={() => setShowGenerate(false)} className="secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card">
          <p>Cargando...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay libros de remuneraciones generados aún. Haga clic en "Generar Libro" para crear uno.
          </p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Período</th>
                <th>Estado</th>
                <th>Trabajadores</th>
                <th>Total Neto</th>
                <th>Generado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id}>
                  <td>{formatMonthYear(book.month, book.year)}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: STATUS_COLORS[book.status] || '#6b7280',
                        color: 'white',
                      }}
                    >
                      {STATUS_LABELS[book.status] || book.status}
                    </span>
                  </td>
                  <td>{book.total_employees || 0}</td>
                  <td>
                    ${(book.total_net_pay || 0).toLocaleString('es-CL')}
                  </td>
                  <td>
                    {book.generated_at
                      ? new Date(book.generated_at).toLocaleDateString('es-CL')
                      : '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Link href={`/payroll-book/${book.id}`}>
                        <button style={{ padding: '4px 8px', fontSize: '12px' }}>
                          Ver Detalle
                        </button>
                      </Link>
                      {book.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(book.id, book.status)}
                          style={{ padding: '4px 8px', fontSize: '12px', background: '#ef4444', color: 'white', border: '1px solid #dc2626', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

