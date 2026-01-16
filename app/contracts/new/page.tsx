'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import DateInput from '@/components/DateInput'
import { formatNumberForInput, parseFormattedNumber } from '@/lib/utils/formatNumber'
import { useCurrentCompany } from '@/lib/hooks/useCurrentCompany'
import { createValidationServices } from '@/lib/services/validationHelpers'

// Componente ToggleSwitch simple
const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ display: 'none' }}
        />
        <div
          style={{
            width: '48px',
            height: '24px',
            borderRadius: '12px',
            background: checked ? '#3b82f6' : '#d1d5db',
            position: 'relative',
            transition: 'background 0.2s',
            cursor: 'pointer',
          }}
          onClick={() => onChange(!checked)}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '2px',
              left: checked ? '26px' : '2px',
              transition: 'left 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
        </div>
        {label && <span style={{ marginLeft: '8px', fontSize: '14px' }}>{label}</span>}
      </label>
    </div>
  )
}

// Lista de bonos disponibles (igual que en liquidación individual)
const AVAILABLE_BONUSES = [
  'Bono de Producción',
  'Bono de Cumplimiento de Metas / KPI',
  'Bono de Desempeño',
  'Bono de Asistencia',
  'Bono de Puntualidad',
  'Bono de Responsabilidad',
  'Bono por Turno',
  'Bono por Trabajo en Altura',
  'Bono por Trabajo en Faena',
  'Bono de Disponibilidad',
  'Bono por Zona / Zona Extrema',
  'Bono de Permanencia',
  'Bono de Retención',
  'Bono de Riesgo',
]

// Plantillas de contratos según tipo
const contractTemplates = {
  indefinido: {
    confidentiality_clause: `El trabajador se compromete a mantener absoluta confidencialidad sobre toda información, datos, procesos, estrategias comerciales, listas de clientes, proveedores, métodos de trabajo, tecnologías, secretos industriales y cualquier otra información de carácter confidencial a la que tenga acceso en razón de sus funciones, tanto durante la vigencia del contrato como después de su término, sin límite de tiempo.`,
    authorized_deductions: `El empleador queda autorizado para descontar de las remuneraciones del trabajador los siguientes conceptos: cotizaciones previsionales (AFP, salud, seguro de cesantía), impuestos legales, anticipos de remuneraciones otorgados, préstamos otorgados por la empresa, y cualquier otro descuento autorizado por ley o pactado entre las partes.`,
    advances_clause: `El trabajador podrá solicitar anticipos de remuneraciones, los cuales serán descontados íntegramente en la liquidación del período correspondiente, previa autorización del empleador.`,
    internal_regulations: `El trabajador se compromete a cumplir con el reglamento interno de la empresa, así como con todas las políticas, procedimientos y normas establecidas por el empleador, las que forman parte integrante del presente contrato.`,
  },
  plazo_fijo: {
    confidentiality_clause: `El trabajador se compromete a mantener absoluta confidencialidad sobre toda información, datos, procesos, estrategias comerciales, listas de clientes, proveedores, métodos de trabajo, tecnologías, secretos industriales y cualquier otra información de carácter confidencial a la que tenga acceso en razón de sus funciones, tanto durante la vigencia del contrato como después de su término, sin límite de tiempo.`,
    authorized_deductions: `El empleador queda autorizado para descontar de las remuneraciones del trabajador los siguientes conceptos: cotizaciones previsionales (AFP, salud, seguro de cesantía), impuestos legales, anticipos de remuneraciones otorgados, préstamos otorgados por la empresa, y cualquier otro descuento autorizado por ley o pactado entre las partes.`,
    advances_clause: `El trabajador podrá solicitar anticipos de remuneraciones, los cuales serán descontados íntegramente en la liquidación del período correspondiente, previa autorización del empleador.`,
    internal_regulations: `El trabajador se compromete a cumplir con el reglamento interno de la empresa, así como con todas las políticas, procedimientos y normas establecidas por el empleador, las que forman parte integrante del presente contrato.`,
  },
  obra_faena: {
    confidentiality_clause: `El trabajador se compromete a mantener absoluta confidencialidad sobre toda información, datos, procesos, estrategias comerciales, listas de clientes, proveedores, métodos de trabajo, tecnologías, secretos industriales y cualquier otra información de carácter confidencial a la que tenga acceso en razón de sus funciones, tanto durante la vigencia del contrato como después de su término, sin límite de tiempo.`,
    authorized_deductions: `El empleador queda autorizado para descontar de las remuneraciones del trabajador los siguientes conceptos: cotizaciones previsionales (AFP, salud, seguro de cesantía), impuestos legales, anticipos de remuneraciones otorgados, préstamos otorgados por la empresa, y cualquier otro descuento autorizado por ley o pactado entre las partes.`,
    advances_clause: `El trabajador podrá solicitar anticipos de remuneraciones, los cuales serán descontados íntegramente en la liquidación del período correspondiente, previa autorización del empleador.`,
    internal_regulations: `El trabajador se compromete a cumplir con el reglamento interno de la empresa, así como con todas las políticas, procedimientos y normas establecidas por el empleador, las que forman parte integrante del presente contrato.`,
  },
  part_time: {
    confidentiality_clause: `El trabajador se compromete a mantener absoluta confidencialidad sobre toda información, datos, procesos, estrategias comerciales, listas de clientes, proveedores, métodos de trabajo, tecnologías, secretos industriales y cualquier otra información de carácter confidencial a la que tenga acceso en razón de sus funciones, tanto durante la vigencia del contrato como después de su término, sin límite de tiempo.`,
    authorized_deductions: `El empleador queda autorizado para descontar de las remuneraciones del trabajador los siguientes conceptos: cotizaciones previsionales (AFP, salud, seguro de cesantía), impuestos legales, anticipos de remuneraciones otorgados, préstamos otorgados por la empresa, y cualquier otro descuento autorizado por ley o pactado entre las partes.`,
    advances_clause: `El trabajador podrá solicitar anticipos de remuneraciones, los cuales serán descontados íntegramente en la liquidación del período correspondiente, previa autorización del empleador.`,
    internal_regulations: `El trabajador se compromete a cumplir con el reglamento interno de la empresa, así como con todas las políticas, procedimientos y normas establecidas por el empleador, las que forman parte integrante del presente contrato.`,
  },
}

export default function NewContractPage() {
  const { companyId } = useCurrentCompany()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validationSuggestion, setValidationSuggestion] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    employee_id: searchParams?.get('employee_id') || '',
    contract_type: 'indefinido' as 'indefinido' | 'plazo_fijo' | 'obra_faena' | 'part_time',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    position: '',
    position_description: '',
    work_schedule_type: 'unified' as 'unified' | 'separated', // unified: lunes a viernes igual, separated: lunes-jueves y viernes separados
    work_schedule: 'Lunes a Viernes, 09:00 a 18:00',
    work_schedule_monday_thursday: 'Lunes a Jueves, 09:00 a 18:00',
    work_schedule_friday: 'Viernes, 09:00 a 18:00',
    lunch_break_duration: '60', // Duración de colación en minutos
    work_location: '',
    base_salary: '',
    gratuity: true,
    gratuity_amount: '',
    bonuses: [] as Array<{ id: string; name: string; amount: string }>,
    payment_method: 'transferencia',
    payment_periodicity: 'mensual',
    bank_name: '',
    account_type: '',
    account_number: '',
    confidentiality_clause: '',
    authorized_deductions: '',
    advances_clause: '',
    internal_regulations: '',
    additional_clauses: '',
    // Cláusulas individuales (1-15)
    clause_1: '', // PRIMERO: Cargo y funciones
    clause_2: '', // SEGUNDO: Jornada de trabajo
    clause_3: '', // TERCERO: Trabajo extraordinario
    clause_4: '', // CUARTO: Remuneraciones
    clause_5: '', // QUINTO: Descuentos legales
    clause_6: '', // SEXTO: Obligaciones esenciales
    clause_7: '', // SÉPTIMO: Atrasos
    clause_8: '', // OCTAVO: Reglamento interno
    clause_9: '', // NOVENO: Ropa de trabajo
    clause_10: '', // DÉCIMO: Vehículos
    clause_11: '', // DÉCIMO PRIMERO: Negociación colectiva
    clause_12: '', // DÉCIMO SEGUNDO: Seguridad
    clause_13: '', // DÉCIMO TERCERO: Duración
    clause_14: '', // DÉCIMO CUARTO: Ejemplares
    clause_15: '', // DÉCIMO QUINTO: Previsional
  })

  // Función para generar el texto de cada cláusula basándose en los datos del formulario
  const generateClauseText = (clauseNumber: number): string => {
    const contractDate = formData.start_date ? new Date(formData.start_date + 'T00:00:00').toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : ''
    const baseSalary = parseFormattedNumber(formData.base_salary) || 0
    
    switch (clauseNumber) {
      case 1: // PRIMERO: Cargo y funciones
        let clause1Text = `El trabajador se compromete y obliga a prestar servicios como ${formData.position || 'N/A'} o función similar, que tenga directa relación con el cargo ya indicado, este trabajo se realizará en ${formData.work_location || 'las instalaciones de la empresa'}, así como en las diferentes faenas y trabajos particulares que ${company?.name || 'la empresa'} estime conveniente y necesario. Pudiendo ser trasladado a otro lugar, tanto dentro y/o fuera de la región, no importando menoscabo para el TRABAJADOR.\n\n`
        if (formData.position_description && formData.position_description.trim()) {
          clause1Text += `Descripción de principales funciones:\n\n${formData.position_description}`
        }
        return clause1Text
      
      case 2: // SEGUNDO: Jornada de trabajo
        const scheduleText = formData.work_schedule_type === 'unified' 
          ? formData.work_schedule 
          : `${formData.work_schedule_monday_thursday}; ${formData.work_schedule_friday}`
        const timeMatch = scheduleText.match(/(\d{1,2}:\d{2})\s*a\s*(\d{1,2}:\d{2})/i)
        const startTime = timeMatch ? timeMatch[1] : '08:00'
        const lunchMinutes = parseInt(formData.lunch_break_duration) || 60
        const lunchHours = Math.floor(lunchMinutes / 60)
        const lunchMinutesRemainder = lunchMinutes % 60
        let lunchText = ''
        if (lunchHours > 0 && lunchMinutesRemainder > 0) {
          lunchText = `${lunchHours} hora${lunchHours > 1 ? 's' : ''} y ${lunchMinutesRemainder} minuto${lunchMinutesRemainder > 1 ? 's' : ''}`
        } else if (lunchHours > 0) {
          lunchText = `${lunchHours} hora${lunchHours > 1 ? 's' : ''}`
        } else {
          lunchText = `${lunchMinutes} minuto${lunchMinutes > 1 ? 's' : ''}`
        }
        return `Jornada de trabajo.\n\nEl trabajador cumplirá una jornada semanal ordinaria máxima de cuarenta horas, conforme a lo establecido en la Ley N° 21.561, que modifica el Código del Trabajo en materia de jornada laboral. Esta jornada se distribuirá de lunes a viernes, de acuerdo a la siguiente distribución referencial diaria: ${scheduleText}. El horario de ingreso será a las ${startTime} horas.\n\nLa jornada de trabajo será interrumpida con un descanso de colación de ${lunchText}, el cual no será imputable a la jornada laboral y será de cargo del Trabajador. Este descanso se otorgará en el horario que el empleador determine, dentro de la jornada de trabajo.\n\nSin perjuicio de lo anterior, y cuando las necesidades operacionales de la empresa así lo requieran, la jornada de trabajo podrá modificarse en cuanto a su distribución horaria, siempre que no signifique menoscabo para el trabajador, se respeten los límites legales establecidos en la Ley N° 21.561 y el Código del Trabajo, y se mantenga la jornada semanal máxima de cuarenta horas. Cualquier modificación será comunicada al trabajador con la debida anticipación.`
      
      case 3: // TERCERO: Trabajo extraordinario
        return `Cuando por necesidades de funcionamiento de la Empresa, sea necesario pactar trabajo en tiempo extraordinario, el Empleado que lo acuerde desde luego se obligará a cumplir el horario que al efecto determine el Empleador, dentro de los límites legales. A falta de acuerdo, queda prohibido expresamente al Empleado trabajar sobretiempo o simplemente permanecer en el recinto de la Empresa, después de la hora diaria de salida, salvo en los casos a que se refiere el inciso precedente.\n\nEl tiempo extraordinario trabajado de acuerdo a las estipulaciones precedentes, se remunera con el recargo legal correspondiente y se liquidará y pagará conjuntamente con la remuneración del respectivo período.`
      
      case 4: // CUARTO: Remuneraciones
        let gratuityText = ''
        if (formData.gratuity) {
          if (formData.gratuity_amount) {
            gratuityText = `\n\nb. Gratificación: Se pagará una gratificación fija mensual de $${formatNumberForInput(parseFormattedNumber(formData.gratuity_amount))}.`
          } else {
            gratuityText = `\n\nb. Gratificación: Se pagará de acuerdo con la modalidad del artículo 50 del código del trabajo, esto es el 25% de la remuneración devengada por el trabajador, con un tope de 4.75 ingresos mínimos mensuales, la cual se pagará mensualmente en el equivalente a un duodécimo de los 4.75 ingresos mínimos mensuales. Con este pago se entenderá cumplida la obligación de la empresa de pagar gratificación legal.`
          }
        }
        const paymentDay = formData.payment_periodicity === 'mensual' ? '5' : formData.payment_periodicity === 'quincenal' ? '5 y 20' : 'cada viernes'
        const paymentMethod = formData.payment_method === 'transferencia' 
          ? `transferencia bancaria${formData.bank_name ? ` en ${formData.bank_name}${formData.account_type ? `, cuenta ${formData.account_type === 'corriente' ? 'corriente' : formData.account_type === 'ahorro' ? 'de ahorro' : 'vista'}${formData.account_number ? ` N° ${formData.account_number}` : ''}` : ''}` : ''}`
          : formData.payment_method === 'efectivo' ? 'efectivo' : 'cheque'
        let bonusesText = ''
        if (formData.bonuses.length > 0) {
          bonusesText = '\n\nc. Bonos y Asignaciones Adicionales:'
          formData.bonuses.forEach((bonus, idx) => {
            if (bonus.name && bonus.amount) {
              bonusesText += `\n   ${String.fromCharCode(99 + idx)}. ${bonus.name}: $${bonus.amount}`
            }
          })
        }
        return `a. Sueldo Base: Se establece como sueldo base la suma de $${formatNumberForInput(baseSalary)}.${gratuityText}${bonusesText}\n\nLas remuneraciones se pagarán los días ${paymentDay} de cada mes por período vencido, mediante ${paymentMethod}.\n\nSin perjuicio de la remuneración imponible pactada, el empleador podrá pagar al trabajador asignaciones por concepto de movilización y colación, las cuales no constituyen remuneración para ningún efecto legal, de conformidad a lo dispuesto en el artículo 41 inciso segundo del Código del Trabajo, por cuanto tienen como único objeto compensar gastos efectivos en que el trabajador incurra con ocasión de la prestación de sus servicios.\n\nDichas asignaciones se devengarán exclusivamente por día efectivamente trabajado, encontrándose condicionadas a la asistencia real del trabajador, a la faena, lugar de prestación de servicios, jornada o sistema de turnos aplicable. En consecuencia, su monto, forma de cálculo o procedencia podrán variar según dichas condiciones operativas, manteniendo siempre su carácter compensatorio y no incorporándose a la base de cálculo de remuneraciones, indemnizaciones, cotizaciones previsionales ni otros beneficios laborales.`
      
      case 5: // QUINTO: Descuentos legales
        return `El trabajador acepta y autoriza al empleador para que éste practique de sus remuneraciones los descuentos a que se refiere el inciso primero del artículo 58 del código del trabajo como, asimismo, descuente el tiempo no trabajado debido a inasistencia, atrasos o permisos; además de las multas señaladas en el reglamento interno de orden higiene y seguridad.${formData.authorized_deductions ? `\n\n${formData.authorized_deductions}` : ''}`
      
      case 6: // SEXTO: Obligaciones esenciales
        return `Son obligaciones esenciales del contrato de trabajo las siguientes normas cuya infracción será causa justificada de término del contrato, conforme a las leyes vigentes:\n\na. Cumplir las órdenes que imparta el empleador.\n\nb. No realizar trabajos relacionados con el rubro de la empresa o prestar servicios a la competencia.\n\nc. Cumplir con el reglamento interno existente en la empresa el cual se entrega y se pone en conocimiento del trabajador en el acto de la firma del presente contrato de trabajo.\n\nd. Divulgación de información confidencial relacionada con las actividades de la empresa a la cual tenga acceso, salvo requerimiento formal proveniente de los Tribunales de Justicia.\n\ne. Informar o poner en conocimiento de personas ajenas a la empresa, datos, documentos o antecedentes que por su naturaleza deben mantenerse en reserva o que puedan utilizarse o no en contra de la gestión comercial, económica o industrial de la empresa. Del mismo modo hacer denuncias de hechos o situaciones irregulares de competencia exclusiva de la empresa, con o sin documentos de cualquier tipo, a personas de la empresa mandante, sin la debida autorización de la Gerencia General, de su Representante Legal o de su Jefe Directo.${formData.confidentiality_clause ? `\n\n${formData.confidentiality_clause}` : ''}`
      
      case 7: // SÉPTIMO: Atrasos
        return `Las partes acuerdan en este acto que los atrasos reiterados, sin causa justificada, de parte del trabajador, se considerarán incumplimiento grave de las obligaciones que impone el presente contrato y darán lugar a la aplicación de la caducidad del contrato, contemplada en el art.160 Nº7 del Código del Trabajo. Se entenderá por atraso reiterado el llegar después de la hora de ingreso durante 3 Días seguidos o no, en cada mes calendario. Bastará para acreditar esta situación la constancia en el respectivo Control de Asistencia.`
      
      case 8: // OCTAVO: Reglamento interno
        return `El Trabajador declara conocer el Reglamento Interno de su Empleador, el cual se compromete a cumplir en todas sus partes. Para efectos legales, el Reglamento Interno se considera parte integrante del presente Contrato de Trabajo.\n\nPara tal efecto, en este acto, se le entrega una copia del Reglamento Interno al Trabajador, quien firma y suscribe su aceptación y recepción.${formData.internal_regulations ? `\n\n${formData.internal_regulations}` : ''}`
      
      case 9: // NOVENO: Ropa de trabajo
        return `El Empleador de acuerdo a las labores ejecutadas por el trabajador, entregará ropa de trabajo, implementos de seguridad, y herramientas el cual deberá mantener en buen estado y conservación, siendo de su cargo la limpieza y pérdidas que ellos sufran. En el evento de que el Trabajador no efectúe la restitución de los implementos a su cargo, esta faculta al Empleador para que descuente de su Remuneración dichos implementos de trabajo.`
      
      case 10: // DÉCIMO: Vehículos
        return `En caso de que se le asigne vehículo a cargo, el conductor se responsabilizará de los daños materiales que le ocasione al vehículo a su cargo por accidentes y otras causas propias y ajenas a la conducción.\n\nAdemás, se hace responsable de las notificaciones por infracciones del tránsito cursadas por Carabineros o inspectores municipales y aquellas que se hagan al empadronamiento del vehículo. Para estos efectos el Empleador podrá descontar o deducir de las remuneraciones mensuales del conductor, un porcentaje no superior al 10% de éstas mensualmente, hasta enterar el total de las sumas que éste debiera haber cancelado. Por este instrumento el conductor acepta el compromiso de devolver las sumas pagadas por el Empleador en forma prevista en esta cláusula y autoriza las deducciones correspondientes, respetándose, en todo caso, el tope de los descuentos permitido por la ley.`
      
      case 11: // DÉCIMO PRIMERO: Negociación colectiva
        return `De acuerdo con el artículo 305 del código del trabajo, el trabajador se encuentra prohibido de negociar colectivamente.`
      
      case 12: // DÉCIMO SEGUNDO: Seguridad
        return `El hecho de faltar a cualquier norma de seguridad de las faenas a las que fuere enviado y el no uso de los elementos de seguridad básicos en una faena minera u otra, será considerado como falta grave la cual será causal de despido. Se comprende también como falta grave el presentarse a labores bajo los efectos del alcohol o drogas, de presentarse el trabajador bajo estas condiciones será causal de despido.`
      
      case 13: // DÉCIMO TERCERO: Duración
        let durationText = ''
        if (formData.contract_type === 'indefinido') {
          durationText = 'de duración indefinida'
        } else if (formData.contract_type === 'plazo_fijo' && formData.end_date) {
          const endDate = new Date(formData.end_date + 'T00:00:00')
          const startDate = new Date(formData.start_date + 'T00:00:00')
          const months = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
          durationText = `con una duración de ${months} mes${months > 1 ? 'es' : ''}, pudiendo ser renovado por mutuo acuerdo, por un período igual o superior, lo que se hará constar`
        } else if (formData.contract_type === 'obra_faena') {
          durationText = 'por obra o faena determinada'
        } else if (formData.contract_type === 'part_time') {
          durationText = 'de jornada parcial'
        }
        return `Se deja expresa constancia que el trabajador iniciará sus servicios para la empresa a partir del ${contractDate}, ${durationText}, lo que se hará constar.`
      
      case 14: // DÉCIMO CUARTO: Ejemplares
        return `El presente contrato se firma en dos ejemplares y se deja expresa constancia que el trabajador recibe una de ellas.`
      
      case 15: // DÉCIMO QUINTO: Previsional
        // Verificar si tiene régimen especial (DIPRECA, CAPREDENA, SIN_PREVISION)
        if (selectedEmployee?.previsional_regime === 'OTRO_REGIMEN' && selectedEmployee?.other_regime_type) {
          // Régimen especial
          const regimeLabels: { [key: string]: string } = {
            'DIPRECA': 'DIPRECA (Dirección de Previsión de Carabineros de Chile)',
            'CAPREDENA': 'CAPREDENA (Caja de Previsión de la Defensa Nacional)',
            'SIN_PREVISION': 'Sin Sistema Previsional (exento de cotizaciones previsionales)'
          }
          
          const regimeLabel = regimeLabels[selectedEmployee.other_regime_type] || selectedEmployee.other_regime_type
          
          if (selectedEmployee.other_regime_type === 'SIN_PREVISION') {
            return `Se deja expresa constancia que, para los efectos de la deducción de impuestos y cotizaciones que resulten procedentes por esta prestación de servicios, el trabajador declara estar exento de cotizaciones previsionales (${regimeLabel}), conforme a lo establecido en la legislación vigente.`
          } else {
            // DIPRECA o CAPREDENA
            const healthText = selectedEmployee.manual_health_rate 
              ? `sistema de salud administrado por ${regimeLabel.split('(')[0].trim()}`
              : 'sistema de salud correspondiente'
            
            return `Se deja expresa constancia que, para los efectos de la deducción de impuestos y cotizaciones que resulten procedentes por esta prestación de servicios, el trabajador declara pertenecer al régimen previsional de ${regimeLabel}, y al ${healthText}, conforme a lo establecido en el DL N°3.500 de 1980 y normativa especial aplicable.`
          }
        } else {
          // Régimen AFP normal
          const healthSystemText = selectedEmployee?.health_system === 'FONASA' ? 'FONASA' : 
            selectedEmployee?.health_system === 'ISAPRE' ? `ISAPRE${selectedEmployee?.health_plan ? ` ${selectedEmployee.health_plan}` : ''}` : 
            selectedEmployee?.health_system || 'FONASA'
          return `Se deja expresa constancia que, para los efectos de la deducción de impuestos, cotizaciones de previsión o de seguridad social, como de otros legales que resulten procedentes por esta prestación de servicios, el trabajador declara pertenecer a la AFP ${selectedEmployee?.afp || 'N/A'} y a ${healthSystemText}.`
        }
      
      default:
        return ''
    }
  }

  // Inicializar cláusulas cuando cambian los datos relevantes (solo si están vacías)
  useEffect(() => {
    if (selectedEmployee && company) {
      const clauses: any = {}
      let hasEmptyClause = false
      for (let i = 1; i <= 15; i++) {
        const clauseKey = `clause_${i}` as keyof typeof formData
        if (!formData[clauseKey] || formData[clauseKey] === '') {
          clauses[clauseKey] = generateClauseText(i)
          hasEmptyClause = true
        }
      }
      if (hasEmptyClause && Object.keys(clauses).length > 0) {
        setFormData((prev) => ({ ...prev, ...clauses }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee?.id, company?.id, formData.position, formData.work_location, formData.work_schedule, formData.work_schedule_monday_thursday, formData.work_schedule_friday, formData.work_schedule_type, formData.lunch_break_duration, formData.base_salary, formData.gratuity, formData.gratuity_amount, formData.bonuses.length, formData.payment_method, formData.payment_periodicity, formData.bank_name, formData.account_type, formData.account_number, formData.contract_type, formData.start_date, formData.end_date])

  useEffect(() => {
    if (companyId) {
      loadData()
    } else {
      setEmployees([])
    }
  }, [companyId])

  useEffect(() => {
    if (searchParams?.get('employee_id')) {
      setFormData((prev) => ({ ...prev, employee_id: searchParams.get('employee_id') || '' }))
    }
  }, [searchParams])

  useEffect(() => {
    if (formData.employee_id) {
      loadEmployeeData()
    }
  }, [formData.employee_id])

  useEffect(() => {
    if (formData.contract_type) {
      const template = contractTemplates[formData.contract_type]
      setFormData((prev) => ({
        ...prev,
        confidentiality_clause: template.confidentiality_clause,
        authorized_deductions: template.authorized_deductions,
        advances_clause: template.advances_clause,
        internal_regulations: template.internal_regulations,
      }))
    }
  }, [formData.contract_type])

  const loadData = async () => {
    try {
      // Cargar empleados de la empresa
      if (!companyId) {
        setEmployees([])
        return
      }
      
      const { data: employeesData } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .order('full_name')

      setEmployees(employeesData || [])

      // Cargar empresa
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      setCompany(companyData)
    } catch (error: any) {
      alert('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadEmployeeData = async () => {
    if (!formData.employee_id) {
      setValidationError(null)
      setValidationSuggestion(null)
      setSelectedEmployee(null)
      return
    }
    
    try {
      // Validar que se pueda crear contrato para este empleado
      const { contract } = createValidationServices(supabase)
      const validation = await contract.canCreateContract(formData.employee_id)
      
      if (!validation.allowed) {
        setValidationError(validation.message)
        setValidationSuggestion(validation.details?.suggestion || null)
        setSelectedEmployee(null)
        return
      } else {
        setValidationError(null)
        setValidationSuggestion(null)
      }
      
      // Cargar datos completos del empleado seleccionado (incluyendo datos bancarios, personales y previsionales)
      const { data: employee, error } = await supabase
        .from('employees')
        .select('id, full_name, rut, position, base_salary, hire_date, bank_name, account_type, account_number, address, phone, email, status, contract_type, contract_end_date, afp, health_system, health_plan, previsional_regime, other_regime_type, manual_pension_rate, manual_health_rate, manual_employer_rate, manual_base_type, manual_regime_label')
        .eq('id', formData.employee_id)
        .single()

      if (error) throw error

      if (employee) {
        setSelectedEmployee(employee)
        // Precargar fecha de ingreso como fecha de inicio del contrato
        const hireDate = employee.hire_date ? employee.hire_date.split('T')[0] : new Date().toISOString().split('T')[0]
        // Precargar tipo de contrato si existe en la ficha del empleado
        const contractType = (employee as any).contract_type || 'indefinido'
        // Precargar fecha de término si existe y el tipo de contrato lo requiere
        const endDate = (employee as any).contract_end_date ? (employee as any).contract_end_date.split('T')[0] : ''
        // Cargar dirección de la empresa actual si no está cargada
        let workLocation = formData.work_location || ''
        if (!workLocation && company) {
          workLocation = company.address || ''
        }

        setFormData((prev) => ({
          ...prev,
          position: employee.position || '',
          base_salary: formatNumberForInput(employee.base_salary || 0),
          work_location: workLocation,
          start_date: hireDate, // Precargar fecha de ingreso
          contract_type: contractType as 'indefinido' | 'plazo_fijo' | 'obra_faena' | 'part_time', // Precargar tipo de contrato
          end_date: endDate, // Precargar fecha de término si existe
          bank_name: employee.bank_name || '',
          account_type: employee.account_type || '',
          account_number: employee.account_number || '',
        }))
      }
    } catch (error: any) {
      console.error('Error al cargar datos del empleado:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.employee_id) {
        alert('Por favor selecciona un trabajador')
        setSaving(false)
        return
      }

      // Validar que se pueda crear contrato (validación final antes de enviar)
      const { contract } = createValidationServices(supabase)
      const validation = await contract.canCreateContract(formData.employee_id)
      
      if (!validation.allowed) {
        alert(validation.message)
        if (validation.details?.suggestion === 'create_annex') {
          const createAnnex = confirm('¿Deseas crear un anexo al contrato existente en su lugar?')
          if (createAnnex) {
            router.push(`/contracts/annex/new?employee_id=${formData.employee_id}`)
          }
        }
        setSaving(false)
        return
      }

      if (!formData.position || !formData.work_location) {
        alert('Por favor completa todos los campos obligatorios')
        setSaving(false)
        return
      }

      const baseSalary = parseFormattedNumber(formData.base_salary)
      if (baseSalary <= 0) {
        alert('El sueldo base debe ser mayor a cero')
        setSaving(false)
        return
      }

      if (!companyId) {
        alert('No se pudo determinar la empresa. Por favor, selecciona una empresa.')
        setSaving(false)
        return
      }


      const contractData: any = {
        employee_id: formData.employee_id,
        company_id: companyId,
        contract_type: formData.contract_type,
        start_date: formData.start_date,
        end_date: formData.contract_type === 'plazo_fijo' || formData.contract_type === 'obra_faena' 
          ? formData.end_date || null 
          : null,
        position: formData.position,
        position_description: formData.position_description || null,
        work_schedule: formData.work_schedule_type === 'unified' 
          ? formData.work_schedule 
          : `${formData.work_schedule_monday_thursday}; ${formData.work_schedule_friday}`,
        work_location: formData.work_location,
        lunch_break_duration: parseInt(formData.lunch_break_duration) || 60,
        base_salary: baseSalary,
        gratuity: formData.gratuity,
        gratuity_amount: formData.gratuity_amount ? parseFormattedNumber(formData.gratuity_amount) : null,
        other_allowances: formData.bonuses.length > 0 
          ? formData.bonuses.map(b => `${b.name}: $${b.amount}`).join('; ') 
          : null,
        payment_method: formData.payment_method,
        payment_periodicity: formData.payment_periodicity,
        bank_name: formData.bank_name || null,
        account_type: formData.account_type || null,
        account_number: formData.account_number || null,
        confidentiality_clause: formData.confidentiality_clause || null,
        authorized_deductions: formData.authorized_deductions || null,
        advances_clause: formData.advances_clause || null,
        internal_regulations: formData.internal_regulations || null,
        additional_clauses: formData.additional_clauses || null,
        status: 'draft',
      }

      const { data, error } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single()

      if (error) throw error

      // Registrar evento de auditoría
      try {
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: companyId,
            employeeId: formData.employee_id,
            source: 'admin_dashboard',
            actionType: 'contract.created',
            module: 'contracts',
            entityType: 'contracts',
            entityId: data.id,
            status: 'success',
            afterData: {
              contract_type: contractData.contract_type,
              position: contractData.position,
              base_salary: contractData.base_salary,
              start_date: contractData.start_date,
              status: contractData.status,
            },
            metadata: {
              contract_number: data.contract_number,
            },
          }),
        }).catch((err) => console.error('Error al registrar auditoría:', err))
      } catch (auditError) {
        console.error('Error al registrar auditoría:', auditError)
      }

      alert('Contrato creado correctamente')
      router.push(`/contracts/${data.id}`)
    } catch (error: any) {
      console.error('Error al crear contrato:', error)
      alert('Error al crear contrato: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1>Nuevo Contrato</h1>
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Nuevo Contrato de Trabajo</h1>
        <button className="secondary" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Selección de Trabajador */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>1. Selección de Trabajador</h2>
          <div className="form-group">
            <label>Trabajador *</label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              required
            >
              <option value="">Selecciona un trabajador</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.rut}
                </option>
              ))}
            </select>
            {validationError && (
              <div style={{ 
                marginTop: '12px', 
                padding: '16px', 
                background: '#fef2f2', 
                border: '2px solid #ef4444',
                borderRadius: '8px',
                color: '#991b1b'
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>⚠️ No se puede crear el contrato</p>
                <p style={{ margin: '0 0 12px 0' }}>{validationError}</p>
                {validationSuggestion === 'create_annex' && (
                  <button
                    type="button"
                    onClick={() => router.push(`/contracts/annex/new?employee_id=${formData.employee_id}`)}
                    style={{
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Crear Anexo en su lugar
                  </button>
                )}
              </div>
            )}
            {selectedEmployee && !validationError && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                <p style={{ margin: '4px 0' }}><strong>RUT:</strong> {selectedEmployee.rut || 'No registrado'}</p>
                <p style={{ margin: '4px 0' }}><strong>Dirección:</strong> {selectedEmployee.address || 'No registrada'}</p>
                <p style={{ margin: '4px 0' }}><strong>Teléfono:</strong> {selectedEmployee.phone || 'No registrado'}</p>
                <p style={{ margin: '4px 0' }}><strong>Email:</strong> {selectedEmployee.email || 'No registrado'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tipo de Contrato y Fechas */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>2. Tipo de Contrato y Fechas</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo de Contrato *</label>
              <select
                value={formData.contract_type}
                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value as any })}
                required
              >
                <option value="indefinido">Indefinido</option>
                <option value="plazo_fijo">Plazo Fijo</option>
                <option value="obra_faena">Obra o Faena</option>
                <option value="part_time">Part-Time</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha de Inicio *</label>
              <DateInput
                value={formData.start_date}
                onChange={(value) => setFormData({ ...formData, start_date: value })}
                required
              />
            </div>
            {(formData.contract_type === 'plazo_fijo' || formData.contract_type === 'obra_faena') && (
              <div className="form-group">
                <label>Fecha de Término *</label>
                <DateInput
                  value={formData.end_date}
                  onChange={(value) => setFormData({ ...formData, end_date: value })}
                  required
                />
              </div>
            )}
          </div>
        </div>

        {/* Cargo y Funciones */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>3. Cargo y Funciones</h2>
          <div className="form-group">
            <label>Cargo *</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Descripción de Funciones</label>
            <textarea
              value={formData.position_description}
              onChange={(e) => setFormData({ ...formData, position_description: e.target.value })}
              rows={4}
              placeholder="Describe las funciones principales del cargo..."
            />
          </div>
        </div>

        {/* Jornada y Lugar de Trabajo */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>4. Jornada y Lugar de Trabajo</h2>
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#f0f9ff', 
            borderLeft: '4px solid #3b82f6', 
            marginBottom: '16px',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#1e40af'
          }}>
            <strong>Nota:</strong> La jornada de trabajo se rige por la Ley 21.561 (Ley de 40 horas), que establece una jornada ordinaria semanal máxima de 40 horas, distribuidas de lunes a viernes. Esta ley entró en vigencia de forma gradual y debe ser respetada en todos los contratos laborales.
          </div>
          <div className="form-group">
            <label>Tipo de Horario *</label>
            <select
              value={formData.work_schedule_type}
              onChange={(e) => setFormData({ 
                ...formData, 
                work_schedule_type: e.target.value as 'unified' | 'separated' 
              })}
              required
            >
              <option value="unified">Lunes a Viernes (mismo horario)</option>
              <option value="separated">Lunes a Jueves y Viernes (horarios diferentes)</option>
            </select>
          </div>
          
          {formData.work_schedule_type === 'unified' ? (
            <div className="form-group">
              <label>Horario de Trabajo *</label>
              <input
                type="text"
                value={formData.work_schedule}
                onChange={(e) => setFormData({ ...formData, work_schedule: e.target.value })}
                placeholder="Ej: Lunes a Viernes, 09:00 a 18:00"
                required
              />
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label>Horario Lunes a Jueves *</label>
                <input
                  type="text"
                  value={formData.work_schedule_monday_thursday}
                  onChange={(e) => setFormData({ ...formData, work_schedule_monday_thursday: e.target.value })}
                  placeholder="Ej: Lunes a Jueves, 09:00 a 18:00"
                  required
                />
              </div>
              <div className="form-group">
                <label>Horario Viernes *</label>
                <input
                  type="text"
                  value={formData.work_schedule_friday}
                  onChange={(e) => setFormData({ ...formData, work_schedule_friday: e.target.value })}
                  placeholder="Ej: Viernes, 09:00 a 13:00"
                  required
                />
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label>Lugar de Prestación de Servicios *</label>
            <input
              type="text"
              value={formData.work_location}
              onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Duración de Colación (minutos) *</label>
            <input
              type="number"
              value={formData.lunch_break_duration}
              onChange={(e) => setFormData({ ...formData, lunch_break_duration: e.target.value })}
              placeholder="Ej: 60"
              min="0"
              max="120"
              required
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Tiempo de descanso para colación (no imputable a la jornada laboral)
            </div>
          </div>

          {/* Análisis de cumplimiento de Ley 21.561 */}
          {(() => {
            const calculateWeeklyHours = () => {
              try {
                const lunchMinutes = parseInt(formData.lunch_break_duration) || 60

                if (formData.work_schedule_type === 'unified' && formData.work_schedule) {
                  // Extraer horarios del texto unificado
                  const timeMatch = formData.work_schedule.match(/(\d{1,2}):(\d{2})\s*a\s*(\d{1,2}):(\d{2})/i)
                  if (timeMatch) {
                    const startHour = parseInt(timeMatch[1])
                    const startMin = parseInt(timeMatch[2])
                    const endHour = parseInt(timeMatch[3])
                    const endMin = parseInt(timeMatch[4])
                    
                    const startTotal = startHour * 60 + startMin
                    const endTotal = endHour * 60 + endMin
                    const dailyMinutes = endTotal - startTotal - lunchMinutes
                    const dailyHours = dailyMinutes / 60
                    return dailyHours * 5 // 5 días laborales
                  }
                } else if (formData.work_schedule_type === 'separated') {
                  // Calcular lunes a jueves
                  const mondayThursdayMatch = formData.work_schedule_monday_thursday?.match(/(\d{1,2}):(\d{2})\s*a\s*(\d{1,2}):(\d{2})/i)
                  let mondayThursdayHours = 0
                  if (mondayThursdayMatch) {
                    const startHour = parseInt(mondayThursdayMatch[1])
                    const startMin = parseInt(mondayThursdayMatch[2])
                    const endHour = parseInt(mondayThursdayMatch[3])
                    const endMin = parseInt(mondayThursdayMatch[4])
                    
                    const startTotal = startHour * 60 + startMin
                    const endTotal = endHour * 60 + endMin
                    const dailyMinutes = endTotal - startTotal - lunchMinutes
                    mondayThursdayHours = (dailyMinutes / 60) * 4 // 4 días
                  }
                  
                  // Calcular viernes
                  const fridayMatch = formData.work_schedule_friday?.match(/(\d{1,2}):(\d{2})\s*a\s*(\d{1,2}):(\d{2})/i)
                  let fridayHours = 0
                  if (fridayMatch) {
                    const startHour = parseInt(fridayMatch[1])
                    const startMin = parseInt(fridayMatch[2])
                    const endHour = parseInt(fridayMatch[3])
                    const endMin = parseInt(fridayMatch[4])
                    
                    const startTotal = startHour * 60 + startMin
                    const endTotal = endHour * 60 + endMin
                    const dailyMinutes = endTotal - startTotal - lunchMinutes
                    fridayHours = dailyMinutes / 60 // 1 día
                  }
                  
                  return mondayThursdayHours + fridayHours
                }
              } catch (error) {
                return null
              }
              return null
            }

            const weeklyHours = calculateWeeklyHours()
            const currentYear = new Date().getFullYear()
            
            // Determinar límite según año
            let maxHours = 45 // Por defecto (antes de 2024)
            let limitYear = ''
            if (currentYear >= 2028) {
              maxHours = 40
              limitYear = '2028'
            } else if (currentYear >= 2026) {
              maxHours = 42
              limitYear = '2026'
            } else if (currentYear >= 2024) {
              maxHours = 44
              limitYear = '2024'
            }

            if (weeklyHours !== null && weeklyHours > 0) {
              const isCompliant = weeklyHours <= maxHours
              const hoursDiff = weeklyHours - maxHours
              
              return (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: isCompliant ? '#f0fdf4' : '#fef2f2',
                  borderLeft: `4px solid ${isCompliant ? '#22c55e' : '#ef4444'}`,
                  borderRadius: '4px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', color: isCompliant ? '#166534' : '#991b1b' }}>
                    {isCompliant ? '✓ Cumple con Ley 21.561' : '⚠ Excede límite legal'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                    <strong>Horas semanales calculadas:</strong> {weeklyHours.toFixed(2)} horas
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                    <strong>Límite legal ({currentYear >= 2028 ? 'desde 2028' : currentYear >= 2026 ? 'desde 2026' : 'desde 2024'}):</strong> {maxHours} horas/semana
                  </div>
                  {!isCompliant && (
                    <div style={{ fontSize: '13px', color: '#991b1b', marginTop: '8px', fontWeight: 'bold' }}>
                      ⚠ ADVERTENCIA: Se excede el límite legal en {hoursDiff.toFixed(2)} horas. Esto podría generar responsabilidades legales.
                    </div>
                  )}
                  {isCompliant && weeklyHours < maxHours && (
                    <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                      El horario está dentro del límite legal y es menor al máximo permitido.
                    </div>
                  )}
                </div>
              )
            }
            return null
          })()}
        </div>

        {/* Remuneraciones */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>5. Remuneraciones</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Sueldo Base *</label>
              <input
                type="text"
                value={formData.base_salary}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '')
                  setFormData({ ...formData, base_salary: formatNumberForInput(parseFormattedNumber(value)) })
                }}
                required
              />
            </div>
            <div className="form-group">
              <label>Gratificación</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <ToggleSwitch
                  checked={formData.gratuity}
                  onChange={(checked) => setFormData({ ...formData, gratuity: checked })}
                  label="Incluir Gratificación Legal (25% del sueldo base, con tope legal)"
                />
              {formData.gratuity && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '200px' }}>
                    <input
                      type="text"
                      value={formData.gratuity_amount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '')
                        setFormData({ ...formData, gratuity_amount: formatNumberForInput(parseFormattedNumber(value)) })
                      }}
                      placeholder="Monto fijo (opcional)"
                      style={{ flex: '1', minWidth: '150px' }}
                    />
                    <span style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}>
                    Si se deja vacío, se aplicará gratificación legal
                    </span>
                </div>
              )}
            </div>
          </div>
          </div>
            <div className="form-group">
              <label>Otros Bonos o Asignaciones</label>
            <div style={{ marginBottom: '16px' }}>
              {formData.bonuses.map((bonus, index) => (
                <div key={bonus.id} className="form-row" style={{ marginBottom: '8px' }}>
                  <div className="form-group" style={{ flex: '1' }}>
                    <select
                      value={bonus.name}
                      onChange={(e) => {
                        const updated = [...formData.bonuses]
                        updated[index].name = e.target.value
                        setFormData({ ...formData, bonuses: updated })
                      }}
                      style={{ width: '100%' }}
                    >
                      <option value="">Seleccionar tipo de bono</option>
                      {AVAILABLE_BONUSES.map((bonoName) => (
                        <option key={bonoName} value={bonoName}>
                          {bonoName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1' }}>
                    <input
                      type="text"
                      value={bonus.amount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '')
                        const updated = [...formData.bonuses]
                        updated[index].amount = formatNumberForInput(parseFormattedNumber(value))
                        setFormData({ ...formData, bonuses: updated })
                      }}
                      placeholder="Monto"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.bonuses.filter((_, i) => i !== index)
                        setFormData({ ...formData, bonuses: updated })
                      }}
                      style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    bonuses: [...formData.bonuses, { id: Date.now().toString(), name: '', amount: '' }]
                  })
                }}
                style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}
              >
                + Agregar Bono
              </button>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Forma de Pago *</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                required
              >
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="form-group">
              <label>Periodicidad de Pago *</label>
              <select
                value={formData.payment_periodicity}
                onChange={(e) => setFormData({ ...formData, payment_periodicity: e.target.value })}
                required
              >
                <option value="mensual">Mensual</option>
                <option value="quincenal">Quincenal</option>
                <option value="semanal">Semanal</option>
              </select>
            </div>
          </div>
          {formData.payment_method === 'transferencia' && (
            <>
              <h3 style={{ marginTop: '16px', marginBottom: '12px', fontSize: '16px' }}>Datos Bancarios</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Banco</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="Ej: Banco de Chile"
                  />
                </div>
                <div className="form-group">
                  <label>Tipo de Cuenta</label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  >
                    <option value="">Selecciona...</option>
                    <option value="corriente">Cuenta Corriente</option>
                    <option value="ahorro">Cuenta de Ahorro</option>
                    <option value="vista">Cuenta Vista</option>
                  </select>
              </div>
              <div className="form-group">
                <label>Número de Cuenta</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="Ej: 12345678-9"
                />
                </div>
              </div>
              <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                  Estos datos se precargan desde la ficha del trabajador, pero puedes editarlos si es necesario
                </small>
            </>
          )}
        </div>

        {/* Cláusulas */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2>6. Cláusulas del Contrato</h2>
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px', marginBottom: '0' }}>
                Todas las cláusulas se generan automáticamente basándose en los datos ingresados arriba.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const allClauses: any = {}
                for (let i = 1; i <= 15; i++) {
                  allClauses[`clause_${i}`] = generateClauseText(i)
                }
                setFormData({ ...formData, ...allClauses })
                alert('✅ Todas las cláusulas han sido regeneradas')
              }}
              style={{ 
                padding: '10px 20px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(102, 126, 234, 0.3)'
              }}
            >
              🔄 Regenerar Todas las Cláusulas
            </button>
          </div>
          
          {[
            { num: 1, title: 'PRIMERO', label: 'Cargo y Funciones', key: 'clause_1' },
            { num: 2, title: 'SEGUNDO', label: 'Jornada de Trabajo', key: 'clause_2' },
            { num: 3, title: 'TERCERO', label: 'Trabajo Extraordinario', key: 'clause_3' },
            { num: 4, title: 'CUARTO', label: 'Remuneraciones', key: 'clause_4' },
            { num: 5, title: 'QUINTO', label: 'Descuentos Legales', key: 'clause_5' },
            { num: 6, title: 'SEXTO', label: 'Obligaciones Esenciales', key: 'clause_6' },
            { num: 7, title: 'SÉPTIMO', label: 'Atrasos', key: 'clause_7' },
            { num: 8, title: 'OCTAVO', label: 'Reglamento Interno', key: 'clause_8' },
            { num: 9, title: 'NOVENO', label: 'Ropa de Trabajo', key: 'clause_9' },
            { num: 10, title: 'DÉCIMO', label: 'Vehículos', key: 'clause_10' },
            { num: 11, title: 'DÉCIMO PRIMERO', label: 'Negociación Colectiva', key: 'clause_11' },
            { num: 12, title: 'DÉCIMO SEGUNDO', label: 'Seguridad', key: 'clause_12' },
            { num: 13, title: 'DÉCIMO TERCERO', label: 'Duración', key: 'clause_13' },
            { num: 14, title: 'DÉCIMO CUARTO', label: 'Ejemplares', key: 'clause_14' },
            { num: 15, title: 'DÉCIMO QUINTO', label: 'Previsional', key: 'clause_15' },
          ].map((clause) => (
            <div key={clause.key} className="form-group" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '15px' }}>
                  {clause.title}: {clause.label}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const generatedText = generateClauseText(clause.num)
                    setFormData({ ...formData, [clause.key]: generatedText })
                  }}
                  style={{ 
                    padding: '4px 12px', 
                    background: '#f3f4f6', 
                    color: '#374151', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Regenerar
                </button>
          </div>
            <textarea
                value={formData[clause.key as keyof typeof formData] as string || generateClauseText(clause.num)}
                onChange={(e) => setFormData({ ...formData, [clause.key]: e.target.value })}
                rows={clause.num === 2 || clause.num === 4 || clause.num === 6 ? 8 : clause.num === 10 ? 6 : 4}
                style={{ width: '100%', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.5' }}
            />
          </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Contrato'}
          </button>
          <button type="button" className="secondary" onClick={() => router.back()}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

