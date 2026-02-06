'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaArrowLeft } from 'react-icons/fa'
import AuditHistoryTab from '@/components/AuditHistoryTab'
import { supabase } from '@/lib/supabase/client'
import '../employee-portal-tailwind.css'

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
      <div style={{ maxWidth: '672px', margin: '0 auto', padding: '24px' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-sky-200 border-t-sky-500 mb-3"></div>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!employeeId) {
    return (
      <div style={{ maxWidth: '672px', margin: '0 auto', padding: '24px' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>No se pudo cargar la información del trabajador</p>
          <Link 
            href="/employee"
            className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            title="Volver"
          >
            <FaArrowLeft size={18} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '672px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>Histórico de Acciones</h1>
        <Link 
          href="/employee"
          className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          title="Volver"
        >
          <FaArrowLeft size={18} />
        </Link>
      </div>

      <div className="employee-portal-card">
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
          Aquí puedes ver todas las acciones realizadas relacionadas con tu perfil y documentos.
        </p>
        <AuditHistoryTab employeeId={employeeId} isEmployeePortal={true} />
      </div>
    </div>
  )
}
