'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import DateInput from '@/components/DateInput'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { generateAnnexClauseText, generateAnnexTextFromClauses, serializeAnnexClauses } from '@/lib/utils/annexClauses'

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

export default function NewAnnexPage() {
  const { companyId } = useCurrentCompany()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contracts, setContracts] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [selectedContract, setSelectedContract] = useState<any>(null)

  const [formData, setFormData] = useState({
    contract_id: searchParams?.get('contract_id') || '',
    employee_id: '',
    annex_type: 'modificacion_sueldo',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    content: '',
    modifications_summary: '',
    // Cláusulas individuales (1-6)
    clause_1: '',
    clause_2: '',
    clause_3: '',
    clause_4: '',
    clause_5: '',
    clause_6: '',
    // Estados de activación de cláusulas
    clause_1_enabled: true,
    clause_2_enabled: true,
    clause_3_enabled: true,
    clause_4_enabled: true,
    clause_5_enabled: true,
    clause_6_enabled: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (formData.contract_id) {
      loadContractData()
    }
  }, [formData.contract_id])

  const loadData = async () => {
    try {
      // Cargar contratos
      const { data: contractsData } = await supabase
        .from('contracts')
        .select('*, employees (*)')
        .order('created_at', { ascending: false })

      setContracts(contractsData || [])

      // Cargar empleados de la empresa
      if (!companyId) {
        setEmployees([])
        return
      }
      
      const { data: employeesData } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .order('full_name')

      setEmployees(employeesData || [])

      // Cargar empresa
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      setCompany(companyData)
    } catch (error: any) {
      alert('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadContractData = () => {
    const contract = contracts.find((c) => c.id === formData.contract_id)
    if (contract) {
      setSelectedContract(contract)
      setFormData((prev) => ({
        ...prev,
        employee_id: contract.employee_id,
      }))
      // Generar cláusulas iniciales basadas en el contrato
      generateInitialClauses(contract)
    }
  }

  // Función para generar el texto de cada cláusula
  const generateClauseText = (clauseNumber: number): string => {
    if (!selectedContract) return ''
    return generateAnnexClauseText(clauseNumber, formData, selectedContract, selectedContract.employees, company)
  }

  // Generar cláusulas iniciales cuando se carga el contrato
  const generateInitialClauses = (contract: any) => {
    if (!contract || !company) return
    const clauses: any = {}
    for (let i = 1; i <= 6; i++) {
      const clauseKey = `clause_${i}` as keyof typeof formData
      clauses[clauseKey] = generateAnnexClauseText(i, formData, contract, contract.employees, company)
    }
    setFormData((prev) => ({ ...prev, ...clauses }))
  }

  // Efecto para regenerar cláusulas cuando cambian datos relevantes
  useEffect(() => {
    if (selectedContract && company && formData.start_date) {
      const clauses: any = {}
      let hasEmptyClause = false
      for (let i = 1; i <= 6; i++) {
        const clauseKey = `clause_${i}` as keyof typeof formData
        // Solo regenerar si la cláusula está vacía
        if (!formData[clauseKey] || formData[clauseKey] === '') {
          clauses[clauseKey] = generateAnnexClauseText(i, formData, selectedContract, selectedContract.employees, company)
          hasEmptyClause = true
        }
      }
      if (hasEmptyClause && Object.keys(clauses).length > 0) {
        setFormData((prev) => ({ ...prev, ...clauses }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContract?.id, formData.start_date, formData.end_date, formData.modifications_summary, formData.annex_type, company?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.contract_id || !formData.employee_id) {
        alert('Por favor selecciona un contrato y trabajador')
        return
      }

      // Generar contenido completo desde las cláusulas
      const clausesData = {
        clause_1: formData.clause_1,
        clause_2: formData.clause_2,
        clause_3: formData.clause_3,
        clause_4: formData.clause_4,
        clause_5: formData.clause_5,
        clause_6: formData.clause_6,
        clause_1_enabled: formData.clause_1_enabled,
        clause_2_enabled: formData.clause_2_enabled,
        clause_3_enabled: formData.clause_3_enabled,
        clause_4_enabled: formData.clause_4_enabled,
        clause_5_enabled: formData.clause_5_enabled,
        clause_6_enabled: formData.clause_6_enabled,
      }

      // Generar texto completo del anexo usando las cláusulas
      const fullContent = generateAnnexTextFromClauses(clausesData, formData, selectedContract, selectedContract?.employees, company)
      
      // Almacenar tanto el contenido completo como las cláusulas en formato JSON
      const contentWithClauses = serializeAnnexClauses(clausesData)

      if (!companyId) {
        alert('No se pudo determinar la empresa. Por favor, selecciona una empresa.')
        setSaving(false)
        return
      }

      const annexData: any = {
        contract_id: formData.contract_id,
        employee_id: formData.employee_id,
        company_id: companyId,
        annex_type: formData.annex_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        content: contentWithClauses, // Almacenar cláusulas en JSON
        modifications_summary: formData.modifications_summary || null,
        status: 'draft',
      }

      const { data, error } = await supabase
        .from('contract_annexes')
        .insert(annexData)
        .select()
        .single()

      if (error) throw error

      alert('Anexo creado correctamente')
      router.push(`/contracts/annex/${data.id}`)
    } catch (error: any) {
      console.error('Error al crear anexo:', error)
      alert('Error al crear anexo: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1>Nuevo Anexo</h1>
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Nuevo Anexo de Contrato</h1>
        <button className="secondary" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>1. Selección de Contrato</h2>
          <div className="form-group">
            <label>Contrato Base *</label>
            <select
              value={formData.contract_id}
              onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
              required
            >
              <option value="">Selecciona un contrato</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.contract_number} - {contract.employees?.full_name || 'N/A'} ({contract.employees?.rut || 'N/A'})
                </option>
              ))}
            </select>
            {selectedContract && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                <p style={{ margin: '4px 0' }}><strong>Contrato:</strong> {selectedContract.contract_number}</p>
                <p style={{ margin: '4px 0' }}><strong>Trabajador:</strong> {selectedContract.employees?.full_name}</p>
                <p style={{ margin: '4px 0' }}><strong>Tipo:</strong> {selectedContract.contract_type}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>2. Tipo de Anexo y Fechas</h2>
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
          <h2>3. Resumen de Modificaciones</h2>
          <div className="form-group">
            <label>Resumen de Modificaciones</label>
            <textarea
              value={formData.modifications_summary}
              onChange={(e) => setFormData({ ...formData, modifications_summary: e.target.value })}
              rows={3}
              placeholder="Resumen breve de las modificaciones..."
            />
          </div>
        </div>

        {/* Cláusulas del Anexo */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>4. Cláusulas del Anexo</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
            Las cláusulas se generan automáticamente basándose en los datos ingresados. Puedes editarlas individualmente y activar o desactivar las que necesites.
          </p>
          
          {[
            { num: 1, title: 'PRIMERO', label: 'Identificación y Contrato Base', key: 'clause_1' as const, enabledKey: 'clause_1_enabled' as const },
            { num: 2, title: 'SEGUNDO', label: 'Vigencia', key: 'clause_2' as const, enabledKey: 'clause_2_enabled' as const },
            { num: 3, title: 'TERCERO', label: 'Resumen de Modificaciones', key: 'clause_3' as const, enabledKey: 'clause_3_enabled' as const },
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
            {saving ? 'Guardando...' : 'Guardar Anexo'}
          </button>
          <button type="button" className="secondary" onClick={() => router.back()}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}


