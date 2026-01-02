import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { LeaveReportRow, LeaveSummary, ReportFilters } from '@/types'
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
    width: '50%',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  summaryValue: {
    width: '50%',
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
    flex: 0.7,
  },
  tableCellCenter: {
    fontSize: 8,
    flex: 0.8,
    textAlign: 'center',
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

interface LeavesReportPDFProps {
  rows: LeaveReportRow[]
  summary: LeaveSummary
  company: any
  filters: ReportFilters
}

export default function LeavesReportPDF({ rows, summary, company, filters }: LeavesReportPDFProps) {
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

        <Text style={styles.title}>Reporte de Estados Laborales y Licencias Médicas</Text>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Resumen Ejecutivo</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Licencias Activas:</Text>
            <Text style={styles.summaryValue}>{summary.totalActiveMedicalLeaves}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Días Licencias:</Text>
            <Text style={styles.summaryValue}>{summary.totalMedicalLeaveDays}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trabajadores con Licencias:</Text>
            <Text style={styles.summaryValue}>{summary.employeesWithActiveLeaves}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellSmall, { fontFamily: 'Helvetica-Bold' }]}>RUT</Text>
            <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>Nombre</Text>
            <Text style={[styles.tableCellSmall, { fontFamily: 'Helvetica-Bold' }]}>Estado</Text>
            <Text style={[styles.tableCellCenter, { fontFamily: 'Helvetica-Bold' }]}>Licencia</Text>
            <Text style={[styles.tableCellCenter, { fontFamily: 'Helvetica-Bold' }]}>Días</Text>
            <Text style={[styles.tableCellSmall, { fontFamily: 'Helvetica-Bold' }]}>Inicio</Text>
            <Text style={[styles.tableCellSmall, { fontFamily: 'Helvetica-Bold' }]}>Fin</Text>
          </View>
          {rows.slice(0, 30).map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCellSmall}>{row.rut}</Text>
              <Text style={styles.tableCell}>{row.full_name}</Text>
              <Text style={styles.tableCellSmall}>{row.status}</Text>
              <Text style={styles.tableCellCenter}>{row.medical_leave_active ? 'Sí' : 'No'}</Text>
              <Text style={styles.tableCellCenter}>{row.medical_leave_days || '-'}</Text>
              <Text style={styles.tableCellSmall}>
                {row.medical_leave_start ? formatDate(row.medical_leave_start) : '-'}
              </Text>
              <Text style={styles.tableCellSmall}>
                {row.medical_leave_end ? formatDate(row.medical_leave_end) : '-'}
              </Text>
            </View>
          ))}
        </View>

        {rows.length > 30 && (
          <Text style={{ fontSize: 8, color: '#666', marginTop: 10 }}>
            Mostrando primeros 30 de {rows.length} trabajadores. Para ver el detalle completo, exporte el reporte en CSV.
          </Text>
        )}

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

