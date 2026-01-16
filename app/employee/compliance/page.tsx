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
import '../employee-portal.css'

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
  EN_RENOVACION: '#3b82f6',
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

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Obtener empleado asociado
      const { data: employee } = await supabase
        .from('employees')
        .select('id, company_id')
        .eq('user_id', user.id)
        .single()

      if (!employee) {
        setLoading(false)
        return
      }

      // Cargar cumplimientos
      const complianceResponse = await fetch(
        `/api/compliance/worker?company_id=${employee.company_id}&employee_id=${employee.id}`
      )
      if (complianceResponse.ok) {
        const complianceData = await complianceResponse.json()
        setCompliance(complianceData)

        // Calcular estadísticas
        const stats = {
          vigentes: complianceData.filter((c: any) => c.status === 'VIGENTE').length,
          porVencer: complianceData.filter((c: any) => c.status === 'POR_VENCER').length,
          vencidos: complianceData.filter((c: any) => c.status === 'VENCIDO').length,
          enRenovacion: complianceData.filter((c: any) => c.status === 'EN_RENOVACION').length,
        }
        setStats(stats)
      }

      // Cargar notificaciones
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

      // Obtener usuario y empleado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const { data: employee } = await supabase
        .from('employees')
        .select('id, company_id')
        .eq('user_id', user.id)
        .single()

      if (!employee) throw new Error('Empleado no encontrado')

      // Subir archivo a Supabase Storage
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
        // Si el bucket no existe, crear una URL temporal o mostrar error
        console.error('Error subiendo archivo:', uploadError)
        alert('Error al subir archivo. El bucket de almacenamiento no está configurado.')
        return
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('compliance-evidence')
        .getPublicUrl(filePath)

      // Actualizar cumplimiento
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

      // Recargar datos
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
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Cargando cumplimientos...</div>
      </div>
    )
  }

  return (
    <div className="employee-portal-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          Mi Cumplimiento
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Gestiona tus certificados, licencias y cursos obligatorios
        </p>
      </div>

      {/* Notificaciones */}
      {notifications.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Notificaciones de Cumplimiento
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: '16px',
                  background: notification.prioridad === 'ALTA' ? '#fef2f2' : '#f9fafb',
                  border: `1px solid ${notification.prioridad === 'ALTA' ? '#fecaca' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
                onClick={() => markNotificationAsRead(notification.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: notification.prioridad === 'ALTA' ? '#991b1b' : '#111827' }}>
                      {notification.titulo}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      {notification.mensaje}
                    </div>
                    {notification.action_link && (
                      <a
                        href={notification.action_link}
                        style={{ fontSize: '14px', color: '#3b82f6', textDecoration: 'none' }}
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
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      fontSize: '20px',
                    }}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="quick-action-card" style={{ textAlign: 'center' }}>
          <FaCheckCircle className="quick-action-icon" style={{ fontSize: '36px', color: '#10b981' }} />
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Vigentes</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{stats.vigentes}</div>
        </div>
        <div className="quick-action-card" style={{ textAlign: 'center' }}>
          <FaClock className="quick-action-icon" style={{ fontSize: '36px', color: '#f59e0b' }} />
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Por Vencer</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>{stats.porVencer}</div>
        </div>
        <div className="quick-action-card" style={{ textAlign: 'center' }}>
          <FaTimesCircle className="quick-action-icon" style={{ fontSize: '36px', color: '#ef4444' }} />
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Vencidos</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>{stats.vencidos}</div>
        </div>
        <div className="quick-action-card" style={{ textAlign: 'center' }}>
          <FaFileUpload className="quick-action-icon" style={{ fontSize: '36px', color: '#3b82f6' }} />
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>En Renovación</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{stats.enRenovacion}</div>
        </div>
      </div>

      {/* Lista de cumplimientos */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
          Mis Cumplimientos
        </h2>
        {compliance.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No tienes cumplimientos registrados
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {compliance.map((item: any) => {
              const diasRestantes = Math.ceil(
                (new Date(item.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              )

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: item.status === 'VENCIDO' ? '#fef2f2' : item.status === 'POR_VENCER' ? '#fef3c7' : 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                          {item.compliance_items?.nombre || 'N/A'}
                        </h3>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            background: STATUS_COLORS[item.status] + '20',
                            color: STATUS_COLORS[item.status],
                            fontSize: '12px',
                            fontWeight: '500',
                          }}
                        >
                          {STATUS_LABELS[item.status]}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                        Tipo: {TIPO_LABELS[item.compliance_items?.tipo] || item.compliance_items?.tipo || 'N/A'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                        Emisión: {formatDate(item.fecha_emision)}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                        Vencimiento: {formatDate(item.fecha_vencimiento)}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: diasRestantes < 0 ? '#ef4444' : diasRestantes <= 30 ? '#f59e0b' : '#10b981' }}>
                        {diasRestantes < 0
                          ? `Vencido hace ${Math.abs(diasRestantes)} días`
                          : diasRestantes === 0
                          ? 'Vence hoy'
                          : `${diasRestantes} días restantes`}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {item.evidencia_url && (
                      <a
                        href={item.evidencia_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '8px 16px',
                          background: '#10b981',
                          color: 'white',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <FaDownload size={14} />
                        Descargar Evidencia
                      </a>
                    )}
                    {item.status !== 'VIGENTE' && item.status !== 'EXENTO' && (
                      <button
                        onClick={() => handleFileSelect(item.id)}
                        disabled={uploading === item.id}
                        style={{
                          padding: '8px 16px',
                          background: uploading === item.id ? '#9ca3af' : '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: uploading === item.id ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <FaUpload size={14} />
                        {uploading === item.id ? 'Subiendo...' : 'Subir Evidencia'}
                      </button>
                    )}
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

