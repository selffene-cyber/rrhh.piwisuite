'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { ReportFilters as ReportFiltersType, CostCenter } from '@/types'
import { AVAILABLE_AFPS, AVAILABLE_HEALTH_SYSTEMS } from '@/lib/services/previredAPI'

interface ReportFiltersProps {
  filters: ReportFiltersType
  onFiltersChange: (filters: ReportFiltersType) => void
  showCostCenter?: boolean
  showPeriod?: boolean
  showEmployeeStatus?: boolean
  showContractType?: boolean
  showAFP?: boolean
  showHealthSystem?: boolean
  showDateRange?: boolean
}

export default function ReportFilters({
  filters,
  onFiltersChange,
  showCostCenter = true,
  showPeriod = true,
  showEmployeeStatus = true,
  showContractType = true,
  showAFP = true,
  showHealthSystem = true,
  showDateRange = false,
}: ReportFiltersProps) {
  const { companyId } = useCurrentCompany()
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (companyId) {
      loadCostCenters()
    } else {
      setLoading(false)
    }
  }, [companyId])

  const loadCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('company_id', companyId!)
        .eq('status', 'active')
        .order('code', { ascending: true })

      if (error) throw error
      setCostCenters(data || [])
    } catch (error) {
      console.error('Error al cargar centros de costo:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof ReportFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    })
  }

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Filtros</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {showCostCenter && (
          <div className="form-group">
            <label>Centro de Costo</label>
            <select
              value={filters.costCenterId || ''}
              onChange={(e) => handleFilterChange('costCenterId', e.target.value)}
            >
              <option value="">Todos</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.code} - {cc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showPeriod && (
          <>
            <div className="form-group">
              <label>Año</label>
              <select
                value={filters.year || currentYear}
                onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Mes</label>
              <select
                value={filters.month || ''}
                onChange={(e) => handleFilterChange('month', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Todos los meses</option>
                {[
                  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                ].map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {showDateRange && (
          <>
            <div className="form-group">
              <label>Fecha Inicio</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Fecha Fin</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </>
        )}

        {showEmployeeStatus && (
          <div className="form-group">
            <label>Estado del Trabajador</label>
            <select
              value={filters.employeeStatus || ''}
              onChange={(e) => handleFilterChange('employeeStatus', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="licencia_medica">Licencia Médica</option>
              <option value="renuncia">Renuncia</option>
              <option value="despido">Despido</option>
            </select>
          </div>
        )}

        {showContractType && (
          <div className="form-group">
            <label>Tipo de Contrato</label>
            <select
              value={filters.contractType || ''}
              onChange={(e) => handleFilterChange('contractType', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="indefinido">Indefinido</option>
              <option value="plazo_fijo">Plazo Fijo</option>
              <option value="temporal">Temporal</option>
            </select>
          </div>
        )}

        {showAFP && (
          <div className="form-group">
            <label>AFP</label>
            <select
              value={filters.afp || ''}
              onChange={(e) => handleFilterChange('afp', e.target.value)}
            >
              <option value="">Todas</option>
              {AVAILABLE_AFPS.map((afp) => (
                <option key={afp.value} value={afp.value}>
                  {afp.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showHealthSystem && (
          <div className="form-group">
            <label>Sistema de Salud</label>
            <select
              value={filters.healthSystem || ''}
              onChange={(e) => handleFilterChange('healthSystem', e.target.value)}
            >
              <option value="">Todos</option>
              {AVAILABLE_HEALTH_SYSTEMS.map((system) => (
                <option key={system.value} value={system.value}>
                  {system.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div style={{ marginTop: '16px', textAlign: 'right' }}>
        <button
          className="secondary"
          onClick={() => {
            onFiltersChange({
              companyId: filters.companyId,
            })
          }}
        >
          Limpiar Filtros
        </button>
      </div>
    </div>
  )
}





