'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaArrowLeft, FaCalendarCheck, FaQuestionCircle } from 'react-icons/fa'
import '../../employee-portal.css'

interface PermissionType {
  code: string
  label: string
  description?: string
  affects_payroll: boolean
}

export default function RequestPermissionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [permissionTypes, setPermissionTypes] = useState<PermissionType[]>([])
  const [formData, setFormData] = useState({
    permission_type_code: '',
    reason: '',
    start_date: '',
    end_date: '',
    hours: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [daysCount, setDaysCount] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)

  // Opciones de permisos legales con goce de sueldo
  const legalPermissionReasons = [
    { value: 'fallecimiento_mascota', label: 'Fallecimiento Mascota (Ley Duque) - 1 día hábil', category: 'ley_duque' },
    { value: 'acompanamiento_hijo_grave', label: 'Acompañamiento Hijo Grave (Ley SANNA) - Según licencia', category: 'ley_sanna' },
    { value: 'fallecimiento_hijo', label: 'Fallecimiento Hijo(a) - 10 días corridos', category: 'duelos' },
    { value: 'fallecimiento_conyuge', label: 'Fallecimiento Cónyuge / Conviviente - 7 días corridos', category: 'duelos' },
    { value: 'fallecimiento_hijo_gestacion', label: 'Fallecimiento Hijo en Gestación - 7 días hábiles', category: 'duelos' },
    { value: 'fallecimiento_padre_madre_hermano', label: 'Fallecimiento Padre, Madre o Hermano - 4 días hábiles', category: 'duelos' },
    { value: 'matrimonio_auc', label: 'Matrimonio o Acuerdo Unión Civil - 5 días hábiles', category: 'matrimonio' },
    { value: 'nacimiento_hijo', label: 'Nacimiento de Hijo (Paternidad) - 5 días hábiles', category: 'paternidad' },
    { value: 'examenes_preventivos', label: 'Exámenes Preventivos (Salud) - 1/2 día anual', category: 'examenes' },
    { value: 'cargas_publicas', label: 'Cargas Públicas (Votar/Vocal) - Tiempo necesario', category: 'cargas' },
    { value: 'bomberos', label: 'Bomberos (Emergencias) - Tiempo necesario', category: 'bomberos' },
  ]

  // Opciones de permisos voluntarios con goce de sueldo
  const voluntaryPermissionReasons = [
    { value: 'asuntos_particulares', label: 'Asuntos Particulares' },
  ]

  // Información detallada para el tooltip
  const tooltipInfo: Record<string, { title: string; content: string }> = {
    duelos: {
      title: 'Duelos (Fallecimiento de familiares)',
      content: 'Documento: Certificado de Defunción del Registro Civil (original o digital).\n\nPlazo para usar: Inmediatamente ocurrido el deceso (los días comienzan a contar desde el fallecimiento).\n\nAviso: Inmediato al empleador por cualquier vía formal.\n\nDato Pro: En caso de hijos o cónyuges, tienes Fuero Laboral de 1 mes (no te pueden despedir sin autorización judicial).'
    },
    ley_duque: {
      title: 'Ley Duque (Mascotas)',
      content: 'Documento: Certificado de defunción emitido por un veterinario + Certificado de Inscripción en el Registro Nacional de Mascotas (Ley Cholito) a nombre del trabajador.\n\nPlazo para usar: Dentro de los 5 días hábiles siguientes al deceso.\n\nRegla de Oro: Es pagado, pero las horas son recuperables dentro de los 90 días siguientes.'
    },
    paternidad: {
      title: 'Nacimiento (Paternidad)',
      content: 'Documento: Certificado de Nacimiento del hijo (emitido por el Registro Civil).\n\nPlazo para usar: Tienes dos opciones:\n- Desde el momento del parto (días continuos).\n- Distribuirlos como quieras dentro del primer mes de vida del bebé.\n\nAviso: Se recomienda avisar la fecha probable de parto con antelación.'
    },
    matrimonio: {
      title: 'Matrimonio o Acuerdo de Unión Civil',
      content: 'Documento: Certificado de Matrimonio o de Acuerdo de Unión Civil.\n\nPlazo para usar: Puedes usarlos de forma continua, ya sea el día de la ceremonia y los días inmediatamente anteriores o posteriores.\n\nAviso: La ley exige avisar con 30 días de anticipación.'
    },
    ley_sanna: {
      title: 'Ley SANNA (Cuidado de hijos)',
      content: 'Documento: Licencia Médica Electrónica (LME) tipo "SANNA" otorgada por el médico tratante.\n\nRequisito: Tener al menos 8 cotizaciones en los últimos 24 meses (las 3 últimas deben ser continuas).\n\nPago: No lo paga el jefe, lo paga la Mutualidad o el ISL con cargo al seguro.'
    },
    examenes: {
      title: 'Exámenes Preventivos (Pap / Próstata / Mamografía)',
      content: 'Documento: Comprobante de atención médica o certificado de realización del examen.\n\nAviso: Debes avisar con una semana de anticipación.\n\nDuración: Medio día de permiso (incluye el tiempo de traslado).'
    },
    cargas: {
      title: 'Cargas Públicas (Votar/Vocal)',
      content: 'Duración: Tiempo necesario (mínimo 2 horas para ir a votar).\n\nCon goce de sueldo según Código del Trabajo.'
    },
    bomberos: {
      title: 'Bomberos (Emergencias)',
      content: 'Duración: Tiempo necesario.\n\nSolo para voluntarios activos en llamados de comandancia.\n\nCon goce de sueldo según Art. 66 ter del Código del Trabajo.'
    }
  }

  useEffect(() => {
    loadPermissionTypes()
  }, [])

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      calculateDays()
    } else {
      setDaysCount(0)
    }
  }, [formData.start_date, formData.end_date])

  const loadPermissionTypes = async () => {
    try {
      const response = await fetch('/api/employee/permission-types')
      if (response.ok) {
        const result = await response.json()
        setPermissionTypes(result.permissionTypes || [])
      }
    } catch (err) {
      console.error('Error al cargar tipos de permisos:', err)
    } finally {
      setLoadingTypes(false)
    }
  }

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) {
      setDaysCount(0)
      return
    }

    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)

    if (end < start) {
      setDaysCount(0)
      return
    }

    // Calcular días hábiles (excluyendo sábados y domingos)
    let count = 0
    const current = new Date(start)
    while (current <= end) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }

    setDaysCount(count || 1) // Mínimo 1 día
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.permission_type_code) {
        setError('Debe seleccionar un tipo de permiso')
        setLoading(false)
        return
      }

      if (!formData.reason.trim()) {
        setError('El motivo del permiso es requerido')
        setLoading(false)
        return
      }

      if (!formData.start_date || !formData.end_date) {
        setError('Debe seleccionar fechas de inicio y fin')
        setLoading(false)
        return
      }

      const response = await fetch('/api/employee/permissions/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permission_type_code: formData.permission_type_code,
          reason: formData.reason,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days: daysCount,
          hours: formData.hours ? parseInt(formData.hours) : 0,
          notes: formData.notes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error al crear la solicitud')
        setLoading(false)
        return
      }

      alert('Solicitud de permiso creada exitosamente. Será revisada por un administrador.')
      router.push('/employee/requests')
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud')
      setLoading(false)
    }
  }

  // Obtener fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0]

  // Verificar el tipo de permiso seleccionado
  const selectedType = permissionTypes.find(
    (t) => t.code === formData.permission_type_code
  )
  const isLegalWithPay = selectedType && selectedType.code === 'LEGAL_GOCE'
  const isVoluntaryWithPay = selectedType && selectedType.code === 'VOLUNTARY_GOCE'
  const showReasonDropdown = isLegalWithPay || isVoluntaryWithPay

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }} className="fade-in-up">
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/employee"
          className="back-button-icon"
          style={{ marginBottom: '16px' }}
        >
          <FaArrowLeft />
        </Link>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaCalendarCheck style={{ color: '#4F46E5' }} /> Solicitar Permiso
        </h1>
      </div>

      <div className="form-container">
        {error && (
          <div className="error-message" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {loadingTypes ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Cargando tipos de permisos...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Tipo de Permiso *
              </label>
              <select
                required
                value={formData.permission_type_code}
                onChange={(e) => setFormData({ ...formData, permission_type_code: e.target.value })}
                className="form-input"
              >
                <option value="">Seleccione un tipo</option>
                {permissionTypes.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label} {type.affects_payroll ? '(sin goce)' : '(con goce)'}
                  </option>
                ))}
              </select>
              {formData.permission_type_code && (
                <small style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                  {permissionTypes.find(t => t.code === formData.permission_type_code)?.description}
                </small>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Motivo del Permiso *
                {isLegalWithPay && (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <FaQuestionCircle
                      style={{ cursor: 'pointer', color: '#4F46E5', fontSize: '16px' }}
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                    />
                    {showTooltip && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '0',
                          marginTop: '8px',
                          width: '450px',
                          maxWidth: '90vw',
                          maxHeight: '70vh',
                          padding: '16px',
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          zIndex: 1000,
                          fontSize: '13px',
                          lineHeight: '1.6',
                          color: '#374151',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                        }}
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '12px', color: '#111827', fontSize: '14px', position: 'sticky', top: 0, background: '#fff', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
                          Información sobre Permisos Legales con Goce de Sueldo
                        </div>
                        <div style={{ maxHeight: 'calc(70vh - 80px)', overflowY: 'auto', paddingTop: '8px' }}>
                          {formData.reason && (() => {
                            const selectedReason = legalPermissionReasons.find(r => r.value === formData.reason)
                            if (selectedReason && tooltipInfo[selectedReason.category]) {
                              const info = tooltipInfo[selectedReason.category]
                              return (
                                <div>
                                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                                    {info.title}
                                  </div>
                                  <div style={{ whiteSpace: 'pre-line', color: '#4b5563' }}>
                                    {info.content}
                                  </div>
                                </div>
                              )
                            }
                            return null
                          })()}
                          {(!formData.reason || !legalPermissionReasons.find(r => r.value === formData.reason)) && (
                            <div>
                              <div style={{ marginBottom: '12px', fontWeight: '500', color: '#1f2937' }}>
                                Selecciona un motivo para ver información detallada:
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.entries(tooltipInfo).map(([key, info]) => (
                                  <div key={key} style={{ padding: '8px', background: '#f9fafb', borderRadius: '4px' }}>
                                    <div style={{ fontWeight: '500', marginBottom: '4px', fontSize: '12px' }}>
                                      {info.title}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'pre-line' }}>
                                      {info.content.split('\n').slice(0, 2).join('\n')}...
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </label>
              {showReasonDropdown ? (
                <select
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="form-input"
                >
                  <option value="">Seleccione un motivo</option>
                  {isLegalWithPay && legalPermissionReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                  {isVoluntaryWithPay && voluntaryPermissionReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Ej: Trámite personal, consulta médica, etc."
                  className="form-input"
                />
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Fecha de Inicio *
              </label>
              <input
                type="date"
                required
                min={today}
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Fecha de Fin *
              </label>
              <input
                type="date"
                required
                min={formData.start_date || today}
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="form-input"
              />
            </div>

            {daysCount > 0 && (
              <div className="info-card" style={{ marginBottom: '20px' }}>
                Días hábiles calculados: <strong>{daysCount}</strong>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Horas (opcional)
              </label>
              <input
                type="number"
                min="0"
                max="8"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="Si el permiso es por horas"
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                Notas (opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Información adicional sobre el permiso..."
                rows={4}
                className="form-input"
                style={{ fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => router.back()}
                className="form-button-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || daysCount <= 0}
                className="form-button-primary"
              >
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

