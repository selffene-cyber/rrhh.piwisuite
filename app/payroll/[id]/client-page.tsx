'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate, formatMonthYear, MONTHS } from '@/lib/utils/date'
import { formatCurrency, numberToWords } from '@/lib/services/payrollCalculator'
import { useRouter, usePathname } from 'next/navigation'
import { pdf } from '@react-pdf/renderer'
import { PayrollDocument } from '@/components/PayrollPDF'
import React from 'react'

export default function PayrollDetailClient({ initialSlip, company, vacations, advances, loanPayments }: { initialSlip: any, company: any, vacations?: any[] | null, advances?: any[], loanPayments?: any[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const [slip, setSlip] = useState(initialSlip)
  const [currentAdvances, setCurrentAdvances] = useState(advances || [])
  const [currentLoanPayments, setCurrentLoanPayments] = useState(loanPayments || [])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  // Recargar datos del servidor al montar el componente y cuando cambia la ruta
  useEffect(() => {
    const loadSlip = async () => {
      try {
        const { data: slipData, error } = await supabase
          .from('payroll_slips')
          .select(`
            *,
            employees (*),
            payroll_periods (*),
            payroll_items (*)
          `)
          .eq('id', initialSlip.id)
          .single()

        if (error) {
          console.error('Error al cargar liquidación:', error)
          return
        }

        if (slipData) {
          // Siempre actualizar con los datos más recientes del servidor
          if (slipData.status !== initialSlip.status) {
            console.log('Estado actualizado detectado:', slipData.status, 'anterior:', initialSlip.status)
          }
          setSlip(slipData)

          // Recargar anticipos
          const { data: advancesData, error: advancesError } = await supabase
            .from('advances')
            .select('*')
            .eq('payroll_slip_id', slipData.id)
            .order('advance_date', { ascending: true })

          if (advancesError) {
            console.error('Error al cargar anticipos:', advancesError)
          } else {
            setCurrentAdvances(advancesData || [])
          }

          // Recargar préstamos
          const { data: loanPaymentsData, error: loanPaymentsError } = await supabase
            .from('loan_payments')
            .select(`
              *,
              loans (*)
            `)
            .eq('payroll_slip_id', slipData.id)
            .order('installment_number', { ascending: true })

          if (loanPaymentsError) {
            console.error('Error al cargar préstamos:', loanPaymentsError)
          } else {
            setCurrentLoanPayments(loanPaymentsData || [])
          }
        }
      } catch (error) {
        console.error('Error al recargar liquidación:', error)
      }
    }

    loadSlip()
  }, [pathname, initialSlip.id, initialSlip.status]) // Recargar cuando cambia la ruta, ID o estado inicial

  const taxableItems = slip.payroll_items?.filter((item: any) => item.type === 'taxable_earning') || []
  const nonTaxableItems = slip.payroll_items?.filter((item: any) => item.type === 'non_taxable_earning') || []
  const legalDeductions = slip.payroll_items?.filter((item: any) => item.type === 'legal_deduction') || []
  const otherDeductions = slip.payroll_items?.filter((item: any) => item.type === 'other_deduction') || []

  const handleIssue = async () => {
    if (!confirm('¿Estás seguro de que deseas emitir esta liquidación? Una vez emitida, no podrá ser editada.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('payroll_slips')
        .update({
          status: 'issued',
          issued_at: new Date().toISOString(),
        })
        .eq('id', slip.id)

      if (error) {
        console.error('Error al actualizar liquidación:', error)
        throw error
      }

      // Registrar evento de auditoría
      try {
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: company?.id,
            employeeId: slip.employee_id,
            source: 'admin_dashboard',
            actionType: 'payroll.issued',
            module: 'payroll',
            entityType: 'payroll_slips',
            entityId: slip.id,
            status: 'success',
            beforeData: { status: slip.status },
            afterData: { status: 'issued', issued_at: new Date().toISOString() },
            metadata: {
              period_id: slip.period_id,
              net_pay: slip.net_pay,
            },
          }),
        }).catch((err) => console.error('Error al registrar auditoría:', err))
      } catch (auditError) {
        console.error('Error al registrar auditoría:', auditError)
      }

      // Esperar un momento para asegurar que la actualización se complete
      await new Promise(resolve => setTimeout(resolve, 300))

      // Recargar los datos desde la base de datos
      const { data: updatedSlip, error: fetchError } = await supabase
        .from('payroll_slips')
        .select(`
          *,
          employees (*),
          payroll_periods (*),
          payroll_items (*)
        `)
        .eq('id', slip.id)
        .single()

      if (fetchError) {
        console.error('Error al obtener liquidación actualizada:', fetchError)
      }

      if (updatedSlip) {
        console.log('Liquidación actualizada:', updatedSlip.status)
        setSlip(updatedSlip)
        
        // Generar y guardar el PDF automáticamente
        try {
          console.log('[handleIssue] Iniciando generación de PDF...')
          console.log('[handleIssue] Datos del slip:', {
            id: updatedSlip.id,
            payroll_items_count: updatedSlip.payroll_items?.length || 0,
            vacations_count: vacations?.length || 0,
            loanPayments_count: loanPayments?.length || 0,
            advances_count: advances?.length || 0
          })

          // Generar nombre del archivo
          const generateFileName = () => {
            const rut = updatedSlip.employees?.rut || 'SIN-RUT'
            const month = updatedSlip.payroll_periods?.month || new Date().getMonth() + 1
            const year = updatedSlip.payroll_periods?.year || new Date().getFullYear()
            const monthAbbr = MONTHS[month - 1]?.substring(0, 3) || 'XXX'
            return `LIQUIDACIÓN-${rut}-${monthAbbr}-${year}`
          }

          console.log('[handleIssue] Generando PDF blob...')
          // Generar PDF usando @react-pdf/renderer
          const pdfDoc = pdf(
            React.createElement(PayrollDocument, {
              slip: updatedSlip,
              company,
              vacations: vacations || [],
              loanPayments: loanPayments || [],
              advances: advances || [],
              generateFileName
            })
          )

          // Convertir a blob
          const blob = await pdfDoc.toBlob()
          console.log('[handleIssue] PDF blob generado, tamaño:', blob.size, 'bytes')
          
          // Enviar PDF a la API para guardarlo
          const formData = new FormData()
          formData.append('pdf', blob, `${generateFileName()}.pdf`)

          console.log('[handleIssue] Enviando PDF a API...')
          const pdfResponse = await fetch(`/api/payroll/${slip.id}/generate-pdf`, {
            method: 'POST',
            body: formData
          })

          console.log('[handleIssue] Respuesta de API:', pdfResponse.status, pdfResponse.ok)

          if (!pdfResponse.ok) {
            const errorData = await pdfResponse.json()
            console.error('[handleIssue] Error al guardar PDF:', errorData)
            // No fallar la emisión si falla el guardado del PDF
            alert(`Error al guardar PDF: ${errorData.error || 'Error desconocido'}. Revisa la consola para más detalles.`)
          } else {
            const responseData = await pdfResponse.json()
            console.log('[handleIssue] Respuesta completa:', responseData)
            const { pdf_url } = responseData
            
            if (!pdf_url) {
              console.error('[handleIssue] No se recibió pdf_url en la respuesta')
              alert('Error: No se recibió la URL del PDF guardado. Revisa la consola.')
              return
            }

            console.log('[handleIssue] PDF guardado correctamente, URL:', pdf_url)
            
            // Actualizar la liquidación con el pdf_url
            const { error: updateError } = await supabase
              .from('payroll_slips')
              .update({ pdf_url })
              .eq('id', slip.id)

            if (updateError) {
              console.error('[handleIssue] Error al actualizar pdf_url en BD:', updateError)
              alert(`PDF guardado en storage pero error al actualizar BD: ${updateError.message}`)
            } else {
              console.log('[handleIssue] pdf_url actualizado correctamente en BD')
            }
          }
        } catch (pdfError: any) {
          console.error('[handleIssue] Error al generar/guardar PDF:', pdfError)
          console.error('[handleIssue] Error stack:', pdfError.stack)
          // No fallar la emisión si falla la generación del PDF
          alert(`Error al generar PDF: ${pdfError.message || 'Error desconocido'}. Revisa la consola para más detalles.`)
        }

        alert('Liquidación emitida correctamente')
        // Recargar la página para asegurar que se vea el cambio actualizado
        window.location.reload()
      } else {
        // Si no se obtuvo el slip actualizado, recargar desde el servidor
        alert('Liquidación emitida correctamente. Recargando...')
        window.location.reload()
      }
    } catch (error: any) {
      alert('Error al emitir liquidación: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!slip.employees?.email) {
      alert('El trabajador no tiene correo electrónico registrado')
      return
    }

    if (!confirm(`¿Enviar liquidación por correo a ${slip.employees.email}?`)) {
      return
    }

    setSending(true)
    try {
      // TODO: Implementar envío de correo
      // Por ahora solo actualizamos el estado
      const { error } = await supabase
        .from('payroll_slips')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', slip.id)

      if (error) throw error

      // Recargar los datos
      const { data: updatedSlip } = await supabase
        .from('payroll_slips')
        .select(`
          *,
          employees (*),
          payroll_periods (*),
          payroll_items (*)
        `)
        .eq('id', slip.id)
        .single()

      if (updatedSlip) {
        setSlip(updatedSlip)
      }

      alert('Liquidación marcada como enviada. (Funcionalidad de envío por correo pendiente de implementar)')
      // Recargar la página para asegurar que se vea el cambio actualizado
      window.location.reload()
    } catch (error: any) {
      alert('Error al marcar como enviada: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Liquidación de Sueldo</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/payroll/${slip.id}/edit`}>
            <button style={{
              background: '#f59e0b',
              color: 'white',
              border: '1px solid #f59e0b'
            }}>
              Editar
            </button>
          </Link>
          {slip.status === 'draft' && (
            <button onClick={handleIssue} disabled={loading}>
              {loading ? 'Emitiendo...' : 'Emitir Liquidación'}
            </button>
          )}
          {(slip.status === 'issued' || slip.status === 'sent') && (
            <button onClick={handleSendEmail} disabled={sending || !slip.employees?.email}>
              {sending ? 'Enviando...' : 'Enviar por Correo'}
            </button>
          )}
          <Link href={`/payroll/${slip.id}/pdf`} target="_blank">
            <button>Ver PDF</button>
          </Link>
          <Link href="/payroll">
            <button className="secondary">Volver</button>
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Datos del Trabajador</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Nombre</label>
            <p>{slip.employees?.full_name}</p>
          </div>
          <div className="form-group">
            <label>RUT</label>
            <p>{slip.employees?.rut}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Cargo</label>
            <p>{slip.employees?.position}</p>
          </div>
          <div className="form-group">
            <label>AFP</label>
            <p>{slip.employees?.afp}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Sistema de Salud</label>
            <p>
              {slip.employees?.health_system} 
              {slip.employees?.health_plan ? ` - ${slip.employees.health_plan}` : ''}
              {slip.employees?.health_system === 'ISAPRE' && slip.employees?.health_plan_percentage 
                ? ` (${slip.employees.health_plan_percentage} UF)` 
                : ''}
            </p>
          </div>
          <div className="form-group">
            <label>Fecha de Ingreso</label>
            <p>{slip.employees?.hire_date ? formatDate(slip.employees.hire_date) : '-'}</p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Período</label>
            <p>
              {slip.payroll_periods ? 
                formatMonthYear(slip.payroll_periods.year, slip.payroll_periods.month) : 
                '-'
              }
            </p>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <p>
              <span className={`badge ${slip.status}`}>
                {slip.status === 'draft' ? 'Borrador' : slip.status === 'issued' ? 'Emitida' : 'Enviada'}
              </span>
              {slip.issued_at && (
                <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
                  Emitida: {formatDate(slip.issued_at)}
                </small>
              )}
              {slip.sent_at && (
                <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
                  Enviada: {formatDate(slip.sent_at)}
                </small>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Datos Base</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Días Trabajados</label>
            <p>{slip.days_worked}</p>
          </div>
          <div className="form-group">
            <label>Días de Licencia Médica</label>
            <p>{slip.days_leave || 0}</p>
          </div>
        </div>
        {vacations && vacations.length > 0 && (
          <div className="form-row" style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label>Días de Vacaciones en el Período</label>
              <p style={{ color: '#0369a1', fontWeight: 'bold' }}>
                {vacations.reduce((sum: number, v: any) => {
                  const periodStart = new Date(slip.payroll_periods.year, slip.payroll_periods.month - 1, 1)
                  const periodEnd = new Date(slip.payroll_periods.year, slip.payroll_periods.month, 0)
                  const vacStart = new Date(v.start_date)
                  const vacEnd = new Date(v.end_date)
                  const overlapStart = vacStart > periodStart ? vacStart : periodStart
                  const overlapEnd = vacEnd < periodEnd ? vacEnd : periodEnd
                  if (overlapStart <= overlapEnd) {
                    const diffTime = overlapEnd.getTime() - overlapStart.getTime()
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                    return sum + diffDays
                  }
                  return sum
                }, 0)} días
              </p>
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Las vacaciones se pagan como días normales (no se descuentan del sueldo)
              </small>
            </div>
          </div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label>Sueldo Base</label>
            <p>${slip.base_salary.toLocaleString('es-CL')}</p>
          </div>
          <div className="form-group">
            <label>Base Imponible</label>
            <p>${slip.taxable_base.toLocaleString('es-CL')}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        <div className="card">
          <h2>Haberes</h2>
          <h3>Haberes Imponibles</h3>
          <table>
            <tbody>
              {taxableItems.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: 'right' }}>${item.amount.toLocaleString('es-CL')}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', borderTop: '2px solid #111827' }}>
                <td>Total Haberes Imponibles</td>
                <td style={{ textAlign: 'right' }}>${slip.total_taxable_earnings.toLocaleString('es-CL')}</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ marginTop: '24px' }}>Haberes No Imponibles</h3>
          <table>
            <tbody>
              {nonTaxableItems.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: 'right' }}>${item.amount.toLocaleString('es-CL')}</td>
                </tr>
              ))}
              {nonTaxableItems.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', color: '#6b7280' }}>No hay haberes no imponibles</td>
                </tr>
              )}
              <tr style={{ fontWeight: 'bold', borderTop: '2px solid #111827' }}>
                <td>Total Haberes No Imponibles</td>
                <td style={{ textAlign: 'right' }}>${slip.total_non_taxable_earnings.toLocaleString('es-CL')}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <strong>Total Haberes: ${slip.total_earnings.toLocaleString('es-CL')}</strong>
          </div>
        </div>

        <div className="card">
          <h2>Descuentos</h2>
          <h3>Descuentos Legales</h3>
          <table>
            <tbody>
              {legalDeductions.length > 0 ? (
                <>
                  {legalDeductions.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td style={{ textAlign: 'right' }}>${item.amount.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </>
              ) : (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', color: '#6b7280', padding: '16px' }}>
                    No hay ítems de descuentos legales guardados. Esta liquidación fue creada antes de los cambios recientes.
                  </td>
                </tr>
              )}
              <tr style={{ fontWeight: 'bold', borderTop: '2px solid #111827' }}>
                <td>Total Descuentos Legales</td>
                <td style={{ textAlign: 'right' }}>${slip.total_legal_deductions.toLocaleString('es-CL')}</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ marginTop: '24px' }}>Otros Descuentos</h3>
          <table>
            <tbody>
              {otherDeductions.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: 'right' }}>${item.amount.toLocaleString('es-CL')}</td>
                </tr>
              ))}
              {/* Mostrar anticipos descontados con detalle expandible */}
              {currentAdvances && currentAdvances.length > 0 && (
                <>
                  <tr>
                    <td colSpan={2} style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                      <details style={{ cursor: 'pointer' }}>
                        <summary style={{ fontWeight: '600', padding: '4px 0' }}>
                          Anticipos ${currentAdvances.reduce((sum, adv) => sum + Number(adv.amount), 0).toLocaleString('es-CL')}
                        </summary>
                        <div style={{ marginTop: '8px', paddingLeft: '16px' }}>
                          {currentAdvances.map((advance) => (
                            <div key={advance.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', color: '#6b7280' }}>
                              <span>
                                {formatDate(advance.advance_date)} - {advance.advance_number || `Anticipo #${advance.id.substring(0, 8).toUpperCase()}`}
                              </span>
                              <span style={{ fontWeight: '600' }}>
                                ${Number(advance.amount).toLocaleString('es-CL')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </td>
                  </tr>
                </>
              )}
              {/* Mostrar préstamos descontados con detalle expandible */}
              {currentLoanPayments && currentLoanPayments.length > 0 && (
                <>
                  <tr>
                    <td colSpan={2} style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                      <details style={{ cursor: 'pointer' }}>
                        <summary style={{ fontWeight: '600', padding: '4px 0' }}>
                          Préstamos ${currentLoanPayments.reduce((sum, lp) => sum + Number(lp.amount), 0).toLocaleString('es-CL')}
                        </summary>
                        <div style={{ marginTop: '8px', paddingLeft: '16px' }}>
                          {currentLoanPayments.map((loanPayment) => {
                            const loan = loanPayment.loans
                            return (
                              <div key={loanPayment.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', color: '#6b7280' }}>
                                <span>
                                  {loan?.loan_number || 'PT-XX'} - Cuota {loanPayment.installment_number} / {loan?.installments || 0}
                                </span>
                                <span style={{ fontWeight: '600' }}>
                                  ${Number(loanPayment.amount).toLocaleString('es-CL')}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </details>
                    </td>
                  </tr>
                </>
              )}
              {otherDeductions.length === 0 && (!currentAdvances || currentAdvances.length === 0) && (!currentLoanPayments || currentLoanPayments.length === 0) && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', color: '#6b7280' }}>No hay otros descuentos</td>
                </tr>
              )}
              <tr style={{ fontWeight: 'bold', borderTop: '2px solid #111827' }}>
                <td>Total Otros Descuentos</td>
                <td style={{ textAlign: 'right' }}>${slip.total_other_deductions.toLocaleString('es-CL')}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <strong>Total Descuentos: ${slip.total_deductions.toLocaleString('es-CL')}</strong>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ padding: '24px', background: '#eff6ff', border: '2px solid #2563eb' }}>
          <h2 style={{ marginBottom: '8px' }}>Líquido a Pagar</h2>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb' }}>
            ${slip.net_pay.toLocaleString('es-CL')}
          </p>
          <p style={{ marginTop: '8px', color: '#1e40af' }}>
            SON: {numberToWords(Math.round(slip.net_pay))} PESOS
          </p>
        </div>
      </div>
    </div>
  )
}

