import { formatCurrency, numberToWords } from '@/lib/services/payrollCalculator'

// Meses en español
const MONTHS_SPANISH = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Formatear fecha en formato legal chileno: "17 de Marzo del 2020"
export function formatDateLegal(dateStr: string): string {
  if (!dateStr) return ''
  
  // Extraer solo la parte de la fecha (YYYY-MM-DD) si viene con hora
  const dateOnly = dateStr.split('T')[0].split(' ')[0]
  
  // Crear fecha asegurándonos de que esté en formato correcto
  const date = new Date(dateOnly + 'T00:00:00')
  
  // Validar que la fecha sea válida
  if (isNaN(date.getTime())) {
    console.error('Fecha inválida:', dateStr)
    return ''
  }
  
  const day = date.getDate()
  const month = MONTHS_SPANISH[date.getMonth()]
  const year = date.getFullYear()
  
  // Validar que los valores sean válidos
  if (!day || !month || !year) {
    console.error('Valores de fecha inválidos:', { day, month, year, dateStr })
    return ''
  }
  
  return `${day} de ${month} del ${year}`
}

// Formatear fecha de nacimiento: "08 de Octubre de 1994"
export function formatBirthDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  const day = String(date.getDate()).padStart(2, '0')
  const month = MONTHS_SPANISH[date.getMonth()]
  const year = date.getFullYear()
  return `${day} de ${month} de ${year}`
}

// Obtener género del nombre (don/doña)
export function getGenderPrefix(fullName: string): string {
  // Por ahora, usar "don/doña" genérico o detectar por nombre común
  // Se puede mejorar con detección de género
  return 'don/doña'
}

// Formatear estado civil
export function formatMaritalStatus(status: string | null): string {
  if (!status) return 'Soltero'
  const statusMap: { [key: string]: string } = {
    soltero: 'Soltero',
    soltera: 'Soltera',
    casado: 'Casado',
    casada: 'Casada',
    divorciado: 'Divorciado',
    divorciada: 'Divorciada',
    viudo: 'Viudo',
    viuda: 'Viuda',
    union_civil: 'Unión Civil',
  }
  return statusMap[status.toLowerCase()] || status
}

// Generar texto completo del contrato en formato legal chileno
export function generateContractText(contract: any, employee: any, company: any): string {
  const contractDate = formatDateLegal(contract.start_date)
  const birthDate = formatBirthDate(employee.birth_date || '')
  const nationality = employee.nationality || 'Chilena'
  const maritalStatus = formatMaritalStatus(employee.marital_status)
  const genderPrefix = getGenderPrefix(employee.full_name)
  
  // Determinar duración del contrato
  let durationText = ''
  if (contract.contract_type === 'indefinido') {
    durationText = 'de duración indefinida'
  } else if (contract.contract_type === 'plazo_fijo' && contract.end_date) {
    const endDate = new Date(contract.end_date + 'T00:00:00')
    const startDate = new Date(contract.start_date + 'T00:00:00')
    const months = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    durationText = `con una duración de ${months} mes${months > 1 ? 'es' : ''}, pudiendo ser renovado por mutuo acuerdo, por un período igual o superior, lo que se hará constar`
  } else if (contract.contract_type === 'obra_faena') {
    durationText = 'por obra o faena determinada'
  } else if (contract.contract_type === 'part_time') {
    durationText = 'de jornada parcial'
  }

  // Párrafo inicial
  let text = `En ${company?.city || 'Santiago'}, a ${contractDate}, entre *${company?.name || 'EMPRESA'}*, R.U.T ${company?.rut || 'N/A'}, representado legalmente por ${company?.employer_name || 'REPRESENTANTE LEGAL'}, cédula de identidad ${company?.rut || 'N/A'}, ambos con domicilio en ${company?.address || 'N/A'}${company?.city ? `, comuna de ${company.city}` : ''}, en adelante el "Empleador" y ${genderPrefix}: *${employee?.full_name || 'N/A'}*, con Rut: ${employee?.rut || 'N/A'}, de nacionalidad ${nationality}. ${birthDate ? `Con fecha de nacimiento el ${birthDate}, ` : ''}domiciliado(a) en ${employee?.address || 'N/A'}, de estado civil ${maritalStatus}, en adelante "Trabajador". Se ha convenido el siguiente CONTRATO DE TRABAJO, para cuyo efecto, las partes convienen denominarse respectivamente *EMPLEADOR* Y *TRABAJADOR*.\n\n`

  // PRIMERO: Cargo y funciones
  text += `PRIMERO: El trabajador se compromete y obliga a prestar servicios como *${contract.position || 'N/A'}* o función similar, que tenga directa relación con el cargo ya indicado, este trabajo se realizará en ${contract.work_location || 'las instalaciones de la empresa'}, así como en las diferentes faenas y trabajos particulares que ${company?.name || 'la empresa'} estime conveniente y necesario. Pudiendo ser trasladado a otro lugar, tanto dentro y/o fuera de la región, no importando menoscabo para el TRABAJADOR.\n\n`
  if (contract.position_description && contract.position_description.trim()) {
    text += `Descripción de principales funciones:\n\n${contract.position_description}\n\n`
  }

  // SEGUNDO: Jornada de trabajo (conforme a Ley 21.561)
  text += `SEGUNDO: Jornada de trabajo.\n\n`
  
  // Detectar si hay horarios separados (formato: "Lunes a Jueves, ...; Viernes, ...")
  let scheduleText = contract.work_schedule || 'lunes a viernes, de 08:00 a 18:00 Horas'
  let startTime = '08:00'
  let endTime = '18:00'
  
  // Extraer horarios del texto
  const timeMatch = scheduleText.match(/(\d{1,2}:\d{2})\s*a\s*(\d{1,2}:\d{2})/i)
  if (timeMatch) {
    startTime = timeMatch[1]
    endTime = timeMatch[2]
  }
  
  if (scheduleText.includes(';')) {
    // Horarios separados
    const [mondayThursday, friday] = scheduleText.split(';').map((s: string) => s.trim())
    const fridayTimeMatch = friday.match(/(\d{1,2}:\d{2})\s*a\s*(\d{1,2}:\d{2})/i)
    if (fridayTimeMatch) {
      scheduleText = `${mondayThursday}, y ${friday}`
    } else {
      scheduleText = `${mondayThursday}, y ${friday}`
    }
  }
  
  text += `El trabajador cumplirá una jornada semanal ordinaria máxima de cuarenta horas, conforme a lo establecido en la Ley N° 21.561, que modifica el Código del Trabajo en materia de jornada laboral. Esta jornada se distribuirá de lunes a viernes, de acuerdo a la siguiente distribución referencial diaria: *${scheduleText}*. El horario de ingreso será a las *${startTime}* horas.\n\n`
  
  const lunchMinutes = contract.lunch_break_duration || 60
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
  
  text += `La jornada de trabajo será interrumpida con un descanso de colación de ${lunchText}, el cual no será imputable a la jornada laboral y será de cargo del Trabajador. Este descanso se otorgará en el horario que el empleador determine, dentro de la jornada de trabajo.\n\n`
  text += `Sin perjuicio de lo anterior, y cuando las necesidades operacionales de la empresa así lo requieran, la jornada de trabajo podrá modificarse en cuanto a su distribución horaria, siempre que no signifique menoscabo para el trabajador, se respeten los límites legales establecidos en la Ley N° 21.561 y el Código del Trabajo, y se mantenga la jornada semanal máxima de cuarenta horas. Cualquier modificación será comunicada al trabajador con la debida anticipación.\n\n`

  // TERCERO: Trabajo extraordinario
  text += `TERCERO: Cuando por necesidades de funcionamiento de la Empresa, sea necesario pactar trabajo en tiempo extraordinario, el Empleado que lo acuerde desde luego se obligará a cumplir el horario que al efecto determine el Empleador, dentro de los límites legales. A falta de acuerdo, queda prohibido expresamente al Empleado trabajar sobretiempo o simplemente permanecer en el recinto de la Empresa, después de la hora diaria de salida, salvo en los casos a que se refiere el inciso precedente.\n\n`
  text += `El tiempo extraordinario trabajado de acuerdo a las estipulaciones precedentes, se remunera con el recargo legal correspondiente y se liquidará y pagará conjuntamente con la remuneración del respectivo período.\n\n`

  // CUARTO: Remuneraciones
  text += `CUARTO:\n\n`
  text += `a. *Sueldo Base*: Se establece como sueldo base la suma de *$ ${formatCurrency(contract.base_salary)} (${numberToWords(Math.round(contract.base_salary)).toLowerCase()} pesos)*.\n\n`
  
  if (contract.gratuity) {
    if (contract.gratuity_amount) {
      text += `b. *Gratificación*: Se pagará una gratificación fija mensual de *$ ${formatCurrency(contract.gratuity_amount)} (${numberToWords(Math.round(contract.gratuity_amount)).toLowerCase()} pesos)*.\n\n`
    } else {
      text += `b. *Gratificación*: Se pagará de acuerdo con la modalidad del artículo 50 del código del trabajo, esto es el *25% de la remuneración* devengada por el trabajador, con un *tope de 4.75 ingresos mínimos* mensuales, la cual se pagará mensualmente en el equivalente a un duodécimo de los 4.75 ingresos mínimos mensuales. Con este pago se entenderá cumplida la obligación de la empresa de pagar gratificación legal.\n\n`
    }
  }
  
  // Procesar bonos desde other_allowances
  if (contract.other_allowances && contract.other_allowances.trim()) {
    // Formato esperado: "Bono 1: $monto1; Bono 2: $monto2"
    const bonuses = contract.other_allowances.split(';').map((b: string) => b.trim()).filter((b: string) => b)
    if (bonuses.length > 0) {
      let bonusLetter = 'c'
      bonuses.forEach((bonus: string) => {
        // Buscar patrón: "Nombre del Bono: $monto" o "Nombre del Bono: $ monto"
        const match = bonus.match(/^(.+?):\s*\$\s*(.+)$/)
        if (match) {
          const bonusName = match[1].trim()
          let bonusAmount = match[2].trim()
          // Remover puntos (separadores de miles) y convertir a número
          // El formato puede ser: "100.000" o "100000"
          bonusAmount = bonusAmount.replace(/\./g, '').replace(/,/g, '.')
          const amountNum = parseFloat(bonusAmount) || 0
          if (amountNum > 0) {
            text += `${bonusLetter}. *${bonusName}*: Se pagará un ${bonusName.toLowerCase()} de *$ ${formatCurrency(amountNum)} (${numberToWords(Math.round(amountNum)).toLowerCase()} pesos)*.\n\n`
            bonusLetter = String.fromCharCode(bonusLetter.charCodeAt(0) + 1)
          }
        } else {
          // Si no coincide el formato, agregarlo como está
          text += `${bonusLetter}. ${bonus}\n\n`
          bonusLetter = String.fromCharCode(bonusLetter.charCodeAt(0) + 1)
        }
      })
    }
  }
  
  const paymentDay = contract.payment_periodicity === 'mensual' ? '5' : contract.payment_periodicity === 'quincenal' ? '5 y 20' : 'cada viernes'
  const paymentMethod = contract.payment_method === 'transferencia' 
    ? `transferencia bancaria${contract.bank_name ? ` en *${contract.bank_name}*${contract.account_type ? `, cuenta *${contract.account_type === 'corriente' ? 'corriente' : contract.account_type === 'ahorro' ? 'de ahorro' : 'vista'}*${contract.account_number ? ` N° *${contract.account_number}*` : ''}` : ''}` : ''}`
    : contract.payment_method === 'efectivo' ? 'efectivo' : 'cheque'
  text += `Las remuneraciones se pagarán los días ${paymentDay} de cada mes por período vencido, mediante ${paymentMethod}.\n\n`
  
  text += `Sin perjuicio de la remuneración imponible pactada, el empleador podrá pagar al trabajador asignaciones por concepto de movilización y colación, las cuales no constituyen remuneración para ningún efecto legal, de conformidad a lo dispuesto en el artículo 41 inciso segundo del Código del Trabajo, por cuanto tienen como único objeto compensar gastos efectivos en que el trabajador incurra con ocasión de la prestación de sus servicios.\n\n`
  text += `Dichas asignaciones se devengarán exclusivamente por día efectivamente trabajado, encontrándose condicionadas a la asistencia real del trabajador, a la faena, lugar de prestación de servicios, jornada o sistema de turnos aplicable. En consecuencia, su monto, forma de cálculo o procedencia podrán variar según dichas condiciones operativas, manteniendo siempre su carácter compensatorio y no incorporándose a la base de cálculo de remuneraciones, indemnizaciones, cotizaciones previsionales ni otros beneficios laborales.\n\n`

  // QUINTO: Descuentos legales
  text += `QUINTO: El trabajador acepta y autoriza al empleador para que éste practique de sus remuneraciones los descuentos a que se refiere el inciso primero del artículo 58 del código del trabajo como, asimismo, descuente el tiempo no trabajado debido a inasistencia, atrasos o permisos; además de las multas señaladas en el reglamento interno de orden higiene y seguridad.\n\n`

  // SEXTO: Obligaciones esenciales
  text += `SEXTO: Son obligaciones esenciales del contrato de trabajo las siguientes normas cuya infracción será causa justificada de término del contrato, conforme a las leyes vigentes:\n\n`
  text += `a. Cumplir las órdenes que imparta el empleador.\n\n`
  text += `b. No realizar trabajos relacionados con el rubro de la empresa o prestar servicios a la competencia.\n\n`
  text += `c. Cumplir con el reglamento interno existente en la empresa el cual se entrega y se pone en conocimiento del trabajador en el acto de la firma del presente contrato de trabajo.\n\n`
  text += `d. Divulgación de información confidencial relacionada con las actividades de la empresa a la cual tenga acceso, salvo requerimiento formal proveniente de los Tribunales de Justicia.\n\n`
  text += `e. Informar o poner en conocimiento de personas ajenas a la empresa, datos, documentos o antecedentes que por su naturaleza deben mantenerse en reserva o que puedan utilizarse o no en contra de la gestión comercial, económica o industrial de la empresa. Del mismo modo hacer denuncias de hechos o situaciones irregulares de competencia exclusiva de la empresa, con o sin documentos de cualquier tipo, a personas de la empresa mandante, sin la debida autorización de la Gerencia General, de su Representante Legal o de su Jefe Directo.\n\n`
  
  if (contract.confidentiality_clause) {
    text += `${contract.confidentiality_clause}\n\n`
  }

  // SÉPTIMO: Atrasos
  text += `SÉPTIMO: Las partes acuerdan en este acto que los atrasos reiterados, sin causa justificada, de parte del trabajador, se considerarán incumplimiento grave de las obligaciones que impone el presente contrato y darán lugar a la aplicación de la caducidad del contrato, contemplada en el art.160 Nº7 del Código del Trabajo. Se entenderá por atraso reiterado el llegar después de la hora de ingreso durante 3 Días seguidos o no, en cada mes calendario. Bastará para acreditar esta situación la constancia en el respectivo Control de Asistencia.\n\n`

  // OCTAVO: Reglamento interno
  text += `OCTAVO: El Trabajador declara conocer el Reglamento Interno de su Empleador, el cual se compromete a cumplir en todas sus partes. Para efectos legales, el Reglamento Interno se considera parte integrante del presente Contrato de Trabajo.\n\n`
  text += `Para tal efecto, en este acto, se le entrega una copia del Reglamento Interno al Trabajador, quien firma y suscribe su aceptación y recepción.\n\n`
  
  if (contract.internal_regulations) {
    text += `${contract.internal_regulations}\n\n`
  }

  // NOVENO: Ropa de trabajo
  text += `NOVENO: El Empleador de acuerdo a las labores ejecutadas por el trabajador, entregará ropa de trabajo, implementos de seguridad, y herramientas el cual deberá mantener en buen estado y conservación, siendo de su cargo la limpieza y pérdidas que ellos sufran. En el evento de que el Trabajador no efectúe la restitución de los implementos a su cargo, esta faculta al Empleador para que descuente de su Remuneración dichos implementos de trabajo.\n\n`

  // DÉCIMO: Vehículos
  text += `DÉCIMO: En caso de que se le asigne vehículo a cargo, el conductor se responsabilizará de los daños materiales que le ocasione al vehículo a su cargo por accidentes y otras causas propias y ajenas a la conducción.\n\n`
  text += `Además, se hace responsable de las notificaciones por infracciones del tránsito cursadas por Carabineros o inspectores municipales y aquellas que se hagan al empadronamiento del vehículo. Para estos efectos el Empleador podrá descontar o deducir de las remuneraciones mensuales del conductor, un porcentaje no superior al 10% de éstas mensualmente, hasta enterar el total de las sumas que éste debiera haber cancelado. Por este instrumento el conductor acepta el compromiso de devolver las sumas pagadas por el Empleador en forma prevista en esta cláusula y autoriza las deducciones correspondientes, respetándose, en todo caso, el tope de los descuentos permitido por la ley.\n\n`

  // DÉCIMO PRIMERO: Negociación colectiva
  text += `DÉCIMO PRIMERO: De acuerdo con el artículo 305 del código del trabajo, el trabajador se encuentra prohibido de negociar colectivamente.\n\n`

  // DÉCIMO SEGUNDO: Seguridad
  text += `DÉCIMO SEGUNDO: El hecho de faltar a cualquier norma de seguridad de las faenas a las que fuere enviado y el no uso de los elementos de seguridad básicos en una faena minera u otra, será considerado como falta grave la cual será causal de despido. Se comprende también como falta grave el presentarse a labores bajo los efectos del alcohol o drogas, de presentarse el trabajador bajo estas condiciones será causal de despido.\n\n`

  // DÉCIMO TERCERO: Duración
  text += `DÉCIMO TERCERO: Se deja expresa constancia que el trabajador iniciará sus servicios para la empresa a partir del ${formatDateLegal(contract.start_date)}, ${durationText}, lo que se hará constar.\n\n`

  // DÉCIMO CUARTO: Ejemplares
  text += `DÉCIMO CUARTO: El presente contrato se firma en dos ejemplares y se deja expresa constancia que el trabajador recibe una de ellas.\n\n`

  // DÉCIMO QUINTO: Previsional
  let previsionalText = ''
  
  // Verificar si tiene régimen especial (DIPRECA, CAPREDENA, SIN_PREVISION)
  if (employee.previsional_regime === 'OTRO_REGIMEN' && employee.other_regime_type) {
    // Régimen especial
    const regimeLabels: { [key: string]: string } = {
      'DIPRECA': 'DIPRECA (Dirección de Previsión de Carabineros de Chile)',
      'CAPREDENA': 'CAPREDENA (Caja de Previsión de la Defensa Nacional)',
      'SIN_PREVISION': 'Sin Sistema Previsional (exento de cotizaciones previsionales)'
    }
    
    const regimeLabel = regimeLabels[employee.other_regime_type] || employee.other_regime_type
    
    if (employee.other_regime_type === 'SIN_PREVISION') {
      previsionalText = `DÉCIMO QUINTO: Se deja expresa constancia que, para los efectos de la deducción de impuestos y cotizaciones que resulten procedentes por esta prestación de servicios, el trabajador declara estar exento de cotizaciones previsionales (*${regimeLabel}*), conforme a lo establecido en la legislación vigente.\n\n`
    } else {
      // DIPRECA o CAPREDENA
      const healthText = employee.manual_health_rate 
        ? `sistema de salud administrado por ${regimeLabel.split('(')[0].trim()}`
        : 'sistema de salud correspondiente'
      
      previsionalText = `DÉCIMO QUINTO: Se deja expresa constancia que, para los efectos de la deducción de impuestos y cotizaciones que resulten procedentes por esta prestación de servicios, el trabajador declara pertenecer al régimen previsional de *${regimeLabel}*, y al ${healthText}, conforme a lo establecido en el DL N°3.500 de 1980 y normativa especial aplicable.\n\n`
    }
  } else {
    // Régimen AFP normal
    const healthSystemText = employee.health_system === 'FONASA' ? 'FONASA' : 
      employee.health_system === 'ISAPRE' ? `ISAPRE${employee.health_plan ? ` ${employee.health_plan}` : ''}` : 
      employee.health_system || 'FONASA'
    
    previsionalText = `DÉCIMO QUINTO: Se deja expresa constancia que, para los efectos de la deducción de impuestos, cotizaciones de previsión o de seguridad social, como de otros legales que resulten procedentes por esta prestación de servicios, el trabajador declara pertenecer a la *AFP ${employee.afp || 'N/A'}* y a *${healthSystemText}*.\n\n`
  }
  
  text += previsionalText

  // Cierre
  text += `Para constancia, se firma el presente contrato en dos ejemplares del mismo tenor y fecha, quedando uno en poder de cada parte.`

  return text
}

