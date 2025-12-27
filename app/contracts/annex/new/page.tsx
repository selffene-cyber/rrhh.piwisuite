'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import DateInput from '@/components/DateInput'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'

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
        .in('status', ['active', 'signed'])
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
        .eq('status', 'active')
        .eq('company_id', companyId)
        .order('full_name')

      setEmployees(employeesData || [])

      // Cargar empresa
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
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
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.contract_id || !formData.employee_id) {
        alert('Por favor selecciona un contrato y trabajador')
        return
      }

      if (!formData.content) {
        alert('Por favor completa el contenido del anexo')
        return
      }

      const annexData: any = {
        contract_id: formData.contract_id,
        employee_id: formData.employee_id,
        company_id: company?.id,
        annex_type: formData.annex_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        content: formData.content,
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
          <h2>3. Contenido del Anexo</h2>
          <div className="form-group">
            <label>Resumen de Modificaciones</label>
            <textarea
              value={formData.modifications_summary}
              onChange={(e) => setFormData({ ...formData, modifications_summary: e.target.value })}
              rows={3}
              placeholder="Resumen breve de las modificaciones..."
            />
          </div>
          <div className="form-group">
            <label>Contenido Completo del Anexo *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
              placeholder="Describe detalladamente las modificaciones al contrato..."
              required
            />
          </div>
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


