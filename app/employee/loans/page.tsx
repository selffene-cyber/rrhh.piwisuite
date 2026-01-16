'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaDownload, FaFileInvoiceDollar } from 'react-icons/fa'
import '../employee-portal.css'

interface Loan {
  id: string
  loan_number?: string
  amount: number
  interest_rate: number
  total_amount: number
  installments: number
  installment_amount: number
  status: string
  paid_installments: number
  remaining_amount: number
  loan_date: string
  description?: string
  employee_id: string
}

export default function LoansPage() {
  const [loading, setLoading] = useState(true)
  const [loans, setLoans] = useState<Loan[]>([])
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [employeeId, setEmployeeId] = useState<string | null>(null)

  useEffect(() => {
    loadLoans()
  }, [])

  const loadLoans = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/employee/loans')
      if (response.ok) {
        const data = await response.json()
        setLoans(data.loans || [])
        if (data.loans && data.loans.length > 0) {
          setEmployeeId(data.loans[0].employee_id)
        }
      }
    } catch (err) {
      console.error('Error al cargar préstamos:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const calculateEndDate = (loan: Loan) => {
    // Calcular fecha de término basándose en la fecha de inicio y número de cuotas
    const startDate = new Date(loan.loan_date)
    const monthsToAdd = loan.installments
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + monthsToAdd)
    return endDate
  }

  const handleDownload = async (loan: Loan) => {
    if (!employeeId) return
    
    try {
      const downloadUrl = `/employees/${employeeId}/loans/${loan.id}/pdf`
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        throw new Error(`Error al descargar el PDF: ${response.status}`)
      }
      
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      
      // Generar nombre de archivo
      const date = new Date(loan.loan_date)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      const loanNumber = loan.loan_number || loan.id.substring(0, 8).toUpperCase()
      link.download = `Prestamo_${loanNumber}_${day}-${month}-${year}.pdf`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
    } catch (error) {
      console.error('Error al descargar:', error)
      alert('Error al descargar el documento. Por favor, intente nuevamente.')
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'paid':
        return 'Pagado'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#f59e0b'
      case 'paid':
        return '#10b981'
      case 'cancelled':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Cargando préstamos...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/employee"
          className="back-button-icon"
          style={{ marginBottom: '16px' }}
        >
          <FaArrowLeft />
        </Link>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: '#111827' }}>Mis Préstamos</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
          Historial de préstamos y estado de pagos
        </p>
      </div>

      {loans.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <FaFileInvoiceDollar style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }} />
          <p style={{ color: '#6b7280', margin: 0 }}>
            No hay préstamos disponibles
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loans.map((loan) => {
            const endDate = calculateEndDate(loan)
            const progress = loan.installments > 0 
              ? (loan.paid_installments / loan.installments) * 100 
              : 0

            return (
              <div
                key={loan.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '16px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <FaFileInvoiceDollar style={{ fontSize: '24px', color: '#6366f1' }} />
                      <h3 style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#111827'
                      }}>
                        Préstamo {loan.loan_number || `#${loan.id.substring(0, 8).toUpperCase()}`}
                      </h3>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: `${getStatusColor(loan.status)}20`,
                        color: getStatusColor(loan.status)
                      }}>
                        {getStatusLabel(loan.status)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#6366f1',
                      marginBottom: '8px'
                    }}>
                      {formatCurrency(loan.total_amount)}
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      <div>
                        <span style={{ fontWeight: '500' }}>Monto:</span> {formatCurrency(loan.amount)}
                      </div>
                      <div>
                        <span style={{ fontWeight: '500' }}>Tasa de interés:</span> {loan.interest_rate}%
                      </div>
                      <div>
                        <span style={{ fontWeight: '500' }}>Cuotas:</span> {loan.paid_installments} / {loan.installments}
                      </div>
                      <div>
                        <span style={{ fontWeight: '500' }}>Pendiente:</span> {formatCurrency(loan.remaining_amount)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    height: '8px',
                    background: '#e5e7eb',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: '#6366f1',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginTop: '4px',
                    textAlign: 'right'
                  }}>
                    {Math.round(progress)}% completado
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setSelectedLoan(loan)}
                    style={{
                      padding: '10px 20px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    Ver Detalle
                  </button>
                  <button
                    onClick={() => handleDownload(loan)}
                    style={{
                      padding: '10px 20px',
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      flex: 1
                    }}
                  >
                    <FaDownload size={16} />
                    Descargar PDF
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de detalle */}
      {selectedLoan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setSelectedLoan(null)}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '600px',
            maxHeight: '90vh',
            width: '100%',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                Detalle del Préstamo
              </h2>
              <button
                onClick={() => setSelectedLoan(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Número de Préstamo</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  {selectedLoan.loan_number || `#${selectedLoan.id.substring(0, 8).toUpperCase()}`}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Fecha de Inicio</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                  {formatDate(selectedLoan.loan_date)}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Fecha de Término</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                  {formatDate(calculateEndDate(selectedLoan).toISOString())}
                </p>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '16px',
                marginBottom: '20px'
              }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Monto</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                    {formatCurrency(selectedLoan.amount)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Tasa de Interés</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                    {selectedLoan.interest_rate}%
                  </p>
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '16px',
                marginBottom: '20px'
              }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Cuotas Pagadas</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                    {selectedLoan.paid_installments} / {selectedLoan.installments}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Total a Pagar</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#6366f1' }}>
                    {formatCurrency(selectedLoan.total_amount)}
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Monto Pendiente</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#ef4444' }}>
                  {formatCurrency(selectedLoan.remaining_amount)}
                </p>
              </div>

              {selectedLoan.description && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Descripción</p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#374151' }}>
                    {selectedLoan.description}
                  </p>
                </div>
              )}

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleDownload(selectedLoan)}
                  style={{
                    padding: '12px 24px',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: 1
                  }}
                >
                  <FaDownload size={16} />
                  Descargar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}






