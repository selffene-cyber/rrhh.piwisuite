'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils/date'

interface Company {
  id: string
  code: string | null
  name: string
  employer_name: string
  rut: string
  address: string | null
  city: string | null
  status: string
  created_at: string
  user_count?: number
  employee_count?: number
  owner_email?: string | null
}

export default function AdminCompaniesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Verificar usuario actual
      const response = await fetch('/api/admin/companies')
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert('No tienes permisos para acceder a esta página')
          router.push('/')
          return
        }
        throw new Error(data.error || 'Error al cargar empresas')
      }

      setCompanies(data.companies || [])
    } catch (error: any) {
      alert('Error al cargar empresas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la empresa "${companyName}"? Esta acción eliminará todos los datos asociados y no se puede deshacer.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar empresa')
      }

      alert('Empresa eliminada correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al eliminar empresa: ' + error.message)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Administración de Empresas</h1>
        <Link href="/admin/companies/new">
          <button>Nueva Empresa</button>
        </Link>
      </div>

      <div className="card">
        <h2>Lista de Empresas ({companies.length})</h2>
        {companies.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th style={{ whiteSpace: 'nowrap', minWidth: '120px' }}>RUT</th>
                <th>Empleador</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Usuarios</th>
                <th>Empleados</th>
                <th>Propietario</th>
                <th>Fecha Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#3b82f6', fontSize: '13px' }}>
                      {company.code || '-'}
                    </span>
                  </td>
                  <td>
                    <Link href={`/admin/companies/${company.id}`} style={{ fontWeight: '500', color: '#2563eb' }}>
                      {company.name}
                    </Link>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{company.rut}</td>
                  <td>{company.employer_name}</td>
                  <td>{company.city || '-'}</td>
                  <td>
                    <span className={`badge ${company.status === 'active' ? 'success' : company.status === 'inactive' ? 'warning' : 'danger'}`}>
                      {company.status === 'active' ? 'Activa' : company.status === 'inactive' ? 'Inactiva' : 'Suspendida'}
                    </span>
                  </td>
                  <td>{company.user_count || 0}</td>
                  <td>{company.employee_count || 0}</td>
                  <td>{company.owner_email || '-'}</td>
                  <td>{formatDate(company.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link href={`/admin/companies/${company.id}`}>
                        <button style={{ padding: '4px 8px', fontSize: '12px' }} className="secondary">
                          Editar
                        </button>
                      </Link>
                      <Link href={`/admin/companies/${company.id}/users`}>
                        <button style={{ padding: '4px 8px', fontSize: '12px' }} className="secondary">
                          Usuarios
                        </button>
                      </Link>
                      <button
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        className="danger"
                        onClick={() => handleDeleteCompany(company.id, company.name)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay empresas registradas.</p>
        )}
      </div>
    </div>
  )
}

