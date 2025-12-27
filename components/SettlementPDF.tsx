'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer'
import { formatDate } from '@/lib/utils/date'
import { formatDateLegal } from '@/lib/utils/contractText'
import { formatCurrency, numberToWords } from '@/lib/services/payrollCalculator'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 15,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  rowTwoCol: {
    flexDirection: 'row',
    marginBottom: 4,
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
    marginHorizontal: 'auto',
    width: '70%',
    alignSelf: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  tableHeader: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  tableCellDescription: {
    width: '60%',
    paddingHorizontal: 5,
    fontSize: 8,
  },
  tableCellAmount: {
    width: '40%',
    paddingHorizontal: 5,
    textAlign: 'right',
    fontSize: 8,
  },
  totalRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    width: '70%',
    alignSelf: 'center',
  },
  totalLabel: {
    width: '60%',
  },
  totalAmount: {
    width: '40%',
    textAlign: 'right',
  },
  declaration: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#000',
    fontSize: 8,
    lineHeight: 1.4,
  },
  footer: {
    marginTop: 24,
    paddingTop: 20,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  signatureBox: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    textAlign: 'center',
    fontSize: 8,
  },
  pagination: {
    position: 'absolute',
    top: 20,
    right: 40,
    fontSize: 9,
    color: '#666',
  },
})

interface SettlementPDFProps {
  settlement: any
  employee: any
  company: any
}

// Componente interno para el Document
const SettlementDocument = ({ settlement, employee, company, generateFileName }: any) => {
  // Separar items en haberes y descuentos
  const earnings = settlement.items?.filter((item: any) => item.type === 'earning') || []
  const deductions = settlement.items?.filter((item: any) => item.type === 'deduction') || []

  return (
    <Document title={generateFileName()}>
      <Page size="A4" style={styles.page}>
        {/* Encabezado: empresa a la izquierda, paginador a la derecha - misma altura */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          {/* Datos de la empresa - esquina superior izquierda */}
          <View style={{ flex: 1 }}>
            {company && (
              <>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>
                  {company.name || ''}
                </Text>
                <Text style={{ fontSize: 9 }}>{company.employer_name || ''}</Text>
                <Text style={{ fontSize: 9 }}>RUT: {company.rut || ''}</Text>
                {company.address && <Text style={{ fontSize: 9 }}>{company.address}</Text>}
                {company.city && <Text style={{ fontSize: 9 }}>{company.city}</Text>}
              </>
            )}
          </View>

          {/* Paginador y ID - esquina superior derecha */}
          <View style={{ width: 200, alignItems: 'flex-end' }} fixed>
            <Text
              style={{ fontSize: 9, color: '#666', textAlign: 'right', width: '100%' }}
              render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages} páginas`}
            />
            {settlement.settlement_number && (
              <Text style={{ marginTop: 2, fontSize: 8, color: '#666', textAlign: 'right', width: '100%' }}>
                {settlement.settlement_number}
              </Text>
            )}
          </View>
        </View>

        {/* Título */}
        <Text style={styles.title}>FINIQUITO</Text>

        {/* Párrafo introductorio: Relación laboral */}
        <View style={[styles.section, { marginTop: 13.5 }]}>
          <Text style={{ textAlign: 'justify', lineHeight: 1.5, fontSize: 9 }}>
            Entre <Text style={{ fontFamily: 'Helvetica-Bold' }}>{company?.employer_name || company?.name || 'el empleador'}</Text>, RUT {company?.rut || 'N/A'}, 
            en adelante "el Empleador", y <Text style={{ fontFamily: 'Helvetica-Bold' }}>{employee?.full_name || 'el trabajador'}</Text>, RUT {employee?.rut || 'N/A'}, 
            en adelante "el Trabajador", se establece que la relación laboral entre las partes se inició el día{' '}
            {settlement.contract_start_date 
              ? formatDateLegal(settlement.contract_start_date)
              : 'N/A'}{' '}
            y finalizó el día{' '}
            {settlement.termination_date 
              ? formatDateLegal(settlement.termination_date)
              : 'N/A'}{' '}
            por aplicación del artículo <Text style={{ fontFamily: 'Helvetica-Bold' }}>{settlement.cause?.article || 'N/A'}</Text> del Código del Trabajo, 
            correspondiente a la causal "<Text style={{ fontFamily: 'Helvetica-Bold' }}>{settlement.cause?.label || 'N/A'}</Text>". El Trabajador prestó servicios 
            en el cargo de {employee?.position || settlement.contract?.position || 'N/A'} durante {settlement.service_years_effective || 0} año(s) efectivo(s)
            {settlement.service_years_capped < settlement.service_years_effective && 
              `, siendo ${settlement.service_years_capped} año(s) los considerados para el cálculo de indemnización según la normativa vigente`
            }.
          </Text>
        </View>

        {/* PRIMERO: Detalle de pagos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRIMERO: Detalle de Pagos</Text>

          {/* Tabla de Haberes */}
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCellDescription}>DESCRIPCIÓN</Text>
              <Text style={styles.tableCellAmount}>MONTO</Text>
            </View>
            {earnings.map((item: any, index: number) => (
              <View key={item.id || index} style={styles.tableRow}>
                <Text style={styles.tableCellDescription}>{item.description}</Text>
                <Text style={styles.tableCellAmount}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}
          </View>

          {/* Total Haberes */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL HABERES:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(settlement.total_earnings)}</Text>
          </View>

          {/* Tabla de Descuentos */}
          {deductions.length > 0 && (
            <>
              <View style={[styles.table, { marginTop: 15 }]}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={styles.tableCellDescription}>DESCUENTOS</Text>
                  <Text style={styles.tableCellAmount}>MONTO</Text>
                </View>
                {deductions.map((item: any, index: number) => (
                  <View key={item.id || index} style={styles.tableRow}>
                    <Text style={styles.tableCellDescription}>{item.description}</Text>
                    <Text style={styles.tableCellAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
              </View>

              {/* Total Descuentos */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL DESCUENTOS:</Text>
                <Text style={styles.totalAmount}>{formatCurrency(settlement.total_deductions)}</Text>
              </View>
            </>
          )}

          {/* Líquido a Pagar */}
          <View style={[styles.totalRow, { marginTop: 15, fontSize: 12 }]}>
            <Text style={styles.totalLabel}>LÍQUIDO A PAGAR:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(settlement.net_to_pay)}</Text>
          </View>

          <View style={{ marginTop: 5, width: '70%', alignSelf: 'center' }}>
            <Text style={{ fontSize: 8, fontStyle: 'italic', textAlign: 'right' }}>
              ({numberToWords(Math.round(settlement.net_to_pay)).toLowerCase()} pesos)
            </Text>
          </View>
        </View>

        {/* SEGUNDO: Declaración de finiquito */}
        <View style={styles.section}>
          <Text style={{ textAlign: 'justify', lineHeight: 1.5, fontSize: 9 }}>
            <Text style={styles.sectionTitle}>SEGUNDO:</Text>{' '}
            Por medio del presente documento, el trabajador declara haber recibido del empleador 
            la suma de {formatCurrency(settlement.net_to_pay)} ({numberToWords(Math.round(settlement.net_to_pay)).toLowerCase()} pesos), 
            que corresponde al pago total de sus haberes, indemnizaciones y demás beneficios legales 
            derivados de la relación laboral que mantenía con la empresa, dejando completamente 
            finiquitada y saldada toda relación contractual, sin que quede pendiente pago alguno 
            por concepto de sueldos, gratificaciones, vacaciones, indemnizaciones, cotizaciones 
            previsionales o cualquier otro beneficio de carácter legal o contractual.
          </Text>
        </View>

        {/* TERCERO: Pensión de alimentos */}
        <View style={styles.section}>
          <Text style={{ textAlign: 'justify', lineHeight: 1.5, fontSize: 9 }}>
            <Text style={styles.sectionTitle}>TERCERO:</Text>{' '}
            Según Ley 21.389, el empleador declara bajo juramento que el trabajador no se encuentra 
            sujeto a la retención judicial de pensión alimenticia, según se acredita con la exhibición 
            de las 3 últimas liquidaciones de sueldo, liberado en este acto al notario autorizante de 
            cualquier responsabilidad por el no pago de esta, quedando dos de ellos en poder del trabajador 
            y uno en poder del empleador.
          </Text>
        </View>

        {/* CUARTO: Ley 21.389 / Retenciones (solo si hay IAS) */}
        {settlement.ias_amount > 0 && (
          <View style={styles.section}>
            <Text style={{ textAlign: 'justify', lineHeight: 1.5, fontSize: 9 }}>
              <Text style={styles.sectionTitle}>CUARTO:</Text>{' '}
              De conformidad con lo dispuesto en la Ley N° 21.389, que establece la retención 
              del 10% de las indemnizaciones por años de servicio (IAS) para el Fondo de 
              Cesantía Solidario, se informa que sobre el monto de la indemnización por años 
              de servicio corresponderán las retenciones legales aplicables según la normativa vigente.
            </Text>
          </View>
        )}

        {/* Firmas */}
        <View style={styles.footer}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text>{employee?.full_name || ''}</Text>
              <Text style={{ fontSize: 7, marginTop: 5 }}>TRABAJADOR</Text>
              <Text style={{ fontSize: 7, marginTop: 2 }}>RUT: {employee?.rut || ''}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text>{company?.employer_name || company?.name || ''}</Text>
              <Text style={{ fontSize: 7, marginTop: 5 }}>EMPLEADOR</Text>
              <Text style={{ fontSize: 7, marginTop: 2 }}>RUT: {company?.rut || ''}</Text>
            </View>
          </View>
        </View>

        {/* Fecha */}
        <View style={{ marginTop: 20, textAlign: 'center' }}>
          <Text style={{ fontSize: 8, textAlign: 'center' }}>
            {formatDateLegal(settlement.termination_date)}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default function SettlementPDF({ settlement, employee, company }: SettlementPDFProps) {
  // Generar nombre del archivo: FINIQUITO-{RUT}-{FECHA}
  const generateFileName = () => {
    const rut = employee?.rut || 'SIN-RUT'
    const terminationDate = settlement?.termination_date 
      ? new Date(settlement.termination_date + 'T00:00:00')
      : new Date()
    const day = String(terminationDate.getDate()).padStart(2, '0')
    const month = String(terminationDate.getMonth() + 1).padStart(2, '0')
    const year = terminationDate.getFullYear()
    return `FINIQUITO-${rut}-${day}-${month}-${year}`
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PDFViewer width="100%" height="100%">
        <SettlementDocument 
          settlement={settlement}
          employee={employee}
          company={company}
          generateFileName={generateFileName}
        />
      </PDFViewer>
    </div>
  )
}

