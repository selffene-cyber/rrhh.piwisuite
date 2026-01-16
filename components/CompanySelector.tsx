'use client'

import { useState } from 'react'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { FaBuilding, FaChevronDown } from 'react-icons/fa'
import './CompanySelector.css'

export default function CompanySelector() {
  const { company, companies, setCurrentCompany, hasMultipleCompanies, loading } = useCurrentCompany()
  const [isOpen, setIsOpen] = useState(false)

  if (loading) {
    return (
      <div className="company-selector loading">
        <FaBuilding /> <span>Cargando...</span>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="company-selector no-company">
        <FaBuilding /> <span>Sin empresa</span>
      </div>
    )
  }

  if (!hasMultipleCompanies) {
    // Si solo tiene una empresa, solo mostrarla sin dropdown
    return (
      <div className="company-selector single">
        <FaBuilding />
        <span className="company-name">{company.name}</span>
      </div>
    )
  }

  const handleCompanyChange = (newCompany: typeof company) => {
    setCurrentCompany(newCompany)
    setIsOpen(false)
    // Recargar la página para actualizar datos
    window.location.reload()
  }

  return (
    <div className="company-selector">
      <button
        className="company-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <FaBuilding />
        <span className="company-name">{company.name}</span>
        <FaChevronDown className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="company-selector-overlay" onClick={() => setIsOpen(false)} />
          <div className="company-selector-dropdown">
            <div className="company-selector-header">
              <FaBuilding />
              <span>Seleccionar Empresa</span>
            </div>
            <div className="company-selector-list">
              {companies.map((comp) => (
                <button
                  key={comp.id}
                  className={`company-selector-item ${comp.id === company.id ? 'active' : ''}`}
                  onClick={() => handleCompanyChange(comp)}
                >
                  <div className="company-item-info">
                    <span className="company-item-name">{comp.name}</span>
                    {comp.rut && (
                      <span className="company-item-rut">RUT: {comp.rut}</span>
                    )}
                  </div>
                  {comp.id === company.id && (
                    <span className="company-item-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

