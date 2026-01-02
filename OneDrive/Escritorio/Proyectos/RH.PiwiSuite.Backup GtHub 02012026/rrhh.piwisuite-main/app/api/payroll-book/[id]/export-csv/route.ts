import { NextRequest, NextResponse } from 'next/server'
import { createServerClientForAPI } from '@/lib/supabase/server-api'
import { getPayrollBook } from '@/lib/services/payrollBookGenerator'

/**
 * GET /api/payroll-book/[id]/export-csv
 * Exporta el libro de remuneraciones en formato CSV compatible con LRE
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClientForAPI(request)
    
    const book = await getPayrollBook(params.id, supabase)

    if (!book) {
      return NextResponse.json(
        { error: 'Libro no encontrado' },
        { status: 404 }
      )
    }

    // Obtener datos de la empresa
    const { data: company } = await supabase
      .from('companies')
      .select('rut, name')
      .eq('id', book.company_id)
      .single()

    // Generar CSV compatible con formato LRE
    // Encabezados según estructura del Libro de Remuneraciones Electrónico
    const headers = [
      'RUT Empresa',
      'RUT Trabajador',
      'Nombre Trabajador',
      'Fecha Ingreso',
      'Fecha Término',
      'Tipo Contrato',
      'AFP',
      'Sistema Salud',
      'Plan Salud',
      'Cargo',
      'Centro Costo',
      'Días Trabajados',
      'Días Licencia',
      'Sueldo Base',
      'Gratificación',
      'Bonos',
      'Horas Extras',
      'Vacaciones',
      'Otros Haberes Imp.',
      'Total Haberes Imp.',
      'Movilización',
      'Colación',
      'Aguinaldo',
      'Otros Haberes No Imp.',
      'Total Haberes No Imp.',
      'Descuento AFP',
      'Descuento Salud',
      'Descuento Cesantía',
      'Descuento Impuesto Único',
      'Total Descuentos Legales',
      'Descuento Préstamos',
      'Descuento Anticipos',
      'Otros Descuentos',
      'Total Otros Descuentos',
      'Aporte AFP Empleador',
      'Aporte SIS Empleador',
      'Aporte AFC Empleador',
      'Total Aportes Empleador',
      'Total Haberes',
      'Total Descuentos',
      'Líquido a Pagar',
    ]

    // Generar filas de datos
    const rows = book.entries.map((entry) => [
      company?.rut || '',
      entry.employee_rut,
      entry.employee_name,
      entry.employee_hire_date || '',
      entry.employee_contract_end_date || '',
      entry.employee_contract_type || '',
      entry.employee_afp,
      entry.employee_health_system,
      entry.employee_health_plan || '',
      entry.employee_position || '',
      entry.employee_cost_center || '',
      entry.days_worked.toString(),
      entry.days_leave.toString(),
      entry.base_salary.toFixed(0),
      entry.monthly_gratification.toFixed(0),
      entry.bonuses.toFixed(0),
      entry.overtime.toFixed(0),
      entry.vacation_paid.toFixed(0),
      entry.other_taxable_earnings.toFixed(0),
      entry.total_taxable_earnings.toFixed(0),
      entry.transportation.toFixed(0),
      entry.meal_allowance.toFixed(0),
      entry.aguinaldo.toFixed(0),
      entry.other_non_taxable_earnings.toFixed(0),
      entry.total_non_taxable_earnings.toFixed(0),
      entry.afp_deduction.toFixed(0),
      entry.health_deduction.toFixed(0),
      entry.unemployment_insurance_deduction.toFixed(0),
      entry.unique_tax_deduction.toFixed(0),
      entry.total_legal_deductions.toFixed(0),
      entry.loans_deduction.toFixed(0),
      entry.advances_deduction.toFixed(0),
      entry.other_deductions.toFixed(0),
      entry.total_other_deductions.toFixed(0),
      entry.employer_afp_contribution.toFixed(0),
      entry.employer_sis_contribution.toFixed(0),
      entry.employer_afc_contribution.toFixed(0),
      entry.total_employer_contributions.toFixed(0),
      entry.total_earnings.toFixed(0),
      entry.total_deductions.toFixed(0),
      entry.net_pay.toFixed(0),
    ])

    // Convertir a CSV
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    // Retornar como archivo CSV
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Libro_Remuneraciones_${book.year}_${book.month.toString().padStart(2, '0')}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar libro:', error)
    return NextResponse.json(
      { error: error.message || 'Error al exportar libro' },
      { status: 500 }
    )
  }
}

