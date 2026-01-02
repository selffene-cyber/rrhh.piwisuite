'use client'

import { Document, Page, Text, View, StyleSheet, PDFViewer, Image } from '@react-pdf/renderer'
import { formatDate } from '@/lib/utils/date'
import { formatDateLegal } from '@/lib/utils/contractText'

const styles = StyleSheet.create({
  page: {
    paddingLeft: 85, // 3cm
    paddingRight: 85, // 3cm
    paddingTop: 90,
    paddingBottom: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  companyHeader: {
    position: 'absolute',
    top: 20,
    left: 85,
    fontSize: 9,
    color: '#000',
    textAlign: 'left',
    lineHeight: 1.3,
  },
  pageNumber: {
    position: 'absolute',
    top: 20,
    right: 85,
    fontSize: 9,
    color: '#666',
    textAlign: 'right',
  },
  permissionNumber: {
    position: 'absolute',
    top: 35,
    right: 85,
    fontSize: 9,
    color: '#666',
    textAlign: 'right',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  permissionText: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'justify',
    marginBottom: 15,
  },
  clauseText: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'justify',
    marginBottom: 15,
  },
  clauseTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  signatureSection: {
    marginTop: 40,
    paddingTop: 20,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBox: {
    width: '45%',
    textAlign: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    marginTop: 50,
    paddingTop: 5,
    fontSize: 8,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
})

interface PermissionPDFProps {
  permission: any
  company: any
  employee: any
}

export function PermissionPDF({ permission, company, employee }: PermissionPDFProps) {
  const permissionType = permission.permission_types
  const isWithPay = !permissionType?.affects_payroll

  // Obtener fecha actual en formato correcto para formatDateLegal
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Información de la empresa en esquina superior izquierda */}
        <View style={styles.companyHeader} fixed>
          <Text style={styles.bold}>{company?.name || 'Empresa'}</Text>
          {company?.rut && (
            <Text>RUT: {company.rut}</Text>
          )}
          {company?.address && (
            <Text>{company.address}</Text>
          )}
          {company?.phone && (
            <Text>Tel: {company.phone}</Text>
          )}
        </View>

        {/* Paginador y número de permiso en esquina superior derecha */}
        <View style={styles.pageNumber} fixed>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages} páginas`}
          />
        </View>
        <View style={styles.permissionNumber} fixed>
          <Text>
            {permission.permission_number || `PERM-${permission.id.substring(0, 8).toUpperCase()}`}
          </Text>
        </View>

        {/* Título */}
        <Text style={styles.title}>PERMISO LABORAL</Text>

        {/* Texto introductorio */}
        <Text style={styles.permissionText}>
          En {formatDateLegal(todayStr)}, se otorga permiso laboral al trabajador{' '}
          <Text style={styles.bold}>{employee?.full_name || 'N/A'}</Text>, RUT{' '}
          <Text style={styles.bold}>{employee?.rut || 'N/A'}</Text>, quien se desempeña en el cargo de{' '}
          <Text style={styles.bold}>{employee?.position || 'N/A'}</Text>, de conformidad con lo siguiente:
        </Text>

        {/* PRIMERO */}
        <Text style={styles.clauseText}>
          <Text style={styles.clauseTitle}>PRIMERO:</Text> El presente permiso se otorga por un período de{' '}
          <Text style={styles.bold}>{permission.days}</Text> días hábiles, desde el{' '}
          <Text style={styles.bold}>{formatDateLegal(permission.start_date)}</Text> hasta el{' '}
          <Text style={styles.bold}>{formatDateLegal(permission.end_date)}</Text>, ambos inclusive.
        </Text>

        {/* SEGUNDO */}
        <Text style={styles.clauseText}>
          <Text style={styles.clauseTitle}>SEGUNDO:</Text> El motivo del permiso es:{' '}
          <Text style={styles.bold}>{permission.reason}</Text>.
        </Text>

        {/* TERCERO */}
        <Text style={styles.clauseText}>
          <Text style={styles.clauseTitle}>TERCERO:</Text> El presente permiso es de carácter{' '}
          <Text style={styles.bold}>
            {isWithPay ? 'con goce de sueldo' : 'sin goce de sueldo'}
          </Text>
          {isWithPay ? (
            ', por lo que el trabajador recibirá su remuneración íntegra durante el período de permiso, sin que este afecte su liquidación de sueldo ni sus beneficios laborales.'
          ) : (
            ', por lo que se descontará de la remuneración del trabajador el monto proporcional correspondiente a los días de permiso, conforme a la fórmula establecida en el Código del Trabajo: (sueldo base / 30) × días de permiso. Este descuento se aplicará en la liquidación de sueldo del período correspondiente.'
          )}
        </Text>

        {/* CUARTO (solo si hay notas) */}
        {permission.notes && (
          <Text style={styles.clauseText}>
            <Text style={styles.clauseTitle}>CUARTO:</Text> {permission.notes}
          </Text>
        )}

        {/* Sección de firmas */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}></Text>
              <Text style={{ fontSize: 8, marginTop: 5 }}>{employee?.full_name || 'N/A'}</Text>
              <Text style={{ fontSize: 8, marginTop: 2 }}>RUT: {employee?.rut || 'N/A'}</Text>
              <Text style={{ fontSize: 8, marginTop: 8 }}>FIRMA TRABAJADOR</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}></Text>
              <Text style={{ fontSize: 8, marginTop: 5 }}>{company?.name || 'Empresa'}</Text>
              <Text style={{ fontSize: 8, marginTop: 2 }}>RUT: {company?.rut || 'N/A'}</Text>
              <Text style={{ fontSize: 8, marginTop: 8 }}>FIRMA EMPLEADOR</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// Componente wrapper para visualización
export function PermissionPDFViewer({ permission, company, employee }: PermissionPDFProps) {
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <PDFViewer width="100%" height="100%">
        <PermissionPDF permission={permission} company={company} employee={employee} />
      </PDFViewer>
    </div>
  )
}

export default PermissionPDFViewer

