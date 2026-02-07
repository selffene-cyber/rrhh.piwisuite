'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaQuestionCircle } from 'react-icons/fa'

export default function NewPermissionPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const { company: currentCompany } = useCurrentCompany()
  const [loading, setLoading] = useState(false)
  const [employee, setEmployee] = useState<any>(null)
  const [permissionTypes, setPermissionTypes] = useState<any[]>([])
  const [formData, setFormData] = useState({
    permission_type_code: '',
    reason: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    days: '',
    hours: '',
    notes: '',
  })
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
    if (currentCompany && params.id) {
      loadData()
    }
  }, [currentCompany, params.id])

  // Función para calcular fecha de término sumando días hábiles a una fecha de inicio
  // Excluye sábados, domingos y feriados legales
  const addBusinessDaysWithHolidays = async (startDate: Date, businessDays: number): Promise<Date> => {
    const result = new Date(startDate)
    let daysAdded = 0
    
    // Estimar un rango de fechas para obtener feriados (hasta 3 meses después como máximo)
    const estimatedEndDate = new Date(startDate)
    estimatedEndDate.setDate(estimatedEndDate.getDate() + (businessDays * 2)) // Estimación: días hábiles * 2 para cubrir fines de semana
    
    // Obtener feriados en el rango estimado
    const startStr = startDate.toISOString().split('T')[0]
    const endStr = estimatedEndDate.toISOString().split('T')[0]
    
    const { data: holidays } = await supabase
      .from('holidays')
      .select('date')
      .gte('date', startStr)
      .lte('date', endStr)
    
    const holidayDates = new Set(holidays?.map((h: any) => h.date) || [])
    
    while (daysAdded < businessDays) {
      result.setDate(result.getDate() + 1)
      const dayOfWeek = result.getDay()
      const dateStr = result.toISOString().split('T')[0]
      
      // Solo contar días hábiles (lunes a viernes) que no sean feriados
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isHoliday = holidayDates.has(dateStr)
      
      if (!isWeekend && !isHoliday) {
        daysAdded++
      }
    }
    
    return result
  }

  useEffect(() => {
    // Calcular fecha de término automáticamente cuando cambian fecha de inicio o días
    // Solo calcular si hay días ingresados y fecha de inicio
    if (formData.start_date && formData.days && formData.days.trim() !== '' && parseFloat(formData.days) > 0) {
      const start = new Date(formData.start_date + 'T00:00:00')
      const businessDays = parseFloat(formData.days)
      
      // Calcular fecha de término excluyendo sábados, domingos y feriados
      addBusinessDaysWithHolidays(start, businessDays).then((endDate) => {
        const endDateStr = endDate.toISOString().split('T')[0]
        
        // Solo actualizar si es diferente para evitar loops
        if (formData.end_date !== endDateStr) {
          setFormData(prev => ({ ...prev, end_date: endDateStr }))
        }
      }).catch((error) => {
        console.error('Error al calcular fecha de término:', error)
      })
    } else if (formData.days === '' || parseFloat(formData.days) <= 0) {
      // Si no hay días o son 0, limpiar fecha de término
      if (formData.end_date !== '') {
        setFormData(prev => ({ ...prev, end_date: '' }))
      }
    }
  }, [formData.start_date, formData.days])

  const loadData = async () => {
    if (!currentCompany) return

    try {
      // Cargar trabajador
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, rut')
        .eq('id', params.id)
        .single()

      setEmployee(empData)

      // Cargar tipos de permisos
      const response = await fetch('/api/permission-types')
      const types = await response.json()
      setPermissionTypes(types)
    } catch (error: any) {
      console.error('Error al cargar datos:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCompany) return

    setLoading(true)

    try {
      const days = parseFloat(formData.days)
      if (!days || days <= 0) {
        alert('Debe ingresar una cantidad de días mayor a 0')
        setLoading(false)
        return
      }

      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: currentCompany.id,
          employee_id: params.id,
          permission_type_code: formData.permission_type_code,
          reason: formData.reason,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days: days,
          hours: formData.hours ? parseInt(formData.hours) : null,
          notes: formData.notes || null,
          status: 'draft',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear permiso')
      }

      alert('Permiso creado correctamente')
      router.push(`/employees/${params.id}/permissions`)
    } catch (error: any) {
      alert('Error al crear permiso: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedType = permissionTypes.find(
    (t) => t.code === formData.permission_type_code
  )

  // Verificar el tipo de permiso seleccionado
  const isLegalWithPay = selectedType && selectedType.code === 'LEGAL_GOCE'
  const isVoluntaryWithPay = selectedType && selectedType.code === 'VOLUNTARY_GOCE'
  const showReasonDropdown = isLegalWithPay || isVoluntaryWithPay

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1>Nuevo Permiso - {employee?.full_name || 'Cargando...'}</h1>
        <Link href={`/employees/${params.id}/permissions`}>
          <button className="secondary">Volver</button>
        </Link>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tipo de Permiso *</label>
            <select
              required
              value={formData.permission_type_code}
              onChange={(e) =>
                setFormData({ ...formData, permission_type_code: e.target.value })
              }
            >
              <option value="">Seleccione un tipo</option>
              {permissionTypes.map((type) => (
                <option key={type.id} value={type.code}>
                  {type.label}
                  {type.affects_payroll ? ' (Sin goce de sueldo)' : ' (Con goce de sueldo)'}
                </option>
              ))}
            </select>
            {selectedType && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {selectedType.description}
                {selectedType.affects_payroll && (
                  <span style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                    ⚠️ Este permiso descuenta remuneración proporcional
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Motivo del Permiso *
              {isLegalWithPay && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <FaQuestionCircle
                    style={{ cursor: 'pointer', color: '#3b82f6', fontSize: '16px' }}
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
                placeholder="Ej: Asuntos personales, Trámites, etc."
              />
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha de Inicio *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Fecha de Término *</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                readOnly
                style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                title="Se calcula automáticamente según los días hábiles"
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Calculada automáticamente (días hábiles, excluye sábados, domingos y feriados legales)
              </p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Días Hábiles *</label>
              <input
                type="number"
                required
                min="0"
                step="0.5"
                value={formData.days}
                onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                placeholder="0"
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Ingrese la cantidad de días hábiles (excluye sábados, domingos y feriados legales)
              </p>
            </div>
            <div className="form-group">
              <label>Horas (opcional)</label>
              <input
                type="number"
                min="0"
                max="23"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notas (opcional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Información adicional sobre el permiso..."
            />
          </div>

          {selectedType && selectedType.affects_payroll && employee && (
            <div
              style={{
                padding: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontWeight: '500', color: '#991b1b', marginBottom: '4px' }}>
                Impacto en Liquidación
              </div>
              <div style={{ fontSize: '14px', color: '#7f1d1d' }}>
                Este permiso descontará:{' '}
                <strong>
                  ${Math.round((employee.base_salary / 30) * (parseFloat(formData.days) || 0)).toLocaleString('es-CL')}
                </strong>
                {' '}de la liquidación del trabajador
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear Permiso'}
            </button>
            <Link href={`/employees/${params.id}/permissions`}>
              <button type="button" className="secondary">
                Cancelar
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

