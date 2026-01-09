'use client'

import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaShieldAlt, FaTools } from 'react-icons/fa'

export default function PrevencionPage() {
  const { company } = useCurrentCompany()

  return (
    <div>
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
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Prevención de Riesgos</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Módulo en construcción
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '64px 32px' }}>
        <div style={{ 
          width: '120px', 
          height: '120px', 
          borderRadius: '50%', 
          background: '#f3f4f6', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 24px',
          color: '#9ca3af'
        }}>
          <FaTools size={48} />
        </div>
        <h2 style={{ margin: '0 0 16px', color: '#374151' }}>Módulo en Construcción</h2>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '16px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
          Este módulo estará disponible próximamente. Aquí podrás gestionar todo lo relacionado con prevención de riesgos, 
          capacitaciones, inspecciones y más.
        </p>
      </div>
    </div>
  )
}








