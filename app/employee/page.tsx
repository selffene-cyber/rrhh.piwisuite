'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  FaUmbrellaBeach, 
  FaFileAlt, 
  FaCalendarCheck, 
  FaFolderOpen, 
  FaShieldAlt, 
  FaHandHoldingUsd, 
  FaHistory,
  FaCheckCircle,
  FaClock
} from 'react-icons/fa'

interface DashboardData {
  employee: {
    id: string
    full_name: string
    rut: string
  }
  vacationBalance: {
    accumulated: number
    used: number
    available: number
  }
  stats: {
    certificates: {
      total: number
      approved: number
      pending: number
      rejected: number
    }
    vacations: {
      total: number
      approved: number
      pending: number
      rejected: number
    }
    permissions: {
      total: number
      approved: number
      pending: number
      rejected: number
    }
  }
  upcoming: {
    vacations: any[]
    permissions: any[]
  }
}

export default function EmployeeDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const response = await fetch('/api/employee/dashboard')
      if (response.ok) {
        const dashboardData = await response.json()
        setData(dashboardData)
      }
    } catch (error) {
      console.error('Error al cargar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 text-sm font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">No se pudieron cargar los datos</p>
      </div>
    )
  }

  const availableDays = Math.round(data.vacationBalance.available)
  const usedDays = Math.round(data.vacationBalance.used)
  const totalDays = Math.round(data.vacationBalance.accumulated)
  
  const approvedDocs = data.stats.certificates.approved + data.stats.vacations.approved + data.stats.permissions.approved
  const pendingDocs = data.stats.certificates.pending + data.stats.vacations.pending + data.stats.permissions.pending

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Sección de Documentos con Preline UI */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Documentos</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Card Aprobados */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <FaCheckCircle className="text-emerald-600 text-xl" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{approvedDocs}</p>
                <p className="text-xs text-gray-600 font-medium">Aprobados</p>
              </div>
            </div>
          </div>

          {/* Card Pendientes */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <FaClock className="text-amber-600 text-xl" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{pendingDocs}</p>
                <p className="text-xs text-gray-600 font-medium">Pendientes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Vacaciones con Preline UI */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mis Vacaciones</h2>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Días disponibles</p>
              <p className="text-3xl font-bold text-blue-600">{availableDays}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Días usados</p>
              <p className="text-3xl font-bold text-gray-700">{usedDays}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos con Preline UI */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link 
            href="/employee/vacations/request" 
            className="flex flex-col items-center justify-center p-5 bg-white border border-gray-200 rounded-xl text-center hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
              <FaUmbrellaBeach className="text-blue-600 text-xl" />
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Vacaciones</p>
            <p className="text-xs text-gray-600">Nueva solicitud</p>
          </Link>

          <Link 
            href="/employee/permissions/request" 
            className="flex flex-col items-center justify-center p-5 bg-white border border-gray-200 rounded-xl text-center hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-3">
              <FaCalendarCheck className="text-indigo-600 text-xl" />
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Permisos</p>
            <p className="text-xs text-gray-600">Nueva solicitud</p>
          </Link>

          <Link 
            href="/employee/certificates/request" 
            className="flex flex-col items-center justify-center p-5 bg-white border border-gray-200 rounded-xl text-center hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center mb-3">
              <FaFileAlt className="text-cyan-600 text-xl" />
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Certificados</p>
            <p className="text-xs text-gray-600">Nueva solicitud</p>
          </Link>

          <Link 
            href="/employee/compliance" 
            className="flex flex-col items-center justify-center p-5 bg-white border border-gray-200 rounded-xl text-center hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
              <FaShieldAlt className="text-emerald-600 text-xl" />
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Cumplimiento</p>
            <p className="text-xs text-gray-600">Ver mis cumplimientos</p>
          </Link>

          <Link 
            href="/employee/documents" 
            className="flex flex-col items-center justify-center p-5 bg-white border border-gray-200 rounded-xl text-center hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
              <FaFolderOpen className="text-purple-600 text-xl" />
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Documentos</p>
            <p className="text-xs text-gray-600">Ver todos</p>
          </Link>

          <Link 
            href="/employee/loans" 
            className="flex flex-col items-center justify-center p-5 bg-white border border-gray-200 rounded-xl text-center hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
              <FaHandHoldingUsd className="text-amber-600 text-xl" />
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Préstamos</p>
            <p className="text-xs text-gray-600">Ver historial</p>
          </Link>

          <Link 
            href="/employee/audit-history" 
            className="col-span-2 flex flex-col items-center justify-center p-5 bg-white border border-gray-200 rounded-xl text-center hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mb-3">
              <FaHistory className="text-violet-600 text-xl" />
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Historial</p>
            <p className="text-xs text-gray-600">Ver todas mis acciones</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
