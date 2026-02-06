'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import {
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaTimesCircle,
  FaUpload,
  FaDownload,
  FaFileUpload,
} from 'react-icons/fa'
import '../employee-portal-tailwind.css'

const STATUS_LABELS: Record<string, string> = {
  VIGENTE: 'Vigente',
  POR_VENCER: 'Por Vencer',
  VENCIDO: 'Vencido',
  EN_RENOVACION: 'En Renovación',
  EXENTO: 'Exento',
}

const STATUS_COLORS: Record<string, string> = {
  VIGENTE: '#10b981',
  POR_VENCER: '#f59e0b',
  VENCIDO: '#ef4444',
  EN_RENOVACION: '#0ea5e9',
  EXENTO: '#6b7280',
}

const TIPO_LABELS: Record<string, string> = {
  CERTIFICADO: 'Certificado',
  LICENCIA: 'Licencia',
  CURSO: 'Curso',
  EXAMEN: 'Examen',
  OTRO: 'Otro',
}

export default function EmployeeCompliancePage() {
  const [loading, setLoading] = useState(true)
  const [compliance, setCompliance] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [stats, setStats] = useState({
    vigentes: 0,
    porVencer: 0,
    vencidos: 0,
    enRenovacion: 0,
  })
  const [uploading, setUploading] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: employee } = await supabase
        .from('employees')
        .select('id, company_id')
        .eq('user_id', user.id)
        .single()

      if (!employee) {
        setLoading(false)
        return
      }

      const complianceResponse = await fetch(
        `/api/compliance/worker?company_id=${employee.company_id}&employee_id=${employee.id}`
      )
      if (complianceResponse.ok) {
        const complianceData = await complianceResponse.json()
        setCompliance(complianceData)

        const stats = {
          vigentes: complianceData.filter((c: any) => c.status === 'VIGENTE').length,
          porVencer: complianceData.filter((c: any) => c.status === 'POR_VENCER').length,
          vencidos: complianceData.filter((c: any) => c.status === 'VENCIDO').length,
          enRenovacion: complianceData.filter((c: any) => c.status === 'EN_RENOVACION').length,
        }
        setStats(stats)
      }

      const { data: notificationsData } = await supabase
        .from('compliance_notifications')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('leida', false)
        .order('created_at', { ascending: false })
        .limit(10)

      setNotifications(notificationsData || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (complianceId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf,image/*'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      setSelectedFile(file)
      setUploadingFor(complianceId)
      await uploadEvidence(complianceId, file)
    }
    input.click()
  }

  const uploadEvidence = async (complianceId: string, file: File) => {
    try {
      setUploading(complianceId)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const { data: employee } = await supabase
        .from('employees')
        .select('id, company_id')
        .eq('user_id', user.id)
        .single()

      if (!employee) throw new Error('Empleado no encontrado')

      const fileExt = file.name.split('.').pop()
      const fileName = `compliance-${complianceId}-${Date.now()}.${fileExt}`
      const filePath = `${employee.company_id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('compliance-evidence')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Error subiendo archivo:', uploadError)
        alert('Error al subir archivo. El bucket de almacenamiento no está configurado.')
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('compliance-evidence')
        .getPublicUrl(filePath)

      const response = await fetch(`/api/compliance/worker/${complianceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidencia_url: publicUrl,
          evidencia_nombre: file.name,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar cumplimiento')
      }

      loadData()
      setSelectedFile(null)
      setUploadingFor(null)
      alert('Evidencia subida correctamente')
    } catch (error: any) {
      console.error('Error subiendo evidencia:', error)
      alert(error.message || 'Error al subir evidencia')
    } finally {
      setUploading(null)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('compliance_notifications')
        .update({ leida: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(notifications.filter((n) => n.id !== notificationId))
    } catch (error) {
      console.error('Error marcando notificación como leída:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mb-3"></div>
          <p className="text-gray-600 text-sm font-medium">Cargando cumplimientos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Mi Cumplimiento
        </h1>
        <p className="text-sm text-gray-600">
          Gestiona tus certificados, licencias y cursos obligatorios
        </p>
      </div>

      {/* Notificaciones */}
      {notifications.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Notificaciones de Cumplimiento
          </h2>
          <div className="flex flex-col gap-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${
                  notification.prioridad === 'ALTA' 
                    ? 'bg-red-50 border-red-200' 
                    : 'border-gray-200'
                }`}
                onClick={() => markNotificationAsRead(notification.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold mb-2 ${
                      notification.prioridad === 'ALTA' ? 'text-red-900' : 'text-gray-900'
                    }`}>
                      {notification.titulo}
                    </div>
                    <div className="text-sm text-gray-600 mb-3 leading-relaxed">
                      {notification.mensaje}
                    </div>
                    {notification.action_link && (
                      <a
                        href={notification.action_link}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Ver detalle →
                      </a>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      markNotificationAsRead(notification.id)
                    }}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards de resumen */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 text-center hover:shadow-md transition-all">
            <FaCheckCircle className="text-3xl text-emerald-600 mx-auto mb-3" />
            <div className="text-sm font-semibold text-gray-900 mb-1">Vigentes</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.vigentes}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 text-center hover:shadow-md transition-all">
            <FaClock className="text-3xl text-amber-600 mx-auto mb-3" />
            <div className="text-sm font-semibold text-gray-900 mb-1">Por Vencer</div>
            <div className="text-2xl font-bold text-amber-600">{stats.porVencer}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 text-center hover:shadow-md transition-all">
            <FaTimesCircle className="text-3xl text-red-600 mx-auto mb-3" />
            <div className="text-sm font-semibold text-gray-900 mb-1">Vencidos</div>
            <div className="text-2xl font-bold text-red-600">{stats.vencidos}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 text-center hover:shadow-md transition-all">
            <FaFileUpload className="text-3xl text-blue-600 mx-auto mb-3" />
            <div className="text-sm font-semibold text-gray-900 mb-1">En Renovación</div>
            <div className="text-2xl font-bold text-blue-600">{stats.enRenovacion}</div>
          </div>
        </div>
      </div>

      {/* Lista de cumplimientos */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Mis Cumplimientos
        </h2>
        {compliance.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center text-gray-600">
            No tienes cumplimientos registrados
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {compliance.map((item: any) => {
              const diasRestantes = Math.ceil(
                (new Date(item.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              )

              const bgColor = item.status === 'VENCIDO' 
                ? 'bg-red-50' 
                : item.status === 'POR_VENCER' 
                ? 'bg-amber-50' 
                : 'bg-white'
              
              const borderColor = item.status === 'VENCIDO'
                ? 'border-red-200'
                : item.status === 'POR_VENCER'
                ? 'border-amber-200'
                : 'border-gray-200'

              return (
                <div
                  key={item.id}
                  className={`${bgColor} ${borderColor} border rounded-xl shadow-sm p-5 transition-all hover:shadow-md`}
                >
                  <div className="flex flex-col gap-4">
                    {/* Header con nombre y estado */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h3 className="text-base font-semibold text-gray-900 m-0">
                            {item.compliance_items?.nombre || 'N/A'}
                          </h3>
                          <span
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: STATUS_COLORS[item.status] + '20',
                              color: STATUS_COLORS[item.status],
                            }}
                          >
                            {STATUS_LABELS[item.status]}
                          </span>
                        </div>
                        
                        {/* Información del cumplimiento */}
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Tipo:</span> {TIPO_LABELS[item.compliance_items?.tipo] || item.compliance_items?.tipo || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Emisión:</span> {formatDate(item.fecha_emision)}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Vencimiento:</span> {formatDate(item.fecha_vencimiento)}
                          </div>
                          <div className={`text-sm font-semibold ${
                            diasRestantes < 0 
                              ? 'text-red-600' 
                              : diasRestantes <= 30 
                              ? 'text-amber-600' 
                              : 'text-emerald-600'
                          }`}>
                            {diasRestantes < 0
                              ? `Vencido hace ${Math.abs(diasRestantes)} días`
                              : diasRestantes === 0
                              ? 'Vence hoy'
                              : `${diasRestantes} días restantes`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-200">
                      {item.evidencia_url && (
                        <a
                          href={item.evidencia_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <FaDownload size={14} />
                          Descargar Evidencia
                        </a>
                      )}
                      {item.status !== 'VIGENTE' && item.status !== 'EXENTO' && (
                        <button
                          onClick={() => handleFileSelect(item.id)}
                          disabled={uploading === item.id}
                          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            uploading === item.id
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <FaUpload size={14} />
                          {uploading === item.id ? 'Subiendo...' : 'Subir Evidencia'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
