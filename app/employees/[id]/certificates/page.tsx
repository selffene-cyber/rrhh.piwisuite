'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CertificatesPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<any>(null)

  useEffect(() => {
    loadEmployee()
  }, [])

  const loadEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setEmployee(data)
    } catch (error: any) {
      alert('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!employee) {
    return <div>Trabajador no encontrado</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Certificados Laborales - {employee.full_name}</h1>
        <Link href={`/employees/${params.id}`}>
          <button className="secondary">Volver</button>
        </Link>
      </div>

      <div className="card">
        <h2>Tipos de Certificados Disponibles</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginTop: '20px' }}>
          <Link href={`/employees/${params.id}/certificates/antiguedad`}>
            <div style={{ 
              padding: '20px', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            >
              <h3 style={{ marginBottom: '8px' }}>Certificado de Antigüedad</h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Certifica la antigüedad laboral del trabajador en la empresa
              </p>
            </div>
          </Link>

          <Link href={`/employees/${params.id}/certificates/renta`}>
            <div style={{ 
              padding: '20px', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            >
              <h3 style={{ marginBottom: '8px' }}>Certificado de Renta</h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Certifica las remuneraciones percibidas (3, 6 o 12 meses)
              </p>
            </div>
          </Link>

          <Link href={`/employees/${params.id}/certificates/vigencia`}>
            <div style={{ 
              padding: '20px', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            >
              <h3 style={{ marginBottom: '8px' }}>Certificado de Vigencia Laboral</h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Certifica que el trabajador mantiene relación laboral vigente
              </p>
            </div>
          </Link>

          <Link href={`/employees/${params.id}/contracts`}>
            <div style={{ 
              padding: '20px', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            >
              <h3 style={{ marginBottom: '8px' }}>Contratos y Anexos</h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Acceso a copias de contratos y anexos del trabajador
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

