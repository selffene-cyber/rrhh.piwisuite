import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { HeadcountReportRow, HeadcountSummary, ReportFilters } from '@/types'
import { formatDate } from '@/lib/utils/date'

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
  summarySection: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  summaryTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  summaryLabel: {
    width: '40%',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  summaryValue: {
    width: '60%',
    fontSize: 9,
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
    fontSize: 8,
    flex: 1,
  },
  tableCellSmall: {
    fontSize: 7,
    flex: 0.8,
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

interface HeadcountReportPDFProps {
  rows: HeadcountReportRow[]
  summary: HeadcountSummary
  company: any
  filters: ReportFilters
}

export default function HeadcountReportPDF({ rows, summary, company, filters }: HeadcountReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
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

        {/* Title */}
        <Text style={styles.title}>Reporte de Dotación y Distribución</Text>

        {/* Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Resumen Ejecutivo</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Trabajadores:</Text>
            <Text style={styles.summaryValue}>{summary.totalEmployees}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Centros de Costo:</Text>
            <Text style={styles.summaryValue}>{summary.byCostCenter.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>AFPs Diferentes:</Text>
            <Text style={styles.summaryValue}>{summary.byAFP.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sistemas de Salud:</Text>
            <Text style={styles.summaryValue}>{summary.byHealthSystem.length}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellSmall, { fontFamily: 'Helvetica-Bold' }]}>RUT</Text>
            <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>Nombre</Text>
            <Text style={[styles.tableCellSmall, { fontFamily: 'Helvetica-Bold' }]}>CC</Text>
            <Text style={[styles.tableCellSmall, { fontFamily: 'Helvetica-Bold' }]}>Cargo</Text>
            <Text style={[styles.tableCellSmall, { fontFamily: 'Helvetica-Bold' }]}>AFP</Text>
            <Text style={[styles.tableCellSmall, { fontFamily: 'Helvetica-Bold' }]}>Salud</Text>
            <Text style={[styles.tableCellSmall, { fontFamily: 'Helvetica-Bold' }]}>Contrato</Text>
            <Text style={[styles.tableCellSmall, { fontFamily: 'Helvetica-Bold' }]}>Estado</Text>
          </View>
          {rows.slice(0, 30).map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCellSmall}>{row.rut}</Text>
              <Text style={styles.tableCell}>{row.full_name}</Text>
              <Text style={styles.tableCellSmall}>
                {row.cost_center_code ? `${row.cost_center_code}` : '-'}
              </Text>
              <Text style={styles.tableCellSmall}>{row.position || '-'}</Text>
              <Text style={styles.tableCellSmall}>{row.afp || '-'}</Text>
              <Text style={styles.tableCellSmall}>{row.health_system || '-'}</Text>
              <Text style={styles.tableCellSmall}>{row.contract_type || '-'}</Text>
              <Text style={styles.tableCellSmall}>{row.status}</Text>
            </View>
          ))}
        </View>

        {rows.length > 30 && (
          <Text style={{ fontSize: 8, color: '#666', marginTop: 10 }}>
            Mostrando primeros 30 de {rows.length} trabajadores. Para ver el detalle completo, exporte el reporte en CSV.
          </Text>
        )}

        {/* Footer */}
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





