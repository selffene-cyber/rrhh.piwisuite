'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { CostCenter } from '@/types'
import {
  getCostCenters,
  getUserCostCenters,
  assignCostCentersToUser,
  isCompanyAdmin,
} from '@/lib/services/costCenterService'
import { FaBuilding, FaSave } from 'react-icons/fa'
import { isSuperAdmin } from '@/lib/services/auth'

export default function UserCostCentersPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = params.userId as string
  const { companyId: contextCompanyId, company } = useCurrentCompany()
  // Usar company_id de query params si está disponible, sino del contexto
  const queryCompanyId = searchParams.get('company_id')
  const companyId = queryCompanyId || contextCompanyId
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [allCostCenters, setAllCostCenters] = useState<CostCenter[]>([])
  const [userCostCenters, setUserCostCenters] = useState<CostCenter[]>([])
  const [selectedCostCenterIds, setSelectedCostCenterIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [companyInfo, setCompanyInfo] = useState<any>(null)

  useEffect(() => {
    if (companyId && userId) {
      checkPermissions()
      loadData()
    }
  }, [companyId, userId])

  const checkPermissions = async () => {
    if (!companyId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // Verificar si es super admin
      const superAdmin = await isSuperAdmin()
      if (superAdmin) {
        setIsAdmin(true)
        return
      }
      
      // Verificar si es admin de la empresa
      const admin = await isCompanyAdmin(user.id, companyId, supabase)
      setIsAdmin(admin)
      if (!admin) {
        alert('No tienes permisos para gestionar centros de costo')
        router.push('/admin/users')
        return
      }
    } catch (error) {
      console.error('Error verificando permisos:', error)
    }
  }

  const loadData = async () => {
    if (!companyId || !userId) return

    try {
      setLoading(true)

      // Cargar información del usuario
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      setUserInfo(userProfile)

      // Cargar información de la empresa
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', companyId)
        .single()

      setCompanyInfo(companyData || company)

      // Cargar todos los CC activos (admin ve todos)
      const allCC = await getCostCenters(companyId, supabase, false)
      setAllCostCenters(allCC)

      // Cargar CC asignados al usuario
      const userCC = await getUserCostCenters(userId, companyId, supabase)
      setUserCostCenters(userCC)
      setSelectedCostCenterIds(userCC.map(cc => cc.id))
    } catch (error: any) {
      alert('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleCostCenter = (costCenterId: string) => {
    setSelectedCostCenterIds(prev => {
      if (prev.includes(costCenterId)) {
        return prev.filter(id => id !== costCenterId)
      } else {
        return [...prev, costCenterId]
      }
    })
  }

  const handleSave = async () => {
    if (!companyId || !userId) return

    setSaving(true)
    try {
      await assignCostCentersToUser(userId, companyId, selectedCostCenterIds, supabase)
      alert('Centros de costo asignados correctamente')
      loadData()
    } catch (error: any) {
      alert('Error al guardar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link href={queryCompanyId ? "/admin/users" : "/admin/companies"}>
          ← Volver {queryCompanyId ? "a Usuarios" : "a Empresas"}
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6'
          }}>
            <FaBuilding size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Asignar Centros de Costo</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              {userInfo?.full_name || userInfo?.email || 'Usuario'} - {companyInfo?.name || 'Empresa'}
            </p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaSave /> {saving ? 'Guardando...' : 'Guardar Asignaciones'}
        </button>
      </div>

      <div className="card">
        <h2>Centros de Costo Disponibles</h2>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>
          Selecciona los centros de costo que este usuario podrá gestionar. Los usuarios con rol "admin" o "owner" tienen acceso a todos los centros de costo automáticamente.
        </p>

        {allCostCenters.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No hay centros de costo disponibles. Crea algunos en el catálogo primero.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
            {allCostCenters.map((cc) => (
              <label
                key={cc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  border: selectedCostCenterIds.includes(cc.id) ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: selectedCostCenterIds.includes(cc.id) ? '#eff6ff' : 'white',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedCostCenterIds.includes(cc.id)}
                  onChange={() => handleToggleCostCenter(cc.id)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{cc.code}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>{cc.name}</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {userCostCenters.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h2>Centros de Costo Actualmente Asignados</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {userCostCenters.map((cc) => (
              <span
                key={cc.id}
                className="badge"
                style={{
                  backgroundColor: '#3b82f620',
                  color: '#3b82f6',
                  border: '1px solid #3b82f6',
                  padding: '6px 12px',
                }}
              >
                {cc.code} - {cc.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}





