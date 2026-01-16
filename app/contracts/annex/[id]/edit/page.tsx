'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import DateInput from '@/components/DateInput'
import { generateAnnexClauseText, generateAnnexTextFromClauses, serializeAnnexClauses, parseAnnexContent } from '@/lib/utils/annexClauses'

// Componente ToggleSwitch simple
const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onChange(!checked)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            e.stopPropagation()
            onChange(e.target.checked)
          }}
          onClick={(e) => {
            e.stopPropagation()
          }}
          style={{ display: 'none' }}
        />
        <div
          style={{
            width: '48px',
            height: '24px',
            borderRadius: '12px',
            background: checked ? '#3b82f6' : '#d1d5db',
            position: 'relative',
            transition: 'background 0.2s',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onClick={handleToggle}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '2px',
              left: checked ? '26px' : '2px',
              transition: 'left 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
            }}
          />
        </div>
        {label && <span style={{ marginLeft: '8px', fontSize: '14px' }}>{label}</span>}
      </div>
    </div>
  )
}

export default function EditAnnexPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [annex, setAnnex] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)

  const [formData, setFormData] = useState({
    annex_type: 'modificacion_sueldo',
    start_date: '',
    end_date: '',
    content: '',
    modifications_summary: '',
    // Cláusulas individuales (1-6, sin TERCERO)
    clause_1: '',
    clause_2: '',
    clause_4: '',
    clause_5: '',
    clause_6: '',
    // Estados de activación de cláusulas
    clause_1_enabled: true,
    clause_2_enabled: true,
    clause_4_enabled: true,
    clause_5_enabled: true,
    clause_6_enabled: true,
  })

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      const { data: annexData, error: annexError } = await supabase
        .from('contract_annexes')
        .select(`
          *,
          contracts (*),
          employees (*),
          companies (*)
        `)
        .eq('id', params.id)
        .single()

      if (annexError) throw annexError

      setAnnex(annexData)
      setContract(annexData.contracts)
      setEmployee(annexData.employees)
      setCompany(annexData.companies)

      // Intentar parsear el contenido como JSON con cláusulas
      const parsed = parseAnnexContent(annexData.content || '')
      
      if (parsed.isJson && parsed.clauses) {
        // Cargar cláusulas desde JSON
        const clauses = parsed.clauses as any
        setFormData({
          annex_type: annexData.annex_type || 'modificacion_sueldo',
          start_date: annexData.start_date || '',
          end_date: annexData.end_date || '',
          content: '',
          modifications_summary: annexData.modifications_summary || '',
          clause_1: clauses.clause_1 || '',
          clause_2: clauses.clause_2 || '',
          clause_4: clauses.clause_4 || '',
          clause_5: clauses.clause_5 || '',
          clause_6: clauses.clause_6 || '',
          clause_1_enabled: clauses.clause_1_enabled !== undefined ? clauses.clause_1_enabled : true,
          clause_2_enabled: clauses.clause_2_enabled !== undefined ? clauses.clause_2_enabled : true,
          clause_4_enabled: clauses.clause_4_enabled !== undefined ? clauses.clause_4_enabled : true,
          clause_5_enabled: clauses.clause_5_enabled !== undefined ? clauses.clause_5_enabled : true,
          clause_6_enabled: clauses.clause_6_enabled !== undefined ? clauses.clause_6_enabled : true,
        })
      } else {
        // Formato legacy: generar cláusulas desde el contenido plano
        const clauses: any = {}
        // Generar cláusulas 1, 2, 4, 5, 6 (sin TERCERO)
        for (let i of [1, 2, 4, 5, 6]) {
          clauses[`clause_${i}`] = generateAnnexClauseText(i, annexData, annexData.contracts, annexData.employees, annexData.companies)
        }
        setFormData({
          annex_type: annexData.annex_type || 'modificacion_sueldo',
          start_date: annexData.start_date || '',
          end_date: annexData.end_date || '',
          content: '',
          modifications_summary: annexData.modifications_summary || '',
          clause_1: clauses.clause_1 || '',
          clause_2: clauses.clause_2 || '',
          clause_4: clauses.clause_4 || '',
          clause_5: clauses.clause_5 || '',
          clause_6: clauses.clause_6 || '',
          clause_1_enabled: true,
          clause_2_enabled: true,
          clause_4_enabled: true,
          clause_5_enabled: true,
          clause_6_enabled: true,
        })
      }
    } catch (error: any) {
      alert('Error al cargar anexo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Función para generar el texto de cada cláusula
  const generateClauseText = (clauseNumber: number): string => {
    if (!contract || !employee || !company) return ''
    return generateAnnexClauseText(clauseNumber, formData, contract, employee, company)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Generar contenido completo desde las cláusulas
      const clausesData = {
        clause_1: formData.clause_1,
        clause_2: formData.clause_2,
        clause_4: formData.clause_4,
        clause_5: formData.clause_5,
        clause_6: formData.clause_6,
        clause_1_enabled: formData.clause_1_enabled,
        clause_2_enabled: formData.clause_2_enabled,
        clause_4_enabled: formData.clause_4_enabled,
        clause_5_enabled: formData.clause_5_enabled,
        clause_6_enabled: formData.clause_6_enabled,
      }

      // Almacenar cláusulas en formato JSON
      const contentWithClauses = serializeAnnexClauses(clausesData)

      const updateData: any = {
        annex_type: formData.annex_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        content: contentWithClauses,
        modifications_summary: formData.modifications_summary || null,
      }

      // Obtener datos anteriores para auditoría
      const { data: oldAnnex } = await supabase
        .from('contract_annexes')
        .select('*')
        .eq('id', params.id)
        .single()

      const { error } = await supabase
        .from('contract_annexes')
        .update(updateData)
        .eq('id', params.id)

      if (error) throw error

      // Registrar evento de auditoría
      try {
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: oldAnnex?.company_id,
            employeeId: oldAnnex?.employee_id,
            source: 'admin_dashboard',
            actionType: 'annex.updated',
            module: 'annexes',
            entityType: 'contract_annexes',
            entityId: params.id,
            status: 'success',
            beforeData: {
              annex_type: oldAnnex?.annex_type,
              start_date: oldAnnex?.start_date,
              end_date: oldAnnex?.end_date,
            },
            afterData: {
              annex_type: updateData.annex_type,
              start_date: updateData.start_date,
              end_date: updateData.end_date,
            },
            metadata: {
              modifications_summary: updateData.modifications_summary,
            },
          }),
        }).catch((err) => console.error('Error al registrar auditoría:', err))
      } catch (auditError) {
        console.error('Error al registrar auditoría:', auditError)
      }

      alert('Anexo actualizado correctamente')
      router.push(`/contracts/annex/${params.id}`)
    } catch (error: any) {
      console.error('Error al actualizar anexo:', error)
      alert('Error al actualizar anexo: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1>Editar Anexo</h1>
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!annex) {
    return (
      <div>
        <h1>Anexo no encontrado</h1>
        <div className="card">
          <p>El anexo solicitado no existe.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Editar Anexo {annex.annex_number}</h1>
        <button className="secondary" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Tipo de Anexo y Fechas</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo de Anexo *</label>
              <select
                value={formData.annex_type}
                onChange={(e) => setFormData({ ...formData, annex_type: e.target.value })}
                required
              >
                <option value="modificacion_sueldo">Modificación de Sueldo</option>
                <option value="cambio_cargo">Cambio de Cargo</option>
                <option value="cambio_jornada">Cambio de Jornada</option>
                <option value="prorroga">Prórroga</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha de Inicio *</label>
              <DateInput
                value={formData.start_date}
                onChange={(value) => setFormData({ ...formData, start_date: value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha de Término (opcional)</label>
              <DateInput
                value={formData.end_date}
                onChange={(value) => setFormData({ ...formData, end_date: value })}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Resumen de Modificaciones</h2>
          <div className="form-group">
            <label>Resumen de Modificaciones</label>
            <textarea
              value={formData.modifications_summary}
              onChange={(e) => setFormData({ ...formData, modifications_summary: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        {/* Cláusulas del Anexo */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Cláusulas del Anexo</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
            Las cláusulas se generan automáticamente basándose en los datos ingresados. Puedes editarlas individualmente y activar o desactivar las que necesites.
          </p>
          
          {[
            { num: 1, title: 'PRIMERO', label: 'Identificación y Contrato Base', key: 'clause_1' as const, enabledKey: 'clause_1_enabled' as const },
            { num: 2, title: 'SEGUNDO', label: 'Vigencia', key: 'clause_2' as const, enabledKey: 'clause_2_enabled' as const },
            { num: 4, title: 'CUARTO', label: 'Contenido del Anexo', key: 'clause_4' as const, enabledKey: 'clause_4_enabled' as const },
            { num: 5, title: 'QUINTO', label: 'Continuidad del Contrato', key: 'clause_5' as const, enabledKey: 'clause_5_enabled' as const },
            { num: 6, title: 'SEXTO', label: 'Ejemplares', key: 'clause_6' as const, enabledKey: 'clause_6_enabled' as const },
          ].map((clause) => (
            <div key={clause.key} className="form-group" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {clause.title}: {clause.label}
                </label>
                <ToggleSwitch
                  checked={formData[clause.enabledKey]}
                  onChange={(checked) => setFormData({ ...formData, [clause.enabledKey]: checked })}
                />
              </div>
              <textarea
                value={formData[clause.key]}
                onChange={(e) => setFormData({ ...formData, [clause.key]: e.target.value })}
                rows={4}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: '14px' }}
                placeholder={`Texto de la cláusula ${clause.title}...`}
              />
              <button
                type="button"
                onClick={() => {
                  const regenerated = generateClauseText(clause.num)
                  setFormData({ ...formData, [clause.key]: regenerated })
                }}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#374151'
                }}
              >
                Regenerar Cláusula
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button type="button" className="secondary" onClick={() => router.back()}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}



