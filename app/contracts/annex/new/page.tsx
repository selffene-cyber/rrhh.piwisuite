'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import DateInput from '@/components/DateInput'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { generateAnnexClauseText, generateAnnexTextFromClauses, serializeAnnexClauses } from '@/lib/utils/annexClauses'
import { ANNEX_CONCEPTS, getConceptById, type AnnexConcept } from '@/lib/services/annexConcepts'
import { generateConceptClauseText, getFieldsForConcepts } from '@/lib/utils/annexConceptClauses'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'

const AVAILABLE_BONUSES = [
  'Bono de Producción',
  'Bono de Cumplimiento de Metas / KPI',
  'Bono de Desempeño',
  'Bono de Asistencia',
  'Bono de Puntualidad',
  'Bono de Responsabilidad',
  'Bono por Turno',
  'Bono por Trabajo en Altura',
  'Bono por Trabajo en Faena',
  'Bono de Disponibilidad',
  'Bono por Zona / Zona Extrema',
  'Bono de Permanencia',
  'Bono de Retención',
  'Bono de Riesgo',
]

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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [activeContract, setActiveContract] = useState<any>(null)
  const [existingAnnexes, setExistingAnnexes] = useState<any[]>([])
  const [loadingContext, setLoadingContext] = useState(false)
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]) // Conceptos seleccionados para modificar
  const [conceptValues, setConceptValues] = useState<Record<string, any>>({}) // Valores modificados por concepto
  const [previousModifications, setPreviousModifications] = useState<Record<string, any[]>>({}) // Modificaciones previas por concepto
  const [deletedBonuses, setDeletedBonuses] = useState<Record<string, boolean>>({}) // Bonos eliminados (por ID)
  const [fixedTermContractHistory, setFixedTermContractHistory] = useState<{
    contracts: any[]
    annexes: any[]
    totalMonths: number
    warnings: string[]
  } | null>(null) // Historial de contratos a plazo fijo

  const [formData, setFormData] = useState({
    contract_id: searchParams?.get('contract_id') || '',
    employee_id: '',
    annex_type: 'modificacion_sueldo',
    start_date: new Date().toISOString().split('T')[0],
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

  // Cargar contexto cuando se selecciona un trabajador
  useEffect(() => {
    if (selectedEmployeeId) {
      loadEmployeeContext(selectedEmployeeId)
    }
  }, [selectedEmployeeId])

  const loadEmployeeContext = async (employeeId: string) => {
    setLoadingContext(true)
    try {
      // Buscar contrato activo del trabajador
      const today = new Date().toISOString().split('T')[0]
      
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*, employees (*), companies (*)')
        .eq('employee_id', employeeId)
        .in('status', ['active', 'signed'])
        .order('start_date', { ascending: false })

      if (contractsError) throw contractsError

      // Encontrar el contrato activo vigente
      let foundActiveContract = null
      if (contractsData && contractsData.length > 0) {
        for (const contract of contractsData) {
          const startDate = contract.start_date
          const endDate = contract.end_date

          if (contract.status === 'active') {
            if (!endDate || endDate >= today) {
              foundActiveContract = contract
              break
            }
          }

          if (contract.status === 'signed' && startDate <= today && (!endDate || endDate >= today)) {
            foundActiveContract = contract
            break
          }
        }
      }

      if (foundActiveContract) {
        setActiveContract(foundActiveContract)
        setSelectedContract(foundActiveContract)
        setFormData((prev) => ({
          ...prev,
          contract_id: foundActiveContract.id,
          employee_id: employeeId,
        }))
        generateInitialClauses(foundActiveContract)

        // Cargar valores actuales del contrato para los conceptos
        loadCurrentConceptValues(foundActiveContract)

        // Verificar modificaciones previas
        checkPreviousModifications(foundActiveContract.id)
        
        // Verificar historial de contratos a plazo fijo
        checkFixedTermContractHistory(employeeId)

        // Cargar anexos existentes del contrato
        const { data: annexesData, error: annexesError } = await supabase
          .from('contract_annexes')
          .select('*')
          .eq('contract_id', foundActiveContract.id)
          .order('created_at', { ascending: false })

        if (!annexesError && annexesData) {
          // Agregar información de vigencia
          const annexesWithVigence = annexesData.map((annex: any) => {
            const startDate = annex.start_date
            const endDate = annex.end_date
            let isActive = false
            let isExpired = false

            if (annex.status === 'active' || annex.status === 'signed') {
              if (startDate <= today) {
                if (!endDate || endDate >= today) {
                  isActive = true
                } else {
                  isExpired = true
                }
              }
            }

            return {
              ...annex,
              isActive,
              isExpired,
            }
          })

          setExistingAnnexes(annexesWithVigence)
        }
      } else {
        setActiveContract(null)
        setSelectedContract(null)
        setExistingAnnexes([])
        alert('El trabajador seleccionado no tiene un contrato activo vigente.')
      }
    } catch (error: any) {
      console.error('Error al cargar contexto del trabajador:', error)
      alert('Error al cargar información del trabajador: ' + error.message)
    } finally {
      setLoadingContext(false)
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

        // Cargar anexos existentes
        loadAnnexesForContract(contract.id)

        // Cargar valores actuales del contrato para los conceptos
        loadCurrentConceptValues(contract)

        // Verificar modificaciones previas
        checkPreviousModifications(contract.id)
        
        // Verificar historial de contratos a plazo fijo
        if (contract.employee_id) {
          checkFixedTermContractHistory(contract.employee_id)
        }
    }
  }

  const loadAnnexesForContract = async (contractId: string) => {
    try {
      const { data: annexesData, error: annexesError } = await supabase
        .from('contract_annexes')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false })

      if (!annexesError && annexesData) {
        const today = new Date().toISOString().split('T')[0]
        const annexesWithVigence = annexesData.map((annex: any) => {
          const startDate = annex.start_date
          const endDate = annex.end_date
          let isActive = false
          let isExpired = false

          if (annex.status === 'active' || annex.status === 'signed') {
            if (startDate <= today) {
              if (!endDate || endDate >= today) {
                isActive = true
              } else {
                isExpired = true
              }
            }
          }

          return {
            ...annex,
            isActive,
            isExpired,
          }
        })

        setExistingAnnexes(annexesWithVigence)
      }
    } catch (error: any) {
      console.error('Error al cargar anexos:', error)
    }
  }

  // Cargar valores actuales del contrato para los conceptos
  const loadCurrentConceptValues = (contract: any) => {
    const initialValues: Record<string, any> = {}
    
    // Inicializar valores actuales del contrato
    initialValues.contract_type = contract.contract_type
    initialValues.position = contract.position
    initialValues.position_description = contract.position_description
    initialValues.work_schedule_type = contract.work_schedule_type || 'unified'
    initialValues.work_schedule = contract.work_schedule
    initialValues.work_schedule_monday_thursday = contract.work_schedule_monday_thursday
    initialValues.work_schedule_friday = contract.work_schedule_friday
    initialValues.lunch_break_duration = contract.lunch_break_duration || '60'
    initialValues.base_salary = contract.base_salary ? formatNumberForInput(contract.base_salary) : ''
    initialValues.gratuity = contract.gratuity !== false
    initialValues.gratuity_amount = contract.gratuity_amount ? formatNumberForInput(contract.gratuity_amount) : ''
    initialValues.bonuses = contract.other_allowances ? parseBonuses(contract.other_allowances) : []
    initialValues.newBonuses = []
    initialValues.work_location = contract.work_location
    initialValues.payment_method = contract.payment_method || 'transferencia'
    initialValues.payment_periodicity = contract.payment_periodicity || 'mensual'
    initialValues.bank_name = contract.bank_name || ''
    initialValues.account_type = contract.account_type || ''
    initialValues.account_number = contract.account_number || ''

    setConceptValues(initialValues)
  }

  // Parsear bonos del formato "Bono: $monto; Bono2: $monto2"
  const parseBonuses = (bonusesText: string): Array<{ id: string; name: string; amount: string }> => {
    if (!bonusesText) return []
    const bonuses: Array<{ id: string; name: string; amount: string }> = []
    const parts = bonusesText.split(';')
    parts.forEach((part, index) => {
      const match = part.trim().match(/^(.+?):\s*\$\s*([\d.,]+)$/)
      if (match) {
        bonuses.push({
          id: `bonus-${index}`,
          name: match[1].trim(),
          amount: match[2].trim().replace(/\./g, ''),
        })
      }
    })
    return bonuses
  }

  // Verificar historial de contratos a plazo fijo
  const checkFixedTermContractHistory = async (employeeId: string) => {
    try {
      const { data: contractsData } = await supabase
        .from('contracts')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('contract_type', 'plazo_fijo')
        .order('start_date', { ascending: true })

      const { data: annexesData } = await supabase
        .from('contract_annexes')
        .select('*')
        .eq('employee_id', employeeId)
        .in('status', ['signed', 'active'])
        .order('start_date', { ascending: true })

      if (!contractsData && !annexesData) {
        setFixedTermContractHistory(null)
        return
      }

      const contracts = contractsData || []
      const annexes = (annexesData || []).filter((annex: any) => {
        // Verificar si el anexo modificó el tipo de contrato a plazo fijo
        try {
          const parsed = JSON.parse(annex.content || '{}')
          const metadata = annex.metadata || {}
          const conceptValues = metadata.concept_values || {}
          return conceptValues.contract_type === 'plazo_fijo'
        } catch {
          return false
        }
      })

      // Calcular meses trabajados en los últimos 15 meses
      const today = new Date()
      const fifteenMonthsAgo = new Date(today)
      fifteenMonthsAgo.setMonth(fifteenMonthsAgo.getMonth() - 15)

      let totalMonths = 0
      const relevantContracts = contracts.filter((c: any) => {
        const startDate = new Date(c.start_date)
        const endDate = c.end_date ? new Date(c.end_date) : today
        return startDate >= fifteenMonthsAgo || endDate >= fifteenMonthsAgo
      })

      const relevantAnnexes = annexes.filter((a: any) => {
        const startDate = new Date(a.start_date)
        const endDate = a.end_date ? new Date(a.end_date) : today
        return startDate >= fifteenMonthsAgo || endDate >= fifteenMonthsAgo
      })

      // Calcular meses trabajados
      relevantContracts.forEach((c: any) => {
        const start = new Date(c.start_date)
        const end = c.end_date ? new Date(c.end_date) : today
        const months = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)
        totalMonths += Math.max(0, months)
      })

      relevantAnnexes.forEach((a: any) => {
        const start = new Date(a.start_date)
        const end = a.end_date ? new Date(a.end_date) : today
        const months = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)
        totalMonths += Math.max(0, months)
      })

      const warnings: string[] = []
      const totalContracts = contracts.length + annexes.length

      // Verificar regla de máximo 2 contratos sucesivos
      if (totalContracts >= 2) {
        warnings.push(`⚠️ Se han registrado ${totalContracts} contrato(s) a plazo fijo. La ley presume contrato indefinido a partir del segundo cambio/renovación.`)
      }

      // Verificar regla de 12 meses en 15 meses
      if (totalMonths >= 12) {
        warnings.push(`⚠️ Se han trabajado ${totalMonths.toFixed(1)} meses en los últimos 15 meses con contratos a plazo fijo. La ley presume contrato indefinido cuando se superan 12 meses trabajados en 15 meses.`)
      }

      setFixedTermContractHistory({
        contracts,
        annexes,
        totalMonths,
        warnings,
      })
    } catch (error) {
      console.error('Error al verificar historial de contratos a plazo fijo:', error)
      setFixedTermContractHistory(null)
    }
  }

  // Verificar modificaciones previas por concepto
  const checkPreviousModifications = async (contractId: string) => {
    try {
      const { data: annexesData } = await supabase
        .from('contract_annexes')
        .select('*')
        .eq('contract_id', contractId)
        .in('status', ['signed', 'active'])
        .order('created_at', { ascending: false })

      if (!annexesData) return

      const today = new Date().toISOString().split('T')[0]
      const modifications: Record<string, any[]> = {}

      annexesData.forEach((annex: any) => {
        const startDate = annex.start_date
        const endDate = annex.end_date
        let isActive = false

        if (annex.status === 'active' || annex.status === 'signed') {
          if (startDate <= today) {
            if (!endDate || endDate >= today) {
              isActive = true
            }
          }
        }

        // Por ahora, asumimos que cada anexo puede haber modificado cualquier concepto
        // TODO: Mejorar para determinar qué conceptos fueron realmente modificados
        ANNEX_CONCEPTS.forEach((concept) => {
          if (!modifications[concept.id]) {
            modifications[concept.id] = []
          }
          modifications[concept.id].push({
            annexId: annex.id,
            annexNumber: annex.annex_number,
            date: annex.created_at,
            status: annex.status,
            isActive,
          })
        })
      })

      setPreviousModifications(modifications)
    } catch (error) {
      console.error('Error al verificar modificaciones previas:', error)
    }
  }

  // Función para generar el texto de cada cláusula
  const generateClauseText = (clauseNumber: number): string => {
    if (!selectedContract) return ''
    
    // Si es la cláusula 4 (CUARTO) y hay conceptos seleccionados, usar generación basada en conceptos
    if (clauseNumber === 4 && selectedConcepts.length > 0) {
      return generateConceptClauseText(selectedConcepts, conceptValues, selectedContract, ANNEX_CONCEPTS, deletedBonuses)
    }
    
    return generateAnnexClauseText(clauseNumber, formData, selectedContract, selectedContract.employees, company)
  }

  // Efecto para regenerar cláusula 4 cuando cambian conceptos o valores
  useEffect(() => {
    if (selectedConcepts.length > 0 && selectedContract) {
      const newClause4 = generateConceptClauseText(selectedConcepts, conceptValues, selectedContract, ANNEX_CONCEPTS, deletedBonuses)
      setFormData((prev) => ({ ...prev, clause_4: newClause4 }))
    }
  }, [selectedConcepts, conceptValues, selectedContract, deletedBonuses])

  // Generar cláusulas iniciales cuando se carga el contrato
  const generateInitialClauses = (contract: any) => {
    if (!contract || !company) return
    const clauses: any = {}
    // Generar cláusulas 1, 2, 4, 5, 6 (sin TERCERO)
    for (let i of [1, 2, 4, 5, 6]) {
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
      // Regenerar cláusulas 1, 2, 4, 5, 6 (sin TERCERO)
      for (let i of [1, 2, 4, 5, 6]) {
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
  }, [selectedContract?.id, formData.start_date, formData.end_date, company?.id])

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
        clause_4: formData.clause_4,
        clause_5: formData.clause_5,
        clause_6: formData.clause_6,
        clause_1_enabled: formData.clause_1_enabled,
        clause_2_enabled: formData.clause_2_enabled,
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

      // Determinar el tipo de anexo basándose en los conceptos seleccionados
      const determineAnnexType = (concepts: string[]): string => {
        if (concepts.length === 0) return 'otro'
        
        // Mapeo de conceptos a tipos de anexo (prioridad)
        const conceptToType: Record<string, string> = {
          'contract_type': 'cambio_tipo_contrato',
          'position': 'cambio_cargo',
          'work_schedule': 'cambio_jornada',
          'remuneration': 'modificacion_sueldo',
          'work_location': 'cambio_lugar_trabajo',
          'payment': 'cambio_metodo_pago',
        }
        
        // Si hay un solo concepto, usar su tipo correspondiente
        if (concepts.length === 1) {
          return conceptToType[concepts[0]] || 'otro'
        }
        
        // Si hay múltiples conceptos, priorizar por importancia
        // Prioridad: contract_type > position > work_schedule > remuneration > otros
        const priority = ['contract_type', 'position', 'work_schedule', 'remuneration', 'work_location', 'payment']
        for (const priorityConcept of priority) {
          if (concepts.includes(priorityConcept)) {
            return conceptToType[priorityConcept] || 'otro'
          }
        }
        
        return 'otro'
      }
      
      const determinedAnnexType = determineAnnexType(selectedConcepts)
      console.log('[Annex Creation] Conceptos seleccionados:', selectedConcepts)
      console.log('[Annex Creation] Tipo de anexo determinado:', determinedAnnexType)

      // Preparar metadata con conceptValues para actualización automática posterior
      const metadata: any = {
        selected_concepts: selectedConcepts,
        concept_values: conceptValues,
      }

      // Log para depuración
      console.log('[Annex Creation] Conceptos seleccionados:', selectedConcepts)
      console.log('[Annex Creation] ConceptValues a guardar:', JSON.stringify(conceptValues, null, 2))
      console.log('[Annex Creation] Metadata completo:', JSON.stringify(metadata, null, 2))

      const annexData: any = {
        contract_id: formData.contract_id,
        employee_id: formData.employee_id,
        company_id: companyId,
        annex_type: determinedAnnexType, // Usar el tipo determinado automáticamente
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        content: contentWithClauses, // Almacenar cláusulas en JSON
        modifications_summary: null,
        status: 'draft',
        metadata: metadata, // Almacenar conceptValues para actualización automática
      }

      const { data, error } = await supabase
        .from('contract_annexes')
        .insert(annexData)
        .select()
        .single()

      if (error) throw error

      // Registrar evento de auditoría (async, no bloquea el flujo)
      try {
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: companyId,
            employeeId: formData.employee_id,
            source: 'admin_dashboard',
            actionType: 'annex.created',
            module: 'annexes',
            entityType: 'contract_annexes',
            entityId: data.id,
            status: 'success',
            afterData: {
              annex_type: annexData.annex_type,
              start_date: annexData.start_date,
              end_date: annexData.end_date,
              status: annexData.status,
            },
            metadata: {
              contract_id: formData.contract_id,
              selected_concepts: selectedConcepts,
            },
          }),
        }).catch((err) => console.error('Error al registrar auditoría:', err))
      } catch (auditError) {
        // No interrumpir el flujo si falla el logging
        console.error('Error al registrar auditoría:', auditError)
      }

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
          <h2>1. Selección de Trabajador o Contrato</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Opción 1: Seleccionar trabajador (método recomendado) */}
            <div className="form-group">
              <label>Seleccionar Trabajador (recomendado)</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value)
                  if (e.target.value) {
                    setFormData((prev) => ({ ...prev, contract_id: '' }))
                  }
                }}
                disabled={loadingContext}
              >
                <option value="">Selecciona un trabajador para cargar su contrato activo</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.rut})
                  </option>
                ))}
              </select>
              {loadingContext && (
                <p style={{ marginTop: '8px', color: '#6b7280', fontSize: '14px' }}>
                  Cargando información del trabajador...
                </p>
              )}
            </div>

            {/* Opción 2: Seleccionar contrato directamente */}
            <div className="form-group">
              <label>Seleccionar Contrato Directamente</label>
              <select
                value={formData.contract_id}
                onChange={(e) => {
                  setFormData({ ...formData, contract_id: e.target.value })
                  if (e.target.value) {
                    setSelectedEmployeeId('')
                  }
                }}
                required={!selectedEmployeeId}
                disabled={!!selectedEmployeeId}
              >
                <option value="">Selecciona un contrato</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.contract_number} - {contract.employees?.full_name || 'N/A'} ({contract.employees?.rut || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Información del contrato activo */}
          {activeContract && (
            <div style={{ marginTop: '16px', padding: '16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px', color: '#0369a1' }}>
                ✓ Contrato Activo Encontrado
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                <div>
                  <strong>Contrato:</strong> {activeContract.contract_number}
                </div>
                <div>
                  <strong>Trabajador:</strong> {activeContract.employees?.full_name}
                </div>
                <div>
                  <strong>Tipo:</strong> {activeContract.contract_type}
                </div>
                <div>
                  <strong>Estado:</strong> {activeContract.status === 'active' ? 'Activo' : 'Firmado'}
                </div>
                <div>
                  <strong>Inicio:</strong> {new Date(activeContract.start_date).toLocaleDateString('es-CL')}
                </div>
                {activeContract.end_date && (
                  <div>
                    <strong>Término:</strong> {new Date(activeContract.end_date).toLocaleDateString('es-CL')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historial de anexos existentes */}
          {existingAnnexes.length > 0 && (
            <div style={{ marginTop: '20px', padding: '16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>
                Historial de Anexos ({existingAnnexes.length})
              </h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {existingAnnexes.map((annex: any) => (
                  <div
                    key={annex.id}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '14px' }}>{annex.annex_number || 'Sin número'}</strong>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            background: annex.isActive ? '#dcfce7' : annex.isExpired ? '#fee2e2' : '#f3f4f6',
                            color: annex.isActive ? '#166534' : annex.isExpired ? '#991b1b' : '#374151',
                          }}
                        >
                          {annex.isActive ? 'Activo' : annex.isExpired ? 'Expirado' : annex.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        <span>Tipo: {annex.annex_type.replace('_', ' ')}</span>
                        {' • '}
                        <span>
                          Desde: {new Date(annex.start_date).toLocaleDateString('es-CL')}
                        </span>
                        {annex.end_date && (
                          <>
                            {' • '}
                            <span>
                              Hasta: {new Date(annex.end_date).toLocaleDateString('es-CL')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/contracts/annex/${annex.id}`}
                      style={{
                        padding: '6px 12px',
                        background: '#6366f1',
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '12px',
                        textDecoration: 'none',
                      }}
                    >
                      Ver
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mensaje si no hay contrato activo */}
          {selectedEmployeeId && !loadingContext && !activeContract && (
            <div style={{ marginTop: '16px', padding: '16px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px' }}>
              <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
                ⚠️ El trabajador seleccionado no tiene un contrato activo vigente. Debe seleccionar un contrato directamente.
              </p>
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>2. Conceptos a Modificar</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
            Selecciona los conceptos del contrato que deseas modificar en este anexo. Puedes seleccionar uno o varios conceptos.
          </p>
          
          {!activeContract && !selectedContract && (
            <div style={{ padding: '16px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
                ⚠️ Primero debes seleccionar un trabajador o contrato para poder elegir los conceptos a modificar.
              </p>
            </div>
          )}

          {(activeContract || selectedContract) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              {ANNEX_CONCEPTS.map((concept) => {
                const isSelected = selectedConcepts.includes(concept.id)
                return (
                  <button
                    key={concept.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedConcepts(selectedConcepts.filter((id) => id !== concept.id))
                      } else {
                        setSelectedConcepts([...selectedConcepts, concept.id])
                      }
                    }}
                    style={{
                      padding: '12px 16px',
                      border: `1px solid ${isSelected ? '#10b981' : '#d1d5db'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected ? '#10b981' : 'white',
                      color: isSelected ? 'white' : '#374151',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      minWidth: '200px',
                      maxWidth: '280px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#f3f4f6'
                        e.currentTarget.style.borderColor = '#9ca3af'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'white'
                        e.currentTarget.style.borderColor = '#d1d5db'
                      }
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={{ fontSize: '14px', fontWeight: '600', display: 'block' }}>
                        {concept.label}
                      </strong>
                      <span style={{ fontSize: '12px', opacity: isSelected ? 0.95 : 0.7, lineHeight: '1.4' }}>
                        {concept.description}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {selectedConcepts.length > 0 && (
            <div style={{ padding: '12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', marginTop: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500' }}>
                Conceptos seleccionados ({selectedConcepts.length}):
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedConcepts.map((conceptId) => {
                  const concept = getConceptById(conceptId)
                  if (!concept) return null
                  return (
                    <span
                      key={conceptId}
                      style={{
                        padding: '4px 12px',
                        background: '#6366f1',
                        color: 'white',
                        borderRadius: '16px',
                        fontSize: '12px',
                      }}
                    >
                      {concept.label}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sección para editar valores de conceptos seleccionados */}
        {selectedConcepts.length > 0 && (activeContract || selectedContract) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2>2.1. Editar Valores de Conceptos Seleccionados</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              Modifica los valores actuales para cada concepto seleccionado. Los valores actuales se muestran como referencia.
            </p>

            {selectedConcepts.map((conceptId) => {
              const concept = getConceptById(conceptId)
              if (!concept) return null

              // Verificar si hay modificaciones previas
              const prevMods = previousModifications[conceptId] || []
              const hasActiveMod = prevMods.some((m: any) => m.isActive)
              const lastMod = prevMods[0]

              return (
                <div key={conceptId} style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{concept.label}</h3>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                        {concept.description}
                      </p>
                    </div>
                    {hasActiveMod && lastMod && (
                      <div style={{
                        padding: '8px 12px',
                        background: '#fef3c7',
                        border: '1px solid #fcd34d',
                        borderRadius: '6px',
                        fontSize: '12px',
                        maxWidth: '300px',
                      }}>
                        <p style={{ margin: '0 0 4px 0', fontWeight: '500' }}>
                          ⚠️ Modificado previamente
                        </p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#92400e' }}>
                          Anexo: {lastMod.annexNumber || 'N/A'} - {new Date(lastMod.date).toLocaleDateString('es-CL')}
                        </p>
                        <Link
                          href={`/contracts/annex/${lastMod.annexId}`}
                          style={{ fontSize: '11px', color: '#6366f1', textDecoration: 'underline' }}
                        >
                          Ver anexo anterior
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Renderizar inputs según el concepto */}
                  {concept.id === 'contract_type' && (
                    <div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Tipo de Contrato Actual</label>
                          <input
                            type="text"
                            value={selectedContract?.contract_type || ''}
                            disabled
                            style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                          />
                        </div>
                        <div className="form-group">
                          <label>Nuevo Tipo de Contrato</label>
                          <select
                            value={conceptValues.contract_type || ''}
                            onChange={(e) => {
                              const newContractType = e.target.value
                              const updatedValues: Record<string, any> = { ...conceptValues, contract_type: newContractType }
                              // Si cambia a indefinido, eliminar end_date explícitamente
                              if (newContractType === 'indefinido') {
                                updatedValues.end_date = null
                              } else if (newContractType === 'plazo_fijo') {
                                // Mantener end_date si ya existe, sino dejarlo vacío para que el usuario lo complete
                                updatedValues.end_date = conceptValues.end_date || ''
                              } else {
                                // Para otros tipos, limpiar end_date
                                updatedValues.end_date = ''
                              }
                              setConceptValues(updatedValues)
                              console.log('[Annex Form] Contract type cambiado a:', newContractType, 'conceptValues actualizado:', updatedValues)
                            }}
                          >
                            <option value="indefinido">Indefinido</option>
                            <option value="plazo_fijo">Plazo Fijo</option>
                            <option value="obra_faena">Obra o Faena</option>
                            <option value="part_time">Part Time</option>
                          </select>
                        </div>
                      </div>
                      
                      {conceptValues.contract_type === 'plazo_fijo' && (
                        <>
                          <div className="form-group" style={{ marginTop: '16px' }}>
                            <label>Fecha de Término del Contrato *</label>
                            <DateInput
                              value={conceptValues.end_date || ''}
                              onChange={(value) => setConceptValues({ ...conceptValues, end_date: value })}
                              required
                            />
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                              Fecha en que vence el contrato a plazo fijo
                            </div>
                          </div>
                          
                          {fixedTermContractHistory && fixedTermContractHistory.warnings.length > 0 && (
                            <div style={{
                              marginTop: '16px',
                              padding: '16px',
                              backgroundColor: '#fef3c7',
                              borderLeft: '4px solid #f59e0b',
                              borderRadius: '4px'
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#92400e' }}>
                                ⚠️ Advertencias sobre Contrato a Plazo Fijo
                              </div>
                              {fixedTermContractHistory.warnings.map((warning, index) => (
                                <div key={index} style={{ fontSize: '13px', color: '#92400e', marginBottom: '8px' }}>
                                  {warning}
                                </div>
                              ))}
                              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '4px', fontSize: '12px', color: '#991b1b' }}>
                                <strong>Normativa Legal (Código del Trabajo):</strong>
                                <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                                  <li>Máximo 2 contratos a plazo fijo sucesivos con el mismo empleador</li>
                                  <li>A partir del segundo cambio/renovación, la relación se presume indefinida</li>
                                  <li>Si se superan 12 meses trabajados en 15 meses con contratos a plazo fijo, se presume contrato indefinido</li>
                                  <li>El contrato a plazo fijo es una modalidad excepcional para necesidades temporales</li>
                                </ul>
                              </div>
                            </div>
                          )}
                          
                          {fixedTermContractHistory && (
                            <div style={{
                              marginTop: '12px',
                              padding: '12px',
                              backgroundColor: '#f0f9ff',
                              borderLeft: '4px solid #3b82f6',
                              borderRadius: '4px',
                              fontSize: '13px',
                              color: '#1e40af'
                            }}>
                              <div style={{ marginBottom: '8px' }}>
                                <strong>Historial de Contratos a Plazo Fijo:</strong>
                              </div>
                              <div style={{ marginBottom: '4px' }}>
                                Contratos registrados: {fixedTermContractHistory.contracts.length + fixedTermContractHistory.annexes.length}
                              </div>
                              <div>
                                Meses trabajados en últimos 15 meses: {fixedTermContractHistory.totalMonths.toFixed(1)} meses
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {concept.id === 'position' && (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Cargo Actual</label>
                          <input
                            type="text"
                            value={selectedContract?.position || ''}
                            disabled
                            style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                          />
                        </div>
                        <div className="form-group">
                          <label>Nuevo Cargo</label>
                          <input
                            type="text"
                            value={conceptValues.position || ''}
                            onChange={(e) => setConceptValues({ ...conceptValues, position: e.target.value })}
                            placeholder="Ingrese el nuevo cargo"
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Descripción de Funciones Actual</label>
                          <textarea
                            value={selectedContract?.position_description || ''}
                            disabled
                            rows={4}
                            style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                          />
                        </div>
                        <div className="form-group">
                          <label>Nueva Descripción de Funciones</label>
                          <textarea
                            value={conceptValues.position_description || ''}
                            onChange={(e) => setConceptValues({ ...conceptValues, position_description: e.target.value })}
                            rows={4}
                            placeholder="Describe las nuevas funciones del cargo..."
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {concept.id === 'remuneration' && (
                    <div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Sueldo Base Actual</label>
                          <input
                            type="text"
                            value={selectedContract?.base_salary ? formatNumberForInput(selectedContract.base_salary) : ''}
                            disabled
                            style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                          />
                        </div>
                        <div className="form-group">
                          <label>Nuevo Sueldo Base</label>
                          <input
                            type="text"
                            value={conceptValues.base_salary || ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, '')
                              setConceptValues({ ...conceptValues, base_salary: formatNumberForInput(parseFormattedNumber(value)) })
                            }}
                            placeholder="Ingrese el nuevo sueldo"
                          />
                        </div>
                      </div>
                      
                      <div className="form-row" style={{ marginTop: '16px' }}>
                        <div className="form-group">
                          <label>Gratificación Actual</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="text"
                              value={selectedContract?.gratuity !== false ? (selectedContract?.gratuity_amount ? formatNumberForInput(selectedContract.gratuity_amount) : 'Gratificación Legal (25%)') : 'No aplica'}
                              disabled
                              style={{ background: '#f3f4f6', cursor: 'not-allowed', flex: 1 }}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Nueva Gratificación</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <ToggleSwitch
                              checked={conceptValues.gratuity !== false}
                              onChange={(checked) => setConceptValues({ ...conceptValues, gratuity: checked })}
                              label="Incluir Gratificación Legal (25% del sueldo base, con tope legal)"
                            />
                            {conceptValues.gratuity !== false && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '200px' }}>
                                <input
                                  type="text"
                                  value={conceptValues.gratuity_amount || ''}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    setConceptValues({ ...conceptValues, gratuity_amount: formatNumberForInput(parseFormattedNumber(value)) })
                                  }}
                                  placeholder="Monto fijo (opcional)"
                                  style={{ flex: '1', minWidth: '150px' }}
                                />
                                <span style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}>
                                  Si se deja vacío, se aplicará gratificación legal
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="form-group" style={{ marginTop: '24px' }}>
                        <label>Bonos y Asignaciones Actuales</label>
                        {(!conceptValues.bonuses || conceptValues.bonuses.length === 0) && (
                          <p style={{ color: '#6b7280', fontSize: '14px', fontStyle: 'italic' }}>No hay bonos registrados</p>
                        )}
                        {conceptValues.bonuses && conceptValues.bonuses.length > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            {conceptValues.bonuses.map((bonus: any, index: number) => {
                              const isDeleted = deletedBonuses[bonus.id] || false
                              return (
                                <div key={bonus.id} className="form-row" style={{ marginBottom: '8px', opacity: isDeleted ? 0.5 : 1 }}>
                                  <div className="form-group" style={{ flex: '1' }}>
                                    <input
                                      type="text"
                                      value={bonus.name}
                                      disabled
                                      style={{ background: isDeleted ? '#f3f4f6' : '#f9fafb', cursor: isDeleted ? 'not-allowed' : 'default' }}
                                    />
                                  </div>
                                  <div className="form-group" style={{ flex: '1' }}>
                                    <input
                                      type="text"
                                      value={formatNumberForInput(parseFormattedNumber(bonus.amount || ''))}
                                      disabled
                                      style={{ background: isDeleted ? '#f3f4f6' : '#f9fafb', cursor: isDeleted ? 'not-allowed' : 'default' }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px', gap: '8px' }}>
                                    <ToggleSwitch
                                      checked={!isDeleted}
                                      onChange={(checked) => {
                                        setDeletedBonuses({ ...deletedBonuses, [bonus.id]: !checked })
                                      }}
                                    />
                                    <span style={{ fontSize: '12px', color: isDeleted ? '#ef4444' : '#10b981' }}>
                                      {isDeleted ? 'Eliminado' : 'Activo'}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      
                      <div className="form-group">
                        <label>Agregar Nuevos Bonos o Asignaciones</label>
                        <div style={{ marginBottom: '16px' }}>
                          {(conceptValues.newBonuses || []).map((bonus: any, index: number) => (
                            <div key={bonus.id} className="form-row" style={{ marginBottom: '8px' }}>
                              <div className="form-group" style={{ flex: '1' }}>
                                <select
                                  value={bonus.name}
                                  onChange={(e) => {
                                    const updated = [...(conceptValues.newBonuses || [])]
                                    updated[index].name = e.target.value
                                    setConceptValues({ ...conceptValues, newBonuses: updated })
                                  }}
                                  style={{ width: '100%' }}
                                >
                                  <option value="">Seleccionar tipo de bono</option>
                                  {AVAILABLE_BONUSES.map((bonoName) => (
                                    <option key={bonoName} value={bonoName}>
                                      {bonoName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-group" style={{ flex: '1' }}>
                                <input
                                  type="text"
                                  value={bonus.amount}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9.]/g, '')
                                    const updated = [...(conceptValues.newBonuses || [])]
                                    updated[index].amount = formatNumberForInput(parseFormattedNumber(value))
                                    setConceptValues({ ...conceptValues, newBonuses: updated })
                                  }}
                                  placeholder="Monto"
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (conceptValues.newBonuses || []).filter((_: any, i: number) => i !== index)
                                    setConceptValues({ ...conceptValues, newBonuses: updated })
                                  }}
                                  style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setConceptValues({
                                ...conceptValues,
                                newBonuses: [...(conceptValues.newBonuses || []), { id: Date.now().toString(), name: '', amount: '' }]
                              })
                            }}
                            style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}
                          >
                            + Agregar Bono
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {concept.id === 'work_schedule' && (
                    <div>
                      <div style={{ 
                        padding: '12px', 
                        backgroundColor: '#f0f9ff', 
                        borderLeft: '4px solid #3b82f6', 
                        marginBottom: '16px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: '#1e40af'
                      }}>
                        <strong>Nota:</strong> La jornada de trabajo se rige por la Ley 21.561 (Ley de 40 horas), que establece una jornada ordinaria semanal máxima de 40 horas, distribuidas de lunes a viernes. Esta ley entró en vigencia de forma gradual y debe ser respetada en todos los contratos laborales.
                      </div>
                      
                      <div className="form-group">
                        <label>Tipo de Horario Actual</label>
                        <input
                          type="text"
                          value={selectedContract?.work_schedule_type === 'unified' ? 'Lunes a Viernes (mismo horario)' : 'Lunes a Jueves y Viernes (horarios diferentes)'}
                          disabled
                          style={{ background: '#f3f4f6', cursor: 'not-allowed', marginBottom: '12px' }}
                        />
                      </div>
                      
                      {selectedContract?.work_schedule_type === 'unified' ? (
                        <div className="form-group">
                          <label>Horario Actual</label>
                          <input
                            type="text"
                            value={selectedContract?.work_schedule || ''}
                            disabled
                            style={{ background: '#f3f4f6', cursor: 'not-allowed', marginBottom: '12px' }}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="form-group">
                            <label>Horario Actual Lunes a Jueves</label>
                            <input
                              type="text"
                              value={selectedContract?.work_schedule_monday_thursday || ''}
                              disabled
                              style={{ background: '#f3f4f6', cursor: 'not-allowed', marginBottom: '12px' }}
                            />
                          </div>
                          <div className="form-group">
                            <label>Horario Actual Viernes</label>
                            <input
                              type="text"
                              value={selectedContract?.work_schedule_friday || ''}
                              disabled
                              style={{ background: '#f3f4f6', cursor: 'not-allowed', marginBottom: '12px' }}
                            />
                          </div>
                        </>
                      )}
                      
                      <div className="form-group">
                        <label>Tipo de Horario Nuevo *</label>
                        <select
                          value={conceptValues.work_schedule_type || 'unified'}
                          onChange={(e) => setConceptValues({ ...conceptValues, work_schedule_type: e.target.value as 'unified' | 'separated' })}
                          required
                        >
                          <option value="unified">Lunes a Viernes (mismo horario)</option>
                          <option value="separated">Lunes a Jueves y Viernes (horarios diferentes)</option>
                        </select>
                      </div>
                      
                      {conceptValues.work_schedule_type === 'unified' ? (
                        <div className="form-group">
                          <label>Nuevo Horario de Trabajo *</label>
                          <input
                            type="text"
                            value={conceptValues.work_schedule || ''}
                            onChange={(e) => setConceptValues({ ...conceptValues, work_schedule: e.target.value })}
                            placeholder="Ej: Lunes a Viernes, 09:00 a 18:00"
                            required
                          />
                        </div>
                      ) : (
                        <>
                          <div className="form-group">
                            <label>Nuevo Horario Lunes a Jueves *</label>
                            <input
                              type="text"
                              value={conceptValues.work_schedule_monday_thursday || ''}
                              onChange={(e) => setConceptValues({ ...conceptValues, work_schedule_monday_thursday: e.target.value })}
                              placeholder="Ej: Lunes a Jueves, 09:00 a 18:00"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Nuevo Horario Viernes *</label>
                            <input
                              type="text"
                              value={conceptValues.work_schedule_friday || ''}
                              onChange={(e) => setConceptValues({ ...conceptValues, work_schedule_friday: e.target.value })}
                              placeholder="Ej: Viernes, 09:00 a 18:00"
                              required
                            />
                          </div>
                        </>
                      )}
                      
                      <div className="form-group">
                        <label>Duración de Colación Actual (minutos)</label>
                        <input
                          type="text"
                          value={selectedContract?.lunch_break_duration || '60'}
                          disabled
                          style={{ background: '#f3f4f6', cursor: 'not-allowed', marginBottom: '12px' }}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Nueva Duración de Colación (minutos) *</label>
                        <input
                          type="number"
                          value={conceptValues.lunch_break_duration || '60'}
                          onChange={(e) => setConceptValues({ ...conceptValues, lunch_break_duration: e.target.value })}
                          placeholder="Ej: 60"
                          min="0"
                          max="120"
                          required
                        />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          Tiempo de descanso para colación (no imputable a la jornada laboral)
                        </div>
                      </div>

                      {/* Análisis de cumplimiento de Ley 21.561 */}
                      {(() => {
                        const calculateWeeklyHours = () => {
                          try {
                            const lunchMinutes = parseInt(conceptValues.lunch_break_duration || '60') || 60

                            if (conceptValues.work_schedule_type === 'unified' && conceptValues.work_schedule) {
                              const timeMatch = conceptValues.work_schedule.match(/(\d{1,2}):(\d{2})\s*a\s*(\d{1,2}):(\d{2})/i)
                              if (timeMatch) {
                                const startHour = parseInt(timeMatch[1])
                                const startMin = parseInt(timeMatch[2])
                                const endHour = parseInt(timeMatch[3])
                                const endMin = parseInt(timeMatch[4])
                                
                                const startTotal = startHour * 60 + startMin
                                const endTotal = endHour * 60 + endMin
                                const dailyMinutes = endTotal - startTotal - lunchMinutes
                                const dailyHours = dailyMinutes / 60
                                return dailyHours * 5
                              }
                            } else if (conceptValues.work_schedule_type === 'separated') {
                              const mondayThursdayMatch = conceptValues.work_schedule_monday_thursday?.match(/(\d{1,2}):(\d{2})\s*a\s*(\d{1,2}):(\d{2})/i)
                              let mondayThursdayHours = 0
                              if (mondayThursdayMatch) {
                                const startHour = parseInt(mondayThursdayMatch[1])
                                const startMin = parseInt(mondayThursdayMatch[2])
                                const endHour = parseInt(mondayThursdayMatch[3])
                                const endMin = parseInt(mondayThursdayMatch[4])
                                
                                const startTotal = startHour * 60 + startMin
                                const endTotal = endHour * 60 + endMin
                                const dailyMinutes = endTotal - startTotal - lunchMinutes
                                mondayThursdayHours = (dailyMinutes / 60) * 4
                              }
                              
                              const fridayMatch = conceptValues.work_schedule_friday?.match(/(\d{1,2}):(\d{2})\s*a\s*(\d{1,2}):(\d{2})/i)
                              let fridayHours = 0
                              if (fridayMatch) {
                                const startHour = parseInt(fridayMatch[1])
                                const startMin = parseInt(fridayMatch[2])
                                const endHour = parseInt(fridayMatch[3])
                                const endMin = parseInt(fridayMatch[4])
                                
                                const startTotal = startHour * 60 + startMin
                                const endTotal = endHour * 60 + endMin
                                const dailyMinutes = endTotal - startTotal - lunchMinutes
                                fridayHours = dailyMinutes / 60
                              }
                              
                              return mondayThursdayHours + fridayHours
                            }
                          } catch (error) {
                            return null
                          }
                          return null
                        }

                        const weeklyHours = calculateWeeklyHours()
                        const currentYear = new Date().getFullYear()
                        
                        let maxHours = 45
                        let limitYear = ''
                        if (currentYear >= 2028) {
                          maxHours = 40
                          limitYear = '2028'
                        } else if (currentYear >= 2026) {
                          maxHours = 42
                          limitYear = '2026'
                        } else if (currentYear >= 2024) {
                          maxHours = 44
                          limitYear = '2024'
                        }

                        if (weeklyHours !== null && weeklyHours > 0) {
                          const isCompliant = weeklyHours <= maxHours
                          const hoursDiff = weeklyHours - maxHours
                          
                          return (
                            <div style={{
                              marginTop: '16px',
                              padding: '12px',
                              backgroundColor: isCompliant ? '#f0fdf4' : '#fef2f2',
                              borderLeft: `4px solid ${isCompliant ? '#22c55e' : '#ef4444'}`,
                              borderRadius: '4px'
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: isCompliant ? '#166534' : '#991b1b' }}>
                                {isCompliant ? '✓ Cumple con Ley 21.561' : '⚠ Excede límite legal'}
                              </div>
                              <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                                <strong>Horas semanales calculadas:</strong> {weeklyHours.toFixed(2)} horas
                              </div>
                              <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                                <strong>Límite legal ({currentYear >= 2028 ? 'desde 2028' : currentYear >= 2026 ? 'desde 2026' : 'desde 2024'}):</strong> {maxHours} horas/semana
                              </div>
                              {!isCompliant && (
                                <div style={{ fontSize: '13px', color: '#991b1b', marginTop: '8px', fontWeight: 'bold' }}>
                                  ⚠ ADVERTENCIA: Se excede el límite legal en {hoursDiff.toFixed(2)} horas. Esto podría generar responsabilidades legales.
                                </div>
                              )}
                              {isCompliant && weeklyHours < maxHours && (
                                <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                                  El horario está dentro del límite legal y es menor al máximo permitido.
                                </div>
                              )}
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>
                  )}

                  {concept.id === 'work_location' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Lugar de Trabajo Actual</label>
                        <input
                          type="text"
                          value={selectedContract?.work_location || ''}
                          disabled
                          style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Nuevo Lugar de Trabajo</label>
                        <input
                          type="text"
                          value={conceptValues.work_location || ''}
                          onChange={(e) => setConceptValues({ ...conceptValues, work_location: e.target.value })}
                          placeholder="Ingrese el nuevo lugar de trabajo"
                        />
                      </div>
                    </div>
                  )}

                  {concept.id === 'payment' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Método de Pago Actual</label>
                        <input
                          type="text"
                          value={selectedContract?.payment_method === 'transferencia' ? 'Transferencia Bancaria' : selectedContract?.payment_method || ''}
                          disabled
                          style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Nuevo Método de Pago</label>
                        <select
                          value={conceptValues.payment_method || 'transferencia'}
                          onChange={(e) => setConceptValues({ ...conceptValues, payment_method: e.target.value })}
                        >
                          <option value="transferencia">Transferencia Bancaria</option>
                          <option value="efectivo">Efectivo</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>3. Fecha de Inicio del Anexo</h2>
          <div className="form-group">
            <label>Fecha de Inicio *</label>
            <DateInput
              value={formData.start_date}
              onChange={(value) => setFormData({ ...formData, start_date: value })}
              required
            />
          </div>
        </div>

        {/* Cláusulas del Anexo */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2>4. Cláusulas del Anexo</h2>
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px', marginBottom: '0' }}>
                Las cláusulas se generan automáticamente basándose en los datos ingresados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const allClauses: any = {}
                // Anexos tienen cláusulas 1, 2, 4, 5, 6 (sin TERCERO)
                for (let i of [1, 2, 4, 5, 6]) {
                  allClauses[`clause_${i}`] = generateClauseText(i)
                }
                setFormData({ ...formData, ...allClauses })
                alert('✅ Todas las cláusulas han sido regeneradas')
              }}
              style={{ 
                padding: '10px 20px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(102, 126, 234, 0.3)'
              }}
            >
              🔄 Regenerar Todas las Cláusulas
            </button>
          </div>
          
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


