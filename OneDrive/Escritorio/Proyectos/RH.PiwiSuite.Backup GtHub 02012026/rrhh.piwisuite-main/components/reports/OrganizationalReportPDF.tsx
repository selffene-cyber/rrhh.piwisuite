import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { OrganizationalReportRow, ReportFilters } from '@/types'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 9,
    marginBottom: 2,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tableCell: {
    fontSize: 9,
    flex: 1,
  },
  tableCellRight: {
    fontSize: 9,
    flex: 0.6,
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: '#666',
  },
})

interface OrganizationalReportPDFProps {
  rows: OrganizationalReportRow[]
  company: any
  filters: ReportFilters
}

export default function OrganizationalReportPDF({ rows, company, filters }: OrganizationalReportPDFProps) {
  const totalEmployees = rows.reduce((sum, row) => sum + row.employee_count, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {company && (
            <>
              <Text style={styles.companyName}>{company.name || 'EMPRESA'}</Text>
              {company.rut && <Text style={styles.companyInfo}>RUT: {company.rut}</Text>}
              {company.address && <Text style={styles.companyInfo}>{company.address}</Text>}
              {company.city && <Text style={styles.companyInfo}>{company.city}</Text>}
            </>
          )}
        </View>

        <Text style={styles.title}>Reporte de Cargos y Estructura Organizacional</Text>

        <View style={{ marginBottom: 20, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 8 }}>Resumen</Text>
          <Text style={{ fontSize: 9 }}>Total Trabajadores: {totalEmployees}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>Centro de Costo</Text>
            <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>Cargo</Text>
            <Text style={[styles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>Trabajadores</Text>
          </View>
          {rows.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>
                {row.cost_center_code ? `${row.cost_center_code} - ${row.cost_center_name}` : 'Sin CC'}
              </Text>
              <Text style={styles.tableCell}>{row.position || 'Sin Cargo'}</Text>
              <Text style={styles.tableCellRight}>{row.employee_count}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Generado el {new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  )
}

