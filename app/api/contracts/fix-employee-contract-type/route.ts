import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientForAPI(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)

    const userRoles = (adminUser || []).map((u: any) => u.role)
    if (userRoles.length === 0 || !userRoles.some((r: string) => ['admin', 'superadmin', 'ejecutivo'].includes(r))) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const companyId = body.company_id

    let annexesQuery = supabase
      .from('contract_annexes')
      .select('id, annex_type, status, metadata, employee_id, contract_id, start_date')
      .in('status', ['active', 'signed'])
      .eq('annex_type', 'cambio_tipo_contrato')

    if (companyId) {
      annexesQuery = annexesQuery.eq('company_id', companyId)
    }

    const { data: annexes, error: annexesError } = await annexesQuery

    if (annexesError) {
      throw new Error(`Error al obtener anexos: ${annexesError.message}`)
    }

    if (!annexes || annexes.length === 0) {
      return NextResponse.json({
        message: 'No se encontraron anexos de cambio_tipo_contrato activos/firmados',
        updated: 0,
      })
    }

    const results: Array<{
      annex_id: string
      employee_id: string
      old_contract_type: string | null
      new_contract_type: string
      old_end_date: string | null
      new_end_date: string | null
      updated: boolean
    }> = []

    for (const annex of annexes) {
      const conceptValues = annex.metadata?.concept_values || annex.metadata?.conceptValues || {}
      const newContractType = conceptValues.contract_type || conceptValues.contractType
      const newEndDate = conceptValues.end_date || conceptValues.endDate || null

      if (!newContractType) {
        results.push({
          annex_id: annex.id,
          employee_id: annex.employee_id,
          old_contract_type: null,
          new_contract_type: 'NOT_FOUND_IN_METADATA',
          old_end_date: null,
          new_end_date: null,
          updated: false,
        })
        continue
      }

      const { data: employee } = await supabase
        .from('employees')
        .select('id, contract_type, contract_end_date')
        .eq('id', annex.employee_id)
        .single()

      if (!employee) {
        results.push({
          annex_id: annex.id,
          employee_id: annex.employee_id,
          old_contract_type: null,
          new_contract_type: newContractType,
          old_end_date: null,
          new_end_date: newEndDate,
          updated: false,
        })
        continue
      }

      if (employee.contract_type === newContractType) {
        results.push({
          annex_id: annex.id,
          employee_id: annex.employee_id,
          old_contract_type: employee.contract_type,
          new_contract_type: newContractType,
          old_end_date: employee.contract_end_date,
          new_end_date: newEndDate,
          updated: false,
        })
        continue
      }

      const updateFields: Record<string, any> = {
        contract_type: newContractType,
      }

      if (newContractType === 'indefinido') {
        updateFields.contract_end_date = null
      } else if (newContractType === 'plazo_fijo' && newEndDate) {
        updateFields.contract_end_date = newEndDate
      }

      const { error: updateError } = await supabase
        .from('employees')
        .update(updateFields)
        .eq('id', annex.employee_id)

      if (updateError) {
        results.push({
          annex_id: annex.id,
          employee_id: annex.employee_id,
          old_contract_type: employee.contract_type,
          new_contract_type: newContractType,
          old_end_date: employee.contract_end_date,
          new_end_date: newEndDate,
          updated: false,
        })
        continue
      }

      results.push({
        annex_id: annex.id,
        employee_id: annex.employee_id,
        old_contract_type: employee.contract_type,
        new_contract_type: newContractType,
        old_end_date: employee.contract_end_date,
        new_end_date: newEndDate,
        updated: true,
      })
    }

    const updatedCount = results.filter(r => r.updated).length

    return NextResponse.json({
      message: `Se actualizaron ${updatedCount} de ${results.length} empleados`,
      total_annexes: annexes.length,
      updated: updatedCount,
      results,
    })
  } catch (error: any) {
    console.error('Error al corregir contract_type:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}