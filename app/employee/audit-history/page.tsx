'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuditHistoryTab from '@/components/AuditHistoryTab'
import { supabase } from '@/lib/supabase/client'

export default function EmployeeAuditHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [employeeId, setEmployeeId] = useState<string | null>(null)

  useEffect(() => {
    loadEmployeeId()
  }, [])

  const loadEmployeeId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: employee, error } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      if (!employee) {
        router.push('/employee')
        return
      }

      setEmployeeId(employee.id)
    } catch (error: any) {
      console.error('Error al cargar ID del trabajador:', error)
      alert('Error al cargar información del trabajador')
      router.push('/employee')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!employeeId) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>No se pudo cargar la información del trabajador</p>
          <Link href="/employee">
            <button style={{ marginTop: '16px' }}>Volver al Dashboard</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Histórico de Acciones</h1>
        <Link href="/employee">
          <button className="secondary">Volver al Dashboard</button>
        </Link>
      </div>

      <div className="card">
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
          Aquí puedes ver todas las acciones realizadas relacionadas con tu perfil y documentos.
        </p>
        <AuditHistoryTab employeeId={employeeId} isEmployeePortal={true} />
      </div>
    </div>
  )
}





