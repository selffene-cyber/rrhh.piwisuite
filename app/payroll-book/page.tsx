'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatMonthYear } from '@/lib/utils/date'
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Libros de Remuneraciones</h1>
      </div>

      {loading ? (
        <div className="card">
          <p>Cargando...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay libros de remuneraciones generados aún.
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
                    <Link href={`/payroll-book/${book.id}`}>
                      <button style={{ padding: '4px 8px', fontSize: '12px' }}>
                        Ver Detalle
                      </button>
                    </Link>
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

