'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { FaUsers, FaFileInvoiceDollar, FaUserPlus, FaCog } from 'react-icons/fa'

export default function HomePage() {
  const [employeesCount, setEmployeesCount] = useState(0)
  const [payrollCount, setPayrollCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Obtener estadísticas básicas
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id')
        .eq('status', 'active')

      if (employeesError) {
        console.error('Error al contar trabajadores:', employeesError)
      } else {
        setEmployeesCount(employeesData?.length || 0)
      }

      // Contar liquidaciones emitidas o enviadas (no borradores)
      const { data: payrollData, error: payrollError } = await supabase
        .from('payroll_slips')
        .select('id')
        .in('status', ['issued', 'sent'])

      if (payrollError) {
        console.error('Error al contar liquidaciones:', payrollError)
      } else {
        setPayrollCount(payrollData?.length || 0)
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
          Dashboard
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Resumen general del sistema de remuneraciones
        </p>
      </div>

      {/* Cards de Estadísticas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px', 
        marginBottom: '32px'
      }}
      className="stats-grid"
      >
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
          color: 'white',
          border: 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Trabajadores Activos</p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0 }}>
                {employeesCount || 0}
              </p>
            </div>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaUsers size={24} />
            </div>
          </div>
        </div>

        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Liquidaciones Confirmadas</p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0 }}>
                {payrollCount || 0}
              </p>
            </div>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaFileInvoiceDollar size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Accesos Rápidos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <Link href="/employees" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}>
                <FaUsers size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Gestionar Trabajadores</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Ver y editar trabajadores</div>
              </div>
            </div>
          </Link>

          <Link href="/payroll" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}>
                <FaFileInvoiceDollar size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Ver Liquidaciones</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Historial de liquidaciones</div>
              </div>
            </div>
          </Link>

          <Link href="/payroll/new" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b'
              }}>
                <FaUserPlus size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Nueva Liquidación</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Crear nueva liquidación</div>
              </div>
            </div>
          </Link>

          <Link href="/settings" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
              }}>
                <FaCog size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Configuración</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Ajustes del sistema</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

