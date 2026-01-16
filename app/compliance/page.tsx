'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { formatDate } from '@/lib/utils/date'
import { 
  FaShieldAlt, 
  FaPlus, 
  FaFilter, 
  FaSort, 
  FaSortUp, 
  FaSortDown,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaTimesCircle,
  FaEye,
  FaEdit,
  FaTrash,
  FaFileUpload,
  FaDownload,
  FaChartBar,
  FaFilePdf,
  FaFileExcel
} from 'react-icons/fa'

const STATUS_LABELS: Record<string, string> = {
  VIGENTE: 'Vigente',
  POR_VENCER: 'Por Vencer',
  VENCIDO: 'Vencido',
  EN_RENOVACION: 'En Renovación',
  EXENTO: 'Exento',
}

const STATUS_COLORS: Record<string, string> = {
  VIGENTE: '#10b981',
  POR_VENCER: '#f59e0b',
  VENCIDO: '#ef4444',
  EN_RENOVACION: '#3b82f6',
  EXENTO: '#6b7280',
}

const TIPO_LABELS: Record<string, string> = {
  CERTIFICADO: 'Certificado',
  LICENCIA: 'Licencia',
  CURSO: 'Curso',
  EXAMEN: 'Examen',
  OTRO: 'Otro',
}

const CRITICIDAD_COLORS: Record<string, string> = {
  ALTA: '#ef4444',
  MEDIA: '#f59e0b',
  BAJA: '#10b981',
}

interface ComplianceData {
  id: string
  employee_id: string
  employee_name: string
  employee_rut: string
  compliance_item_id: string
  item_nombre: string
  item_tipo: string
  item_criticidad: string
  fecha_emision: string
  fecha_vencimiento: string
  status: string
  evidencia_url: string | null
  dias_restantes: number
}

export default function CompliancePage() {
  const { company: currentCompany, companyId } = useCurrentCompany()
  const [loading, setLoading] = useState(true)
  const [complianceData, setComplianceData] = useState<ComplianceData[]>([])
  const [stats, setStats] = useState({
    total: 0,
    vigentes: 0,
    porVencer: 0,
    vencidos: 0,
    enRenovacion: 0,
    criticos: 0, // Vencidos o por vencer con criticidad ALTA
  })
  const [filters, setFilters] = useState({
    tipo: 'all',
    status: 'all',
    criticidad: 'all',
    centroCosto: 'all',
    cargo: 'all',
  })
  const [sortColumn, setSortColumn] = useState<string>('fecha_vencimiento')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showFilters, setShowFilters] = useState(false)
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [positions, setPositions] = useState<string[]>([])

  useEffect(() => {
    if (currentCompany && companyId) {
      loadData()
      loadFilters()
    }
  }, [currentCompany, companyId, filters, sortColumn, sortDirection])

  const loadFilters = async () => {
    if (!companyId) return

    try {
      // Cargar centros de costo
      const { data: ccData } = await supabase
        .from('cost_centers')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name')

      setCostCenters(ccData || [])

      // Cargar cargos únicos
      const { data: employeesData } = await supabase
        .from('employees')
        .select('position')
        .eq('company_id', companyId)
        .eq('status', 'active')

      const uniquePositions = Array.from(
        new Set(employeesData?.map((e: any) => e.position).filter(Boolean) || [])
      ).sort() as string[]

      setPositions(uniquePositions)
    } catch (error) {
      console.error('Error cargando filtros:', error)
    }
  }

  const loadData = async () => {
    if (!companyId) return

    try {
      setLoading(true)

      // Usar la API para cargar cumplimientos
      const params = new URLSearchParams({
        company_id: companyId,
      })
      if (filters.status !== 'all') {
        params.append('status', filters.status)
      }

      const response = await fetch(`/api/compliance/worker?${params.toString()}`)
      if (!response.ok) throw new Error('Error al cargar cumplimientos')
      const data = await response.json()

      // Cargar items de cumplimiento para filtrar por tipo y criticidad
      const itemsResponse = await fetch(`/api/compliance/items?company_id=${companyId}`)
      const items = itemsResponse.ok ? await itemsResponse.json() : []
      const itemsMap = new Map(items.map((item: any) => [item.id, item]))

      // Transformar datos
      let transformed: ComplianceData[] = (data || []).map((item: any) => {
        const complianceItem = itemsMap.get(item.compliance_item_id) as any
        const diasRestantes = Math.ceil(
          (new Date(item.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )

        return {
          id: item.id,
          employee_id: item.employee_id,
          employee_name: item.employees?.full_name || 'N/A',
          employee_rut: item.employees?.rut || 'N/A',
          compliance_item_id: item.compliance_item_id,
          item_nombre: complianceItem?.nombre || item.compliance_items?.nombre || 'N/A',
          item_tipo: complianceItem?.tipo || item.compliance_items?.tipo || 'OTRO',
          item_criticidad: complianceItem?.criticidad || item.compliance_items?.criticidad || 'MEDIA',
          fecha_emision: item.fecha_emision,
          fecha_vencimiento: item.fecha_vencimiento,
          status: item.status,
          evidencia_url: item.evidencia_url,
          dias_restantes: diasRestantes,
        }
      })

      // Aplicar filtros en memoria
      if (filters.tipo !== 'all') {
        transformed = transformed.filter((c) => c.item_tipo === filters.tipo)
      }

      if (filters.criticidad !== 'all') {
        transformed = transformed.filter((c) => c.item_criticidad === filters.criticidad)
      }

      if (filters.centroCosto !== 'all') {
        transformed = transformed.filter((item: any) => {
          const emp = data?.find((d: any) => d.id === item.id)?.employees
          return emp?.cost_center_id === filters.centroCosto
        })
      }

      if (filters.cargo !== 'all') {
        transformed = transformed.filter((item: any) => {
          const emp = data?.find((d: any) => d.id === item.id)?.employees
          return emp?.position === filters.cargo
        })
      }

      // Ordenar
      transformed.sort((a, b) => {
        let aVal: any = a[sortColumn as keyof ComplianceData]
        let bVal: any = b[sortColumn as keyof ComplianceData]

        if (sortColumn === 'fecha_vencimiento' || sortColumn === 'fecha_emision') {
          aVal = new Date(aVal).getTime()
          bVal = new Date(bVal).getTime()
        }

        if (typeof aVal === 'string') aVal = aVal.toLowerCase()
        if (typeof bVal === 'string') bVal = bVal.toLowerCase()

        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
        }
      })

      setComplianceData(transformed)

      // Calcular estadísticas
      const stats = {
        total: transformed.length,
        vigentes: transformed.filter((c) => c.status === 'VIGENTE').length,
        porVencer: transformed.filter((c) => c.status === 'POR_VENCER').length,
        vencidos: transformed.filter((c) => c.status === 'VENCIDO').length,
        enRenovacion: transformed.filter((c) => c.status === 'EN_RENOVACION').length,
        criticos: transformed.filter(
          (c) => (c.status === 'VENCIDO' || c.status === 'POR_VENCER') && c.item_criticidad === 'ALTA'
        ).length,
      }

      setStats(stats)
    } catch (error) {
      console.error('Error cargando cumplimientos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <FaSort style={{ opacity: 0.3 }} />
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
  }

  if (loading && complianceData.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Cargando cumplimientos...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
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
            <FaShieldAlt size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Cumplimientos y Vencimientos</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Gestión de certificados, licencias y cursos obligatorios
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '10px 20px',
              background: showFilters ? '#3b82f6' : 'white',
              color: showFilters ? 'white' : '#3b82f6',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
            }}
          >
            <FaFilter size={16} />
            Filtros
          </button>
          <Link
            href="/compliance/items"
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#3b82f6',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            <FaEye size={16} />
            Ver Ítems
          </Link>
          <Link
            href="/compliance/items?create=true"
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            <FaPlus size={16} />
            Crear Ítem
          </Link>
          <Link
            href="/compliance/assign"
            style={{
              padding: '10px 20px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            <FaFileUpload size={16} />
            Asignar Masivo
          </Link>
          <button
            onClick={() => {
              const params = new URLSearchParams({ company_id: companyId || '' })
              if (filters.status !== 'all') params.append('status', filters.status)
              if (filters.tipo !== 'all') params.append('tipo', filters.tipo)
              if (filters.criticidad !== 'all') params.append('criticidad', filters.criticidad)
              window.open(`/api/compliance/reports/export-pdf?${params.toString()}`, '_blank')
            }}
            style={{
              padding: '10px 20px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
            }}
            title="Exportar a PDF"
          >
            <FaFilePdf size={16} />
            PDF
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams({ company_id: companyId || '' })
              if (filters.status !== 'all') params.append('status', filters.status)
              if (filters.tipo !== 'all') params.append('tipo', filters.tipo)
              if (filters.criticidad !== 'all') params.append('criticidad', filters.criticidad)
              window.open(`/api/compliance/reports/export-excel?${params.toString()}`, '_blank')
            }}
            style={{
              padding: '10px 20px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
            }}
            title="Exportar a Excel"
          >
            <FaFileExcel size={16} />
            Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Tipo
              </label>
              <select
                value={filters.tipo}
                onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                <option value="all">Todos</option>
                <option value="CERTIFICADO">Certificado</option>
                <option value="LICENCIA">Licencia</option>
                <option value="CURSO">Curso</option>
                <option value="EXAMEN">Examen</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                <option value="all">Todos</option>
                <option value="VIGENTE">Vigente</option>
                <option value="POR_VENCER">Por Vencer</option>
                <option value="VENCIDO">Vencido</option>
                <option value="EN_RENOVACION">En Renovación</option>
                <option value="EXENTO">Exento</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Criticidad
              </label>
              <select
                value={filters.criticidad}
                onChange={(e) => setFilters({ ...filters, criticidad: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                <option value="all">Todas</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Centro de Costo
              </label>
              <select
                value={filters.centroCosto}
                onChange={(e) => setFilters({ ...filters, centroCosto: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                <option value="all">Todos</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Cargo
              </label>
              <select
                value={filters.cargo}
                onChange={(e) => setFilters({ ...filters, cargo: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                <option value="all">Todos</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Link href="/compliance/list?status=VIGENTE" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Vigentes</span>
              <FaCheckCircle size={20} color="#10b981" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>{stats.vigentes}</div>
          </div>
        </Link>
        <Link href="/compliance/list?status=POR_VENCER" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Por Vencer</span>
              <FaClock size={20} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>{stats.porVencer}</div>
          </div>
        </Link>
        <Link href="/compliance/list?status=VENCIDO" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Vencidos</span>
              <FaTimesCircle size={20} color="#ef4444" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>{stats.vencidos}</div>
          </div>
        </Link>
        <Link href="/compliance/list?status=EN_RENOVACION" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>En Renovación</span>
              <FaFileUpload size={20} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>{stats.enRenovacion}</div>
          </div>
        </Link>
        <Link href="/compliance/list?criticidad=ALTA&status=VENCIDO,POR_VENCER" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s', background: '#fef2f2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Críticos</span>
              <FaExclamationTriangle size={20} color="#ef4444" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444' }}>{stats.criticos}</div>
          </div>
        </Link>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>Total</span>
            <FaChartBar size={20} color="#6b7280" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>{stats.total}</div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }} onClick={() => handleSort('employee_name')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Trabajador
                  <SortIcon column="employee_name" />
                </div>
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }} onClick={() => handleSort('item_nombre')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Ítem
                  <SortIcon column="item_nombre" />
                </div>
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Tipo</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Criticidad</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }} onClick={() => handleSort('fecha_emision')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Emisión
                  <SortIcon column="fecha_emision" />
                </div>
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }} onClick={() => handleSort('fecha_vencimiento')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Vencimiento
                  <SortIcon column="fecha_vencimiento" />
                </div>
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Días Restantes</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }} onClick={() => handleSort('status')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Estado
                  <SortIcon column="status" />
                </div>
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {complianceData.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  No hay cumplimientos registrados
                </td>
              </tr>
            ) : (
              complianceData.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{item.employee_name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.employee_rut}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{item.item_nombre}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#f3f4f6', fontSize: '12px' }}>
                      {TIPO_LABELS[item.item_tipo]}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: CRITICIDAD_COLORS[item.item_criticidad] + '20',
                        color: CRITICIDAD_COLORS[item.item_criticidad],
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      {item.item_criticidad}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{formatDate(item.fecha_emision)}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{formatDate(item.fecha_vencimiento)}</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: item.dias_restantes < 0 ? '#fee2e2' : item.dias_restantes <= 30 ? '#fef3c7' : '#d1fae5',
                        color: item.dias_restantes < 0 ? '#991b1b' : item.dias_restantes <= 30 ? '#92400e' : '#065f46',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      {item.dias_restantes < 0 ? `Hace ${Math.abs(item.dias_restantes)}` : item.dias_restantes}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        background: STATUS_COLORS[item.status] + '20',
                        color: STATUS_COLORS[item.status],
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <Link
                        href={`/employees/${item.employee_id}/compliance`}
                        style={{ color: '#3b82f6', cursor: 'pointer' }}
                        title="Ver detalle"
                      >
                        <FaEye size={16} />
                      </Link>
                      {item.evidencia_url && (
                        <a
                          href={item.evidencia_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#10b981', cursor: 'pointer' }}
                          title="Descargar evidencia"
                        >
                          <FaDownload size={16} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

