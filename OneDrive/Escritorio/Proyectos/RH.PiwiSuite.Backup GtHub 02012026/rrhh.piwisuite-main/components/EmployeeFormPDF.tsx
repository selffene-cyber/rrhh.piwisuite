'use client'

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  companyHeader: {
    position: 'absolute',
    top: 20,
    left: 40,
    fontSize: 9,
    color: '#000',
    textAlign: 'left',
  },
  pageNumber: {
    position: 'absolute',
    top: 20,
    right: 40,
    fontSize: 9,
    color: '#666',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 20,
    marginBottom: 10,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  formField: {
    flex: 1,
    marginRight: 15,
  },
  formFieldFull: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
    color: '#333',
  },
  labelRequired: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
    color: '#333',
  },
  inputLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
    minHeight: 16,
  },
  inputLineLarge: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 8,
    minHeight: 24,
  },
  checkboxField: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 5,
    gap: 15,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: 8,
    marginTop: 2,
  },
  note: {
    fontSize: 8,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 3,
  },
  sectionNote: {
    fontSize: 8,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
    marginBottom: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
})

interface EmployeeFormPDFProps {
  company: {
    name: string
    rut?: string
    address?: string
  }
}

export function EmployeeFormPDF({ company }: EmployeeFormPDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.companyHeader}>
          <Text>{company.name}</Text>
          {company.rut && <Text>RUT: {company.rut}</Text>}
          {company.address && <Text>{company.address}</Text>}
        </View>

        {/* Page Number - aparece en todas las páginas */}
        <Text 
          style={styles.pageNumber} 
          render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages} página${totalPages > 1 ? 's' : ''}`}
          fixed
        />

        {/* Title */}
        <Text style={styles.title}>FICHA DE REGISTRO DE TRABAJADOR</Text>
        <Text style={styles.sectionNote}>
          Complete todos los campos solicitados. Los campos marcados con (*) son obligatorios.
        </Text>

        {/* Datos Personales */}
        <Text style={styles.subtitle}>I. DATOS PERSONALES</Text>

        <View style={[styles.formRow, { alignItems: 'flex-end' }]}>
          <View style={styles.formField}>
            <Text style={styles.labelRequired}>Nombre Completo *</Text>
            <View style={styles.inputLineLarge} />
          </View>
          <View style={styles.formField}>
            <Text style={styles.labelRequired}>RUT *</Text>
            <View style={[styles.inputLine, { minHeight: 24, paddingBottom: 8 }]} />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.label}>Fecha de Nacimiento</Text>
            <View style={styles.inputLine} />
            <Text style={styles.note}>Formato: DD/MM/AAAA</Text>
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>Teléfono</Text>
            <View style={styles.inputLine} />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.label}>Dirección</Text>
            <View style={styles.inputLineLarge} />
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={styles.inputLine} />
          </View>
        </View>

        {/* Datos Bancarios */}
        <Text style={styles.subtitle}>II. DATOS BANCARIOS</Text>

        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.label}>Banco</Text>
            <View style={styles.inputLine} />
            <Text style={styles.note}>Ej: Banco de Chile</Text>
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>Tipo de Cuenta</Text>
            <View style={styles.checkboxRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>Corriente</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>Ahorro</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>Vista</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.formFieldFull}>
          <Text style={styles.label}>Número de Cuenta</Text>
          <View style={styles.inputLine} />
          <Text style={styles.note}>Ej: 12345678-9</Text>
        </View>

        {/* Datos Laborales */}
        <Text style={styles.subtitle}>III. DATOS LABORALES</Text>

        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.labelRequired}>Fecha de Ingreso *</Text>
            <View style={styles.inputLine} />
            <Text style={styles.note}>Formato: DD/MM/AAAA</Text>
          </View>
          <View style={styles.formField}>
            <Text style={styles.labelRequired}>Cargo *</Text>
            <View style={styles.inputLine} />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.label}>Centro de Costo</Text>
            <View style={styles.inputLine} />
          </View>
          <View style={styles.formField}>
            <Text style={styles.labelRequired}>Sueldo Base *</Text>
            <View style={styles.inputLine} />
            <Text style={styles.note}>En pesos chilenos</Text>
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.label}>Movilización</Text>
            <View style={styles.inputLine} />
            <Text style={styles.note}>En pesos chilenos</Text>
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>Colación</Text>
            <View style={styles.inputLine} />
            <Text style={styles.note}>En pesos chilenos</Text>
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.label}>Solicita Anticipo?</Text>
            <View style={styles.checkboxRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>Sí</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>No</Text>
              </View>
            </View>
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>Monto del Anticipo (si aplica)</Text>
            <View style={styles.inputLine} />
            <Text style={styles.note}>Máximo: 50% del sueldo base</Text>
          </View>
        </View>
      </Page>

      {/* Segunda Página - Previsión y Salud */}
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.companyHeader}>
          <Text>{company.name}</Text>
          {company.rut && <Text>RUT: {company.rut}</Text>}
          {company.address && <Text>{company.address}</Text>}
        </View>

        {/* Page Number - aparece en todas las páginas */}
        <Text 
          style={styles.pageNumber} 
          render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages} página${totalPages > 1 ? 's' : ''}`}
          fixed
        />

        {/* Previsión y Salud */}
        <View style={[styles.formRow, { marginTop: 30 }]}>
          <View style={styles.formField}>
            <Text style={styles.labelRequired}>AFP *</Text>
            <View style={styles.checkboxRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>PROVIDA</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>HABITAT</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>MODELO</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>CAPITAL</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>PLANVITAL</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>UNO</Text>
              </View>
            </View>
          </View>
          <View style={styles.formField}>
            <Text style={styles.labelRequired}>Sistema de Salud *</Text>
            <View style={styles.checkboxRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>FONASA</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>ISAPRE</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.formFieldFull}>
          <Text style={styles.label}>Plan de Salud</Text>
          <View style={styles.inputLine} />
          <Text style={styles.note}>Nombre del plan (solo si es ISAPRE)</Text>
        </View>

        <View style={styles.formFieldFull}>
          <Text style={styles.label}>Monto del Plan ISAPRE (UF)</Text>
          <View style={styles.inputLine} />
          <Text style={styles.note}>Ej: 2.4 (para 2.4 UF) - Solo si es ISAPRE</Text>
        </View>

        {/* Tipo de Contrato */}
        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.label}>Tipo de Contrato</Text>
            <View style={styles.checkboxRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>Indefinido</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>Plazo Fijo</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.checkbox} />
                <Text style={{ fontSize: 9, marginLeft: 5 }}>Otro</Text>
              </View>
            </View>
          </View>
          <View style={styles.formField}>
            {/* Espacio vacío para mantener el layout */}
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.label}>Fecha Término Contrato</Text>
            <View style={styles.inputLine} />
            <Text style={styles.note}>Formato: DD/MM/AAAA - Solo si es Plazo Fijo</Text>
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>Otro Tipo de Contrato</Text>
            <View style={styles.inputLine} />
            <Text style={styles.note}>Especificar si marcó "Otro"</Text>
          </View>
        </View>

        {/* Observaciones */}
        <Text style={styles.subtitle}>IV. OBSERVACIONES</Text>
        <View style={styles.formFieldFull}>
          <View style={styles.inputLineLarge} />
        </View>
        <View style={styles.formFieldFull}>
          <View style={styles.inputLineLarge} />
        </View>
        <View style={styles.formFieldFull}>
          <View style={styles.inputLineLarge} />
        </View>

        {/* Firma */}
        <View style={{ marginTop: 40, marginBottom: 20, alignItems: 'center' }}>
          <View style={{ width: 200, alignItems: 'center', marginTop: 60 }}>
            <View style={{ borderTopWidth: 1, borderTopColor: '#000', width: '100%', marginBottom: 5 }} />
            <Text style={{ fontSize: 9, textAlign: 'center' }}>Firma del Trabajador</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Este formulario es de carácter confidencial y será utilizado exclusivamente para fines laborales.
        </Text>
      </Page>
    </Document>
  )
}

