'use client'

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatDate, formatMonthYear } from '@/lib/utils/date'
import { formatRut } from '@/lib/utils/rutHelper'
import { PayrollReliquidationWithDetails, RELIQUIDATION_REASON_CATEGORIES } from '@/types'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#dc2626',
  },
  section: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  rowTwoCol: {
    flexDirection: 'row',
    marginBottom: 3,
    justifyContent: 'space-between',
  },
  label: {
    width: '35%',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  value: {
    width: '65%',
    fontSize: 8,
  },
  labelTwoCol: {
    width: '48%',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  valueTwoCol: {
    width: '48%',
    fontSize: 8,
  },
  table: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
  },
  tableCell: {
    fontSize: 8,
    flex: 1,
  },
  tableCellConcept: {
    fontSize: 8,
    flex: 2,
  },
  tableCellBold: {
    fontSize: 8,
    flex: 1,
    fontFamily: 'Helvetica-Bold',
  },
  highlightBox: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  totalRow: {
    flexDirection: 'row',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 2,
    borderTopColor: '#000',
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    fontSize: 7,
    color: '#6b7280',
  },
})

export const ReliquidationDocument = ({ 
  reliquidation, 
  company, 
  generateFileName 
}: { 
  reliquidation: PayrollReliquidationWithDetails
  company: any
  generateFileName: () => string
}) => {
  // Manejar delta (puede ser array o objeto único)
  const deltaRaw = reliquidation.payroll_reliquidation_deltas
  const delta = Array.isArray(deltaRaw) 
    ? (deltaRaw.length > 0 ? deltaRaw[0] : null)
    : deltaRaw
  const items = Array.isArray(reliquidation.payroll_reliquidation_items)
    ? reliquidation.payroll_reliquidation_items
    : (reliquidation.payroll_reliquidation_items || [])
  const referenceSlip = reliquidation.payroll_slips

  // Obtener valores de la liquidación original si está disponible
  const originalSlip = referenceSlip
  const originalTotalEarnings = originalSlip?.total_earnings || 0
  const originalTotalDeductions = originalSlip?.total_deductions || 0
  const originalNetPay = originalSlip?.net_pay || 0
  const originalTotalTaxableEarnings = originalSlip?.total_taxable_earnings || 0
  const originalTotalNonTaxableEarnings = originalSlip?.total_non_taxable_earnings || 0
  const originalTotalLegalDeductions = originalSlip?.total_legal_deductions || 0
  const originalTotalOtherDeductions = originalSlip?.total_other_deductions || 0

  // Calcular valores corregidos desde las diferencias
  const correctedTotalEarnings = originalTotalEarnings + (reliquidation.diff_total_earnings || 0)
  const correctedTotalDeductions = originalTotalDeductions + (reliquidation.diff_total_deductions || 0)
  const correctedNetPay = originalNetPay + (reliquidation.diff_net_pay || 0)
  const correctedTotalTaxableEarnings = originalTotalTaxableEarnings + (reliquidation.diff_taxable_earnings || 0)
  const correctedTotalNonTaxableEarnings = originalTotalNonTaxableEarnings + (reliquidation.diff_non_taxable_earnings || 0)
  const correctedTotalLegalDeductions = originalTotalLegalDeductions + (reliquidation.diff_legal_deductions || 0)
  const correctedTotalOtherDeductions = originalTotalOtherDeductions + (reliquidation.diff_other_deductions || 0)

  // Si no hay delta, construir uno desde los valores de la reliquidación y la liquidación original
  const effectiveDelta = delta || {
    original_total_taxable_earnings: originalTotalTaxableEarnings,
    original_total_non_taxable_earnings: originalTotalNonTaxableEarnings,
    original_total_earnings: originalTotalEarnings,
    original_total_legal_deductions: originalTotalLegalDeductions,
    original_total_other_deductions: originalTotalOtherDeductions,
    original_total_deductions: originalTotalDeductions,
    original_net_pay: originalNetPay,
    corrected_total_taxable_earnings: correctedTotalTaxableEarnings,
    corrected_total_non_taxable_earnings: correctedTotalNonTaxableEarnings,
    corrected_total_earnings: correctedTotalEarnings,
    corrected_total_legal_deductions: correctedTotalLegalDeductions,
    corrected_total_other_deductions: correctedTotalOtherDeductions,
    corrected_total_deductions: correctedTotalDeductions,
    corrected_net_pay: correctedNetPay,
    diff_total_taxable_earnings: reliquidation.diff_taxable_earnings || 0,
    diff_total_non_taxable_earnings: reliquidation.diff_non_taxable_earnings || 0,
    diff_total_earnings: reliquidation.diff_total_earnings || 0,
    diff_total_legal_deductions: reliquidation.diff_legal_deductions || 0,
    diff_total_other_deductions: reliquidation.diff_other_deductions || 0,
    diff_total_deductions: reliquidation.diff_total_deductions || 0,
    diff_net_pay: reliquidation.diff_net_pay || 0,
  }

  return (
    <Document title={generateFileName()}>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          {company && (
            <>
              <Text>{company.name || ''}</Text>
              <Text>{company.employer_name || ''}</Text>
              <Text>{company.rut ? formatRut(company.rut) : ''}</Text>
              {company.address && <Text>{company.address}</Text>}
              {company.city && <Text>{company.city}</Text>}
            </>
          )}
          <Text style={styles.title}>RELIQUIDACIÓN DE REMUNERACIONES</Text>
          <Text style={styles.subtitle}>
            {reliquidation.type === 'rectificatoria' ? 'RECTIFICATORIA' : 'COMPLEMENTARIA'}
          </Text>
        </View>

        {/* Información de referencia */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>
              Referencia a liquidación original:
            </Text>
            {referenceSlip && (
              <Text style={{ fontSize: 8 }}>
                {' '}Liquidación original emitida el: {referenceSlip.issued_at ? 
                  formatDate(referenceSlip.issued_at, 'dd/MM/yyyy') : 
                  formatDate(referenceSlip.created_at, 'dd/MM/yyyy')
                } / Motivo: {RELIQUIDATION_REASON_CATEGORIES[reliquidation.reason_category as keyof typeof RELIQUIDATION_REASON_CATEGORIES]}
              </Text>
            )}
          </View>
          {reliquidation.reason_text && (
            <View style={styles.row}>
              <Text style={{ fontSize: 8 }}>
                {reliquidation.reason_text}
              </Text>
            </View>
          )}
        </View>

        {/* Datos del trabajador */}
        <View style={styles.section}>
          <View style={styles.rowTwoCol}>
            <View style={{ width: '48%' }}>
              <View style={styles.row}>
                <Text style={styles.labelTwoCol}>NOMBRE:</Text>
                <Text style={styles.valueTwoCol}>{reliquidation.employees?.full_name || ''}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.labelTwoCol}>RUT:</Text>
                <Text style={styles.valueTwoCol}>
                  {reliquidation.employees?.rut ? formatRut(reliquidation.employees.rut) : ''}
                </Text>
              </View>
            </View>
            <View style={{ width: '48%' }}>
              <View style={styles.row}>
                <Text style={styles.labelTwoCol}>PERÍODO:</Text>
                <Text style={styles.valueTwoCol}>
                  {reliquidation.payroll_periods ? 
                    formatMonthYear(reliquidation.payroll_periods.year, reliquidation.payroll_periods.month) : 
                    '-'
                  }
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.labelTwoCol}>FECHA RELIQUIDACIÓN:</Text>
                <Text style={styles.valueTwoCol}>
                  {formatDate(reliquidation.created_at, 'dd/MM/yyyy')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tabla Comparativa de Items Modificados */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 8, textAlign: 'center' }}>
              DETALLE DE CONCEPTOS MODIFICADOS
            </Text>
            
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellConcept, { fontFamily: 'Helvetica-Bold' }]}>Concepto</Text>
                <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>Original</Text>
                <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>Corregido</Text>
                <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>Diferencia</Text>
              </View>
              
              {items.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCellConcept}>{item.description.toUpperCase()}</Text>
                  <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                    ${(item.original_amount ?? 0).toLocaleString('es-CL')}
                  </Text>
                  <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                    ${(item.corrected_amount ?? 0).toLocaleString('es-CL')}
                  </Text>
                  <Text style={[
                    styles.tableCell, 
                    { 
                      textAlign: 'right',
                      color: (item.difference ?? 0) >= 0 ? '#059669' : '#dc2626',
                      fontFamily: (item.difference ?? 0) !== 0 ? 'Helvetica-Bold' : 'Helvetica'
                    }
                  ]}>
                    {(item.difference ?? 0) >= 0 ? '+' : ''}${(item.difference ?? 0).toLocaleString('es-CL')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tabla Comparativa de Totales */}
        {effectiveDelta && (
          <View style={styles.section}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 8, textAlign: 'center' }}>
              COMPARACIÓN DE TOTALES: ANTES / DESPUÉS
            </Text>
            
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellConcept, { fontFamily: 'Helvetica-Bold' }]}>Concepto</Text>
                <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>Original</Text>
                <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>Corregido</Text>
                <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}>Diferencia</Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={styles.tableCellConcept}>TOTAL HABERES IMPONIBLES</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${(effectiveDelta.original_total_taxable_earnings ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${(effectiveDelta.corrected_total_taxable_earnings ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[
                  styles.tableCell, 
                  { 
                    textAlign: 'right',
                    color: (effectiveDelta.diff_total_taxable_earnings ?? 0) >= 0 ? '#059669' : '#dc2626',
                    fontFamily: 'Helvetica-Bold'
                  }
                ]}>
                  {(effectiveDelta.diff_total_taxable_earnings ?? 0) >= 0 ? '+' : ''}${(effectiveDelta.diff_total_taxable_earnings ?? 0).toLocaleString('es-CL')}
                </Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={styles.tableCellConcept}>TOTAL HABERES NO IMPONIBLES</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${(effectiveDelta.original_total_non_taxable_earnings ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${(effectiveDelta.corrected_total_non_taxable_earnings ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[
                  styles.tableCell, 
                  { 
                    textAlign: 'right',
                    color: (effectiveDelta.diff_total_non_taxable_earnings ?? 0) >= 0 ? '#059669' : '#dc2626',
                    fontFamily: 'Helvetica-Bold'
                  }
                ]}>
                  {(effectiveDelta.diff_total_non_taxable_earnings ?? 0) >= 0 ? '+' : ''}${(effectiveDelta.diff_total_non_taxable_earnings ?? 0).toLocaleString('es-CL')}
                </Text>
              </View>
              
              <View style={[styles.tableRow, { fontFamily: 'Helvetica-Bold', backgroundColor: '#f3f4f6' }]}>
                <Text style={styles.tableCellConcept}>TOTAL HABERES</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${(effectiveDelta.original_total_earnings ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${(effectiveDelta.corrected_total_earnings ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[
                  styles.tableCell, 
                  { 
                    textAlign: 'right',
                    color: (effectiveDelta.diff_total_earnings ?? 0) >= 0 ? '#059669' : '#dc2626'
                  }
                ]}>
                  {(effectiveDelta.diff_total_earnings ?? 0) >= 0 ? '+' : ''}${(effectiveDelta.diff_total_earnings ?? 0).toLocaleString('es-CL')}
                </Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={styles.tableCellConcept}>TOTAL DESCUENTOS LEGALES</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${(effectiveDelta.original_total_legal_deductions ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${(effectiveDelta.corrected_total_legal_deductions ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[
                  styles.tableCell, 
                  { 
                    textAlign: 'right',
                    color: (effectiveDelta.diff_total_legal_deductions ?? 0) >= 0 ? '#dc2626' : '#059669',
                    fontFamily: 'Helvetica-Bold'
                  }
                ]}>
                  {(effectiveDelta.diff_total_legal_deductions ?? 0) >= 0 ? '+' : ''}${(effectiveDelta.diff_total_legal_deductions ?? 0).toLocaleString('es-CL')}
                </Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={styles.tableCellConcept}>TOTAL OTROS DESCUENTOS</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${(effectiveDelta.original_total_other_deductions ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${(effectiveDelta.corrected_total_other_deductions ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[
                  styles.tableCell, 
                  { 
                    textAlign: 'right',
                    color: (effectiveDelta.diff_total_other_deductions ?? 0) >= 0 ? '#dc2626' : '#059669',
                    fontFamily: 'Helvetica-Bold'
                  }
                ]}>
                  {(effectiveDelta.diff_total_other_deductions ?? 0) >= 0 ? '+' : ''}${(effectiveDelta.diff_total_other_deductions ?? 0).toLocaleString('es-CL')}
                </Text>
              </View>
              
              <View style={[styles.tableRow, { fontFamily: 'Helvetica-Bold', backgroundColor: '#f3f4f6' }]}>
                <Text style={styles.tableCellConcept}>TOTAL DESCUENTOS</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${(effectiveDelta.original_total_deductions ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${(effectiveDelta.corrected_total_deductions ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[
                  styles.tableCell, 
                  { 
                    textAlign: 'right',
                    color: (effectiveDelta.diff_total_deductions ?? 0) >= 0 ? '#dc2626' : '#059669'
                  }
                ]}>
                  {(effectiveDelta.diff_total_deductions ?? 0) >= 0 ? '+' : ''}${(effectiveDelta.diff_total_deductions ?? 0).toLocaleString('es-CL')}
                </Text>
              </View>
              
              <View style={[styles.tableRow, { 
                fontFamily: 'Helvetica-Bold', 
                fontSize: 10,
                backgroundColor: '#fef3c7',
                borderTopWidth: 2,
                borderTopColor: '#000',
                marginTop: 5
              }]}>
                <Text style={styles.tableCellConcept}>LÍQUIDO A PAGAR</Text>
                <Text style={[styles.tableCell, { textAlign: 'right', fontSize: 9 }]}>
                  ${(effectiveDelta.original_net_pay ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[styles.tableCell, { textAlign: 'right', fontSize: 9 }]}>
                  ${(effectiveDelta.corrected_net_pay ?? 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[
                  styles.tableCell, 
                  { 
                    textAlign: 'right',
                    fontSize: 10,
                    color: (effectiveDelta.diff_net_pay ?? 0) >= 0 ? '#059669' : '#dc2626'
                  }
                ]}>
                  {(effectiveDelta.diff_net_pay ?? 0) >= 0 ? '+' : ''}${(effectiveDelta.diff_net_pay ?? 0).toLocaleString('es-CL')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Totales */}
        {delta && (
          <View style={styles.section}>
            <View style={styles.totalRow}>
              <Text style={{ width: '40%', fontSize: 9, fontFamily: 'Helvetica-Bold' }}>TOTAL HABERES:</Text>
              <Text style={{ width: '20%', fontSize: 8, textAlign: 'right' }}>
                ${delta.original_total_earnings?.toLocaleString('es-CL')}
              </Text>
              <Text style={{ width: '20%', fontSize: 8, textAlign: 'right' }}>
                ${delta.corrected_total_earnings?.toLocaleString('es-CL')}
              </Text>
              <Text style={{ 
                width: '20%', 
                fontSize: 8, 
                textAlign: 'right',
                color: delta.diff_total_earnings >= 0 ? '#059669' : '#dc2626'
              }}>
                {delta.diff_total_earnings >= 0 ? '+' : ''}${delta.diff_total_earnings.toLocaleString('es-CL')}
              </Text>
            </View>
            
            <View style={styles.totalRow}>
              <Text style={{ width: '40%', fontSize: 9, fontFamily: 'Helvetica-Bold' }}>TOTAL DESCUENTOS:</Text>
              <Text style={{ width: '20%', fontSize: 8, textAlign: 'right' }}>
                ${delta.original_total_deductions?.toLocaleString('es-CL')}
              </Text>
              <Text style={{ width: '20%', fontSize: 8, textAlign: 'right' }}>
                ${delta.corrected_total_deductions?.toLocaleString('es-CL')}
              </Text>
              <Text style={{ 
                width: '20%', 
                fontSize: 8, 
                textAlign: 'right',
                color: delta.diff_total_deductions >= 0 ? '#dc2626' : '#059669'
              }}>
                {delta.diff_total_deductions >= 0 ? '+' : ''}${delta.diff_total_deductions.toLocaleString('es-CL')}
              </Text>
            </View>
            
            <View style={[styles.totalRow, { backgroundColor: '#fef3c7', padding: 8, marginTop: 10 }]}>
              <Text style={{ width: '40%', fontSize: 10, fontFamily: 'Helvetica-Bold' }}>LÍQUIDO A PAGAR:</Text>
              <Text style={{ width: '20%', fontSize: 9, textAlign: 'right' }}>
                ${delta.original_net_pay?.toLocaleString('es-CL')}
              </Text>
              <Text style={{ width: '20%', fontSize: 9, textAlign: 'right' }}>
                ${delta.corrected_net_pay?.toLocaleString('es-CL')}
              </Text>
              <Text style={{ 
                width: '20%', 
                fontSize: 10, 
                textAlign: 'right',
                fontFamily: 'Helvetica-Bold',
                color: delta.diff_net_pay >= 0 ? '#059669' : '#dc2626'
              }}>
                {delta.diff_net_pay >= 0 ? '+' : ''}${delta.diff_net_pay.toLocaleString('es-CL')}
              </Text>
            </View>

            {(effectiveDelta.diff_net_pay ?? 0) > 0 && (
              <View style={{ marginTop: 10, padding: 8, backgroundColor: '#d1fae5', borderRadius: 4 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>
                  MONTO ADICIONAL A PAGAR: ${(effectiveDelta.diff_net_pay ?? 0).toLocaleString('es-CL')}
                </Text>
              </View>
            )}

            {(effectiveDelta.diff_net_pay ?? 0) < 0 && (
              <View style={{ marginTop: 10, padding: 8, backgroundColor: '#fee2e2', borderRadius: 4 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>
                  MONTO A DESCONTAR EN PRÓXIMA LIQUIDACIÓN: ${Math.abs(effectiveDelta.diff_net_pay ?? 0).toLocaleString('es-CL')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ textAlign: 'center', marginBottom: 5 }}>
            Documento generado el {formatDate(new Date().toISOString(), 'dd/MM/yyyy HH:mm')}
          </Text>
          <Text style={{ textAlign: 'center' }}>
            Este documento es una reliquidación de la liquidación original y debe ser conservado junto con ella.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
