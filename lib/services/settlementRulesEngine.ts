/**
 * Motor de Reglas de Finiquitos - PiwiRH
 * Settlement Rules Engine conforme al Codigo del Trabajo chileno
 *
 * Cada causal de termino de contrato tiene su propia configuracion
 * que determina automaticamente que conceptos corresponden pagar
 * y cuales no, segun la legislacion aplicable.
 *
 * Referencias legales:
 * - Art.159 CT: Mutuo acuerdo, renuncia, muerte, plazo fijo, obra, fuerza mayor
 * - Art.160 CT: Despido disciplinario (N°1 al N°7)
 * - Art.161 CT: Necesidades de la empresa, desahucio
 * - Art.163 CT: Indemnizacion por anos de servicio (IAS)
 * - Art.163 bis CT: Indemnizacion sustitutiva del aviso previo
 * - Art.68 CT: Vacaciones anuales y proporcionales
 * - Art.67 CT: Feriado progresivo (derecho adicional)
 * - Art.44 CT: Remuneraciones (gratificacion, sueldo proporcional)
 * - Art.50 CT: Proteccion maternidad (fuero maternal)
 * - DL 3500/1980: Prevision social
 * - Ley 21.562: Reforma previsional 2026 (SIS, CRP, AFC empleador)
 *
 * PROHIBICION: No hardcodear montos, porcentajes ni reglas.
 * Toda la logica debe ser mantenible y centralizada.
 */

// ============================================
// TIPOS DEL MOTOR DE REGLAS
// ============================================

export interface SettlementRuleConfig {
  code: string
  label: string
  article: string
  description: string
  legalReference: string

  pagaDiasTrabajados: boolean
  pagaSaldoSueldo: boolean
  pagaGratificacionProporcional: boolean
  pagaBonosProporcionales: boolean
  pagaMovilizacion: boolean
  pagaColacion: boolean
  pagaSemanaCorrida: boolean

  pagaVacacionesPendientes: boolean
  pagaVacacionesProporcionales: boolean
  pagaFeriadoProgresivo: boolean

  pagaIAS: boolean
  pagaIAP: boolean
  permiteIndemnizacionVoluntaria: boolean

  descuentaPrevision: boolean
  descuentaSalud: boolean
  descuentaAFC: boolean
  descuentaImpuestoUnico: boolean
  descuentaPrestamos: boolean
  descuentaAnticipos: boolean
  descuentaHaberesPendientes: boolean

  requiereAvisoPrevio: boolean
  avisoPrevioDiasMinimos: number

  iasTopeAnios: number

  requiereClauEspecial: string[]
  clausulaBase: string

  restricciones: string[]
  advertencias: string[]
}

export interface SettlementRuleEvaluation {
  ruleConfig: SettlementRuleConfig
  conceptos: SettlementConceptResult
  auditLog: SettlementAuditEntry[]
  warnings: string[]
  blocked: boolean
  blockedReason?: string
}

export interface SettlementConceptResult {
  diasTrabajados: { aplica: boolean; monto: number; base: string; articulo: string }
  saldoSueldo: { aplica: boolean; monto: number; base: string; articulo: string }
  gratificacionProporcional: { aplica: boolean; monto: number; base: string; articulo: string }
  bonosProporcionales: { aplica: boolean; monto: number; base: string; articulo: string }
  movilizacion: { aplica: boolean; monto: number; base: string; articulo: string }
  colacion: { aplica: boolean; monto: number; base: string; articulo: string }
  semanaCorrida: { aplica: boolean; monto: number; base: string; articulo: string }

  vacacionesPendientes: { aplica: boolean; dias: number; monto: number; base: string; articulo: string }
  vacacionesProporcionales: { aplica: boolean; dias: number; monto: number; base: string; articulo: string }
  feriadoProgresivo: { aplica: boolean; dias: number; monto: number; base: string; articulo: string }

  ias: { aplica: boolean; monto: number; anios: number; base: string; articulo: string }
  iap: { aplica: boolean; monto: number; diasAviso: number; base: string; articulo: string }
  indemnizacionVoluntaria: { aplica: boolean; monto: number; base: string; articulo: string }

  descuentoAFP: { aplica: boolean; monto: number; base: string; articulo: string }
  descuentoSalud: { aplica: boolean; monto: number; base: string; articulo: string }
  descuentoAFC: { aplica: boolean; monto: number; base: string; articulo: string }
  descuentoImpuestoUnico: { aplica: boolean; monto: number; base: string; articulo: string }
  descuentoPrestamos: { aplica: boolean; monto: number; base: string; articulo: string }
  descuentoAnticipos: { aplica: boolean; monto: number; base: string; articulo: string }
  descuentoHaberesPendientes: { aplica: boolean; monto: number; base: string; articulo: string }
}

export interface SettlementAuditEntry {
  timestamp: string
  ruleCode: string
  decision: string
  reason: string
  legalReference: string
  valor: boolean | number | string
}

// ============================================
// REGLAS POR CAUSAL - CODIGO DEL TRABAJO
// ============================================

const SETTLEMENT_RULES: Record<string, SettlementRuleConfig> = {

  // ============================================================
  // ART.159 - CAUSALES DE TERMINO SIN RESPONSABILIDAD EMPLEADOR
  // ============================================================

  '159_1': {
    code: '159_1',
    label: 'Mutuo acuerdo',
    article: 'art.159 N°1',
    description: 'Las partes acuerdan poner termino al contrato de trabajo',
    legalReference: 'Art.159 N°1 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,

    iasTopeAnios: 0,

    requiereClauEspecial: ['mutuo_acuerdo'],
    clausulaBase: 'Por mutuo acuerdo de las partes, de conformidad con lo dispuesto en el articulo 159 N°1 del Codigo del Trabajo, ponemos termino al contrato de trabajo',

    restricciones: ['No corresponde IAS (art.163 CT solo aplica cuando el empleador pone termino por art.161)'],
    advertencias: ['Verificar que el mutuo acuerdo sea voluntario y sin coaccion']
  },

  '159_2': {
    code: '159_2',
    label: 'Renuncia voluntaria',
    article: 'art.159 N°2',
    description: 'El trabajador renuncia voluntariamente a su empleo',
    legalReference: 'Art.159 N°2 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['renuncia_voluntaria'],
    clausulaBase: 'El trabajador renuncia voluntariamente a su empleo, de conformidad con el articulo 159 N°2 del Codigo del Trabajo',

    restricciones: ['No corresponde IAS ni IAP (el trabajador pone termino voluntariamente)'],
    advertencias: ['La renuncia debe constar por escrito y ser firmada por el trabajador ante testigos o autoridad']
  },

  '159_3': {
    code: '159_3',
    label: 'Muerte del trabajador',
    article: 'art.159 N°3',
    description: 'Fallecimiento del trabajador',
    legalReference: 'Art.159 N°3 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: false,

    descuentaPrevision: false,
    descuentaSalud: false,
    descuentaAFC: false,
    descuentaImpuestoUnico: false,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['muerte_trabajador'],
    clausulaBase: 'Por fallecimiento del trabajador, de conformidad con el articulo 159 N°3 del Codigo del Trabajo',

    restricciones: [
      'No se descuentan cotizaciones previsionales (el pago se hace a los herederos)',
      'No se descuenta impuesto unico (pago a herederos)'
    ],
    advertencias: ['El pago se realiza a los herederos legales o beneficiarios de pension de sobrevivencia']
  },

  '159_4': {
    code: '159_4',
    label: 'Vencimiento plazo fijo',
    article: 'art.159 N°4',
    description: 'Vencimiento del plazo convenido en contrato a plazo fijo',
    legalReference: 'Art.159 N°4 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: false,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['plazo_fijo'],
    clausulaBase: 'Por vencimiento del plazo convenido en el contrato, de conformidad con el articulo 159 N°4 del Codigo del Trabajo',

    restricciones: ['No corresponde AFC trabajador en contrato a plazo fijo'],
    advertencias: ['Verificar que el contrato sea efectivamente a plazo fijo y que no se haya desnaturalizado']
  },

  '159_5': {
    code: '159_5',
    label: 'Conclusion obra o faena',
    article: 'art.159 N°5',
    description: 'Conclusion de la obra o faena que dio origen al contrato',
    legalReference: 'Art.159 N°5 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: false,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['obra_faena'],
    clausulaBase: 'Por conclusion de la obra o faena que dio origen al contrato, de conformidad con el articulo 159 N°5 del Codigo del Trabajo',

    restricciones: ['No corresponde AFC trabajador en contrato por obra o faena'],
    advertencias: ['La terminacion debe estar relacionada estrictamente con la obra o faena']
  },

  '159_6': {
    code: '159_6',
    label: 'Caso fortuito o fuerza mayor',
    article: 'art.159 N°6',
    description: 'Casos fortuitos o de fuerza mayor que impidan la continuacion del contrato',
    legalReference: 'Art.159 N°6 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['fuerza_mayor'],
    clausulaBase: 'Por caso fortuito o fuerza mayor, de conformidad con el articulo 159 N°6 del Codigo del Trabajo',

    restricciones: ['Debe acreditarse fehacientemente el caso fortuito o fuerza mayor'],
    advertencias: ['La fuerza mayor debe ser externa, imprevisible e irresistible']
  },

  // ============================================================
  // ART.160 - DESPIDO DISCIPLINARIO
  // Cada N° tiene reglas distintas
  // ============================================================

  '160_1': {
    code: '160_1',
    label: 'Falta de probidad, conductas indebidas o acoso',
    article: 'art.160 N°1',
    description: 'Alguna de las faltas de probidad, vias de hecho, injurias o conductas indebidas sealadas en el art.160 N°1',
    legalReference: 'Art.160 N°1 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['despido_disciplinario', 'requiere_investigacion'],
    clausulaBase: 'Por falta de probidad, conductas indebidas o acoso, de conformidad con el articulo 160 N°1 del Codigo del Trabajo',

    restricciones: [
      'No corresponde IAS (art.163 solo aplica en art.161)',
      'No corresponde IAP (no aplica aviso previo en despido disciplinario)',
      'La causal debe estar debidamente acreditada'
    ],
    advertencias: [
      'Se requiere investigacion previa y derecho a descargos',
      'La imputacion debe ser comunicada por escrito al trabajador',
      'Verificar prescripcion de acciones (60 dias habiles desde la separacion)'
    ]
  },

  '160_2': {
    code: '160_2',
    label: 'Negociaciones prohibidas',
    article: 'art.160 N°2',
    description: 'Negociaciones que ejecute el trabajador dentro del giro del negocio y que esten prohibidas por el contrato',
    legalReference: 'Art.160 N°2 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['despido_disciplinario', 'negociacion_prohibida'],
    clausulaBase: 'Por negociaciones prohibidas por el contrato, de conformidad con el articulo 160 N°2 del Codigo del Trabajo',

    restricciones: ['No corresponde IAS ni IAP', 'La prohibicion debe estar expresamente pactada en el contrato'],
    advertencias: ['El contrato debe contener la clausula de prohibicion expresa']
  },

  '160_3': {
    code: '160_3',
    label: 'No concurrencia a trabajar (ausentismo)',
    article: 'art.160 N°3',
    description: 'No concurrencia del trabajador a sus labores sin causa justificada durante 2 dias lunes y jueves o 3 dias en periodo mensual',
    legalReference: 'Art.160 N°3 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['despido_disciplinario', 'ausentismo'],
    clausulaBase: 'Por no concurrencia a sus labores sin causa justificada, de conformidad con el articulo 160 N°3 del Codigo del Trabajo',

    restricciones: ['No corresponde IAS ni IAP'],
    advertencias: [
      'Deben cumplirse los dias de ausentismo requeridos por la ley',
      'Se requiere carta de aviso al trabajador dentro de 3 dias habiles',
      'Deben descontarse los dias no trabajados del saldo de sueldo'
    ]
  },

  '160_4': {
    code: '160_4',
    label: 'Vicio del trabajo o embriaguez',
    article: 'art.160 N°4',
    description: 'Vicio del trabajo, ebriedad habitual o consumo de drogas en el lugar de trabajo',
    legalReference: 'Art.160 N°4 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['despido_disciplinario', 'vicio_trabajo'],
    clausulaBase: 'Por vicio del trabajo, ebriedad habitual o consumo de drogas, de conformidad con el articulo 160 N°4 del Codigo del Trabajo',

    restricciones: ['No corresponde IAS ni IAP'],
    advertencias: ['El vicio debe perjudicar el trabajo y ser habitual']
  },

  '160_5': {
    code: '160_5',
    label: 'Dano patrimonial al empleador',
    article: 'art.160 N°5',
    description: 'Dano, perjuicio o deterioro de bienes del empleador por negligencia dolo o culpa del trabajador',
    legalReference: 'Art.160 N°5 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['despido_disciplinario', 'dano_patrimonial'],
    clausulaBase: 'Por dano, perjuicio o deterioro de bienes del empleador, de conformidad con el articulo 160 N°5 del Codigo del Trabajo',

    restricciones: ['No corresponde IAS ni IAP', 'El dano debe ser acreditado'],
    advertencias: ['El dano debe ser intencional o causado con negligencia grave', 'El empleador puede demandar la indemnizacion por dano']
  },

  '160_6': {
    code: '160_6',
    label: 'Abandono del trabajo',
    article: 'art.160 N°6',
    description: 'Abandono del trabajo por parte del trabajador (salida intempestiva, negativa a trabajar sin causa justificada)',
    legalReference: 'Art.160 N°6 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['despido_disciplinario', 'abandono_trabajo'],
    clausulaBase: 'Por abandono del trabajo, de conformidad con el articulo 160 N°6 del Codigo del Trabajo',

    restricciones: ['No corresponde IAS ni IAP'],
    advertencias: [
      'La salida intempestiva debe ser injustificada',
      'La negativa a trabajar debe estar acreditada'
    ]
  },

  '160_7': {
    code: '160_7',
    label: 'Incumplimiento grave de obligaciones contractuales',
    article: 'art.160 N°7',
    description: 'Incumplimiento grave de las obligaciones que impone el contrato de trabajo',
    legalReference: 'Art.160 N°7 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['despido_disciplinario', 'incumplimiento_grave', 'requiere_investigacion'],
    clausulaBase: 'Por incumplimiento grave de las obligaciones que impone el contrato de trabajo, de conformidad con el articulo 160 N°7 del Codigo del Trabajo',

    restricciones: [
      'No corresponde indemnizacion por anos de servicio (art.163 CT solo aplica en art.161)',
      'No corresponde indemnizacion sustitutiva del aviso previo (art.163 bis CT)',
      'El incumplimiento debe ser grave y estar debidamente acreditado',
      'La empresa puede agregar indemnizacion voluntaria si lo desea'
    ],
    advertencias: [
      'Se requiere investigacion interna y derecho a descargos del trabajador',
      'La carta de despido debe indicar los hechos constitutivos del incumplimiento',
      'El despido debe comunicarse por escrito dentro de 3 dias habiles (art.162 CT)',
      'Verificar prescripcion de acciones (60 dias habiles)',
      'Si el trabajador demanda y se declara injustificado el despido, se deben pagar las indemnizaciones con recargo'
    ]
  },

  // ============================================================
  // ART.161 - NECESIDADES DE LA EMPRESA / DESAHUCIO
  // Generan IAS y potencialmente IAP
  // ============================================================

  '161_1': {
    code: '161_1',
    label: 'Necesidades de la empresa',
    article: 'art.161 N°1',
    description: 'Necesidades de la empresa, establecimiento o servicio que motiven el despido',
    legalReference: 'Art.161 N°1 y Art.163 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: true,
    pagaIAP: true,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: true,
    avisoPrevioDiasMinimos: 30,
    iasTopeAnios: 11,

    requiereClauEspecial: ['necesidades_empresa', 'requiere_aviso_previo'],
    clausulaBase: 'Por necesidades de la empresa, establecimiento o servicio, de conformidad con el articulo 161 N°1 del Codigo del Trabajo',

    restricciones: [
      'Corresponde IAS si el trabajador tiene 1 ano o mas de servicio (art.163 CT)',
      'Corresponde IAP si no se dio aviso previo de 30 dias (art.163 bis CT)',
      'La causal debe estar debidamente fundamentada en los hechos'
    ],
    advertencias: [
      'Si el despido se declara injustificado, se aplica recargo del 30% al 50% sobre la IAS',
      'El aviso previo debe darse con 30 dias de anticipacion o pagar la indemnizacion sustitutiva',
      'Se debe pagar la IAS con tope de 11 anos (art.163 CT)',
      'Si el empleador no paga las cotizaciones previsionales al momento del despido, se aplica art.162 bis CT (nulidad del despido)'
    ]
  },

  '161_2': {
    code: '161_2',
    label: 'Desahucio del empleador',
    article: 'art.161 N°2',
    description: 'Desahucio dado por el empleador en contratos de plazo fijo o por obra',
    legalReference: 'Art.161 N°2 y Art.163 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: true,
    pagaIAP: true,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: false,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: true,
    avisoPrevioDiasMinimos: 30,
    iasTopeAnios: 11,

    requiereClauEspecial: ['desahucio', 'requiere_aviso_previo'],
    clausulaBase: 'Por desahucio del empleador, de conformidad con el articulo 161 N°2 del Codigo del Trabajo',

    restricciones: [
      'Corresponde IAS si el trabajador tiene 1 ano o mas de servicio',
      'Corresponde IAP si no se dio aviso previo',
      'No se descuenta AFC en contratos a plazo fijo',
      'Solo aplica para contratos a plazo fijo o por obra'
    ],
    advertencias: [
      'Verificar que el contrato sea efectivamente a plazo fijo o por obra',
      'Si se desnaturaliza el contrato a plazo fijo, se transforma en indefinido'
    ]
  },

  // ============================================================
  // ART.163 BIS - LIQUIDACION O QUIEBRA
  // ============================================================

  '163bis': {
    code: '163bis',
    label: 'Liquidacion concursal o quiebra',
    article: 'art.163 bis',
    description: 'Termino del contrato por liquidacion o quiebra de la empresa',
    legalReference: 'Art.163 bis Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: true,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 11,

    requiereClauEspecial: ['liquidacion_quiebra'],
    clausulaBase: 'Por liquidacion o quiebra de la empresa, de conformidad con el articulo 163 bis del Codigo del Trabajo',

    restricciones: [
      'Corresponde IAS con tope de 11 anos',
      'No corresponde IAP (no aplica aviso previo en caso de quiebra)'
    ],
    advertencias: [
      'El pago puede estar sujeto a las reglas de la quiebra',
      'Verificar privilegios crediticios del trabajador en la quiebra'
    ]
  },

  // ============================================================
  // Entrada LEGACY para compatibilidad - art.160 generico
  // Se recomienda usar las causales especificas 160_1 a 160_7
  // ============================================================

  '160': {
    code: '160',
    label: 'Despido disciplinario (generico)',
    article: 'art.160',
    description: 'Despido por causales disciplinarias (usar causales especificas 160_1 a 160_7 cuando sea posible)',
    legalReference: 'Art.160 Codigo del Trabajo',

    pagaDiasTrabajados: true,
    pagaSaldoSueldo: true,
    pagaGratificacionProporcional: true,
    pagaBonosProporcionales: true,
    pagaMovilizacion: true,
    pagaColacion: true,
    pagaSemanaCorrida: true,

    pagaVacacionesPendientes: true,
    pagaVacacionesProporcionales: true,
    pagaFeriadoProgresivo: true,

    pagaIAS: false,
    pagaIAP: false,
    permiteIndemnizacionVoluntaria: true,

    descuentaPrevision: true,
    descuentaSalud: true,
    descuentaAFC: true,
    descuentaImpuestoUnico: true,
    descuentaPrestamos: true,
    descuentaAnticipos: true,
    descuentaHaberesPendientes: true,

    requiereAvisoPrevio: false,
    avisoPrevioDiasMinimos: 0,
    iasTopeAnios: 0,

    requiereClauEspecial: ['despido_disciplinario'],
    clausulaBase: 'Por despido disciplinario, de conformidad con el articulo 160 del Codigo del Trabajo',

    restricciones: [
      'No corresponde IAS ni IAP en causales disciplinarias',
      'Se recomienda usar las causales especificas (160_1 a 160_7)'
    ],
    advertencias: [
      'Esta causal es generica. Se recomienda especificar la causal exacta (160_1 a 160_7)',
      'Las reglas se aplican segun la causal generica art.160'
    ]
  }
}

// ============================================
// FUNCIONES DEL MOTOR DE REGLAS
// ============================================

export function getSettlementRule(causeCode: string): SettlementRuleConfig | null {
  return SETTLEMENT_RULES[causeCode] || null
}

export function getAllSettlementRules(): SettlementRuleConfig[] {
  return Object.values(SETTLEMENT_RULES)
}

export function getSettlementRulesByArticle(article: string): SettlementRuleConfig[] {
  return Object.values(SETTLEMENT_RULES).filter(r => r.article.startsWith(article))
}

export function evaluateSettlementRule(
  causeCode: string,
  context: {
    serviceYears: number
    noticeGiven: boolean
    noticeDays?: number
    contractType?: string
    voluntaryIndemnity?: number
    vacationDaysPending: number
    vacationDaysProportional: number
    feriadoProgresivoDays?: number
    hasVariableRemuneration?: boolean
  }
): SettlementRuleEvaluation {
  const auditLog: SettlementAuditEntry[] = []
  const warnings: string[] = []
  const blocked = false
  let blockedReason: string | undefined

  const rule = getSettlementRule(causeCode)

  if (!rule) {
    return {
      ruleConfig: null as any,
      conceptos: null as any,
      auditLog: [{
        timestamp: new Date().toISOString(),
        ruleCode: causeCode,
        decision: 'BLOQUEADO',
        reason: 'Causal no encontrada en el motor de reglas',
        legalReference: 'N/A',
        valor: causeCode
      }],
      warnings: [`Causal "${causeCode}" no configurada en el motor de reglas`],
      blocked: true,
      blockedReason: `Causal "${causeCode}" no configurada en el motor de reglas. Configure la causal antes de calcular el finiquito.`
    }
  }

  const now = new Date().toISOString()

  const addAudit = (decision: string, reason: string, legalRef: string, valor: boolean | number | string) => {
    auditLog.push({ timestamp: now, ruleCode: causeCode, decision, reason, legalReference: legalRef, valor })
  }

  // ==========================================
  // EVALUAR HABERES IMPONIBLES
  // ==========================================

  addAudit('evaluar_dias_trabajados', rule.pagaDiasTrabajados ? 'APLICA' : 'NO_APLICA', 'Art.44 CT', rule.pagaDiasTrabajados)
  addAudit('evaluar_saldo_sueldo', rule.pagaSaldoSueldo ? 'APLICA' : 'NO_APLICA', 'Art.44 CT', rule.pagaSaldoSueldo)
  addAudit('evaluar_gratificacion', rule.pagaGratificacionProporcional ? 'APLICA' : 'NO_APLICA', 'Art.47 CT', rule.pagaGratificacionProporcional)
  addAudit('evaluar_bonos', rule.pagaBonosProporcionales ? 'APLICA' : 'NO_APLICA', 'Art.44 CT', rule.pagaBonosProporcionales)
  addAudit('evaluar_movilizacion', rule.pagaMovilizacion ? 'APLICA' : 'NO_APLICA', 'Art.47 CT (no imponible)', rule.pagaMovilizacion)
  addAudit('evaluar_colacion', rule.pagaColacion ? 'APLICA' : 'NO_APLICA', 'Art.47 CT (no imponible)', rule.pagaColacion)

  if (context.hasVariableRemuneration) {
    addAudit('evaluar_semana_corrida', rule.pagaSemanaCorrida ? 'APLICA' : 'NO_APLICA', 'Art.45 CT', rule.pagaSemanaCorrida)
    warnings.push('Trabajador con remuneracion variable: se debe calcular semana corrida proporcional (art.45 CT)')
  }

  // ==========================================
  // EVALUAR VACACIONES
  // ==========================================

  addAudit('evaluar_vacaciones_pendientes', rule.pagaVacacionesPendientes ? 'APLICA' : 'NO_APLICA', 'Art.67 CT', rule.pagaVacacionesPendientes)
  addAudit('evaluar_vacaciones_proporcionales', rule.pagaVacacionesProporcionales ? 'APLICA' : 'NO_APLICA', 'Art.68 CT', rule.pagaVacacionesProporcionales)

  if (!rule.pagaVacacionesPendientes && context.vacationDaysPending > 0) {
    warnings.push(`Causal ${causeCode}: NO corresponde pago de vacaciones pendientes, pero el trabajador tiene ${context.vacationDaysPending} dias pendientes`)
  }

  if (!rule.pagaVacacionesProporcionales && context.vacationDaysProportional > 0) {
    warnings.push(`Causal ${causeCode}: NO corresponde pago de vacaciones proporcionales`)
  }

  if (rule.pagaFeriadoProgresivo && context.feriadoProgresivoDays && context.feriadoProgresivoDays > 0) {
    addAudit('evaluar_feriado_progresivo', 'APLICA', 'Art.68 CT (feriado progresivo)', true)
    warnings.push('Trabajador con derecho a feriado progresivo')
  }

  // ==========================================
  // EVALUAR INDEMNIZACIONES
  // ==========================================

  let iasAplica = rule.pagaIAS
  let iasAnios = 0
  let iapAplica = rule.pagaIAP

  if (rule.pagaIAS) {
    if (context.serviceYears < 1) {
      iasAplica = false
      iasAnios = 0
      addAudit('evaluar_ias', 'NO_APLICA', 'Art.163 CT', false)
      warnings.push('Trabajador con menos de 1 ano de servicio: no corresponde IAS (art.163 CT requiere 1 ano minimo)')
    } else {
      iasAnios = Math.min(context.serviceYears, rule.iasTopeAnios)
      iasAplica = true
      addAudit('evaluar_ias', 'APLICA', 'Art.163 CT', `${iasAnios} anos (tope: ${rule.iasTopeAnios})`)
    }
  } else {
    addAudit('evaluar_ias', 'NO_APLICA', `Art.160 CT / ${rule.legalReference}`, false)
  }

  if (rule.pagaIAP) {
    if (context.noticeGiven) {
      iapAplica = false
      addAudit('evaluar_iap', 'NO_APLICA', 'Art.163 bis CT', 'Aviso previo dado')
    } else {
      iapAplica = true
      addAudit('evaluar_iap', 'APLICA', 'Art.163 bis CT', true)
    }
  } else {
    addAudit('evaluar_iap', 'NO_APLICA', `${rule.legalReference}`, false)
  }

  if (rule.permiteIndemnizacionVoluntaria && (context.voluntaryIndemnity ?? 0) > 0) {
    addAudit('evaluar_indemnizacion_voluntaria', 'APLICA_VOLUNTARIA', 'Acuerdo de partes', context.voluntaryIndemnity ?? 0)
  }

  // ==========================================
  // EVALUAR DESCUENTOS
  // ==========================================

  addAudit('evaluar_descuento_afp', rule.descuentaPrevision ? 'APLICA' : 'NO_APLICA', 'DL 3500/1980', rule.descuentaPrevision)
  addAudit('evaluar_descuento_salud', rule.descuentaSalud ? 'APLICA' : 'NO_APLICA', 'Art.88 CT / DL 3500', rule.descuentaSalud)
  addAudit('evaluar_descuento_afc', rule.descuentaAFC ? 'APLICA' : 'NO_APLICA', 'Ley 19.728', rule.descuentaAFC)
  addAudit('evaluar_descuento_impuesto', rule.descuentaImpuestoUnico ? 'APLICA' : 'NO_APLICA', 'Art.84 Ley de Impuesto a la Renta', rule.descuentaImpuestoUnico)
  addAudit('evaluar_descuento_prestamos', rule.descuentaPrestamos ? 'APLICA' : 'NO_APLICA', 'Art.57 CT', rule.descuentaPrestamos)
  addAudit('evaluar_descuento_anticipos', rule.descuentaAnticipos ? 'APLICA' : 'NO_APLICA', 'Art.57 CT', rule.descuentaAnticipos)
  addAudit('evaluar_descuento_haberes', rule.descuentaHaberesPendientes ? 'APLICA' : 'NO_APLICA', 'Art.57 CT', rule.descuentaHaberesPendientes)

  // AFC solo para contratos indefinidos
  if (rule.descuentaAFC && context.contractType && context.contractType !== 'indefinido') {
    addAudit('evaluar_descuento_afc', 'NO_APLICA_CONTRATO', 'Ley 19.728', `Contrato ${context.contractType} no descuenta AFC trabajador`)
    warnings.push(`Contrato tipo "${context.contractType}": no se descuenta AFC del trabajador`)
  }

  // ==========================================
  // RESTRICCIONES Y ADVERTENCIAS
  // ==========================================

  for (const restriccion of rule.restricciones) {
    warnings.push(`RESTRICCION [${causeCode}]: ${restriccion}`)
  }

  for (const advertencia of rule.advertencias) {
    warnings.push(`ADVERTENCIA [${causeCode}]: ${advertencia}`)
  }

  if (rule.requiereAvisoPrevio && !context.noticeGiven) {
    addAudit('evaluar_aviso_previo', 'NO_DADO', 'Art.162 CT', 'Se requiere aviso previo de 30 dias')
    warnings.push(`Causal ${causeCode}: Se requiere aviso previo de ${rule.avisoPrevioDiasMinimos} dias. No se dio aviso previo, corresponde IAP`)
  }

  // ==========================================
  // CONSTRUIR RESULTADO DE CONCEPTOS
  // ==========================================

  const conceptos: SettlementConceptResult = {
    diasTrabajados: {
      aplica: rule.pagaDiasTrabajados,
      monto: 0,
      base: 'sueldo_diario',
      articulo: 'Art.44 CT'
    },
    saldoSueldo: {
      aplica: rule.pagaSaldoSueldo,
      monto: 0,
      base: 'sueldo_mensual',
      articulo: 'Art.44 CT'
    },
    gratificacionProporcional: {
      aplica: rule.pagaGratificacionProporcional,
      monto: 0,
      base: '25%_haberes_imponibles_o_tope_4.75_IMM_12',
      articulo: 'Art.47 CT'
    },
    bonosProporcionales: {
      aplica: rule.pagaBonosProporcionales,
      monto: 0,
      base: 'bono_mensual_proporcional',
      articulo: 'Art.44 CT'
    },
    movilizacion: {
      aplica: rule.pagaMovilizacion,
      monto: 0,
      base: 'movilizacion_diaria',
      articulo: 'Art.47 CT (no imponible)'
    },
    colacion: {
      aplica: rule.pagaColacion,
      monto: 0,
      base: 'colacion_diaria',
      articulo: 'Art.47 CT (no imponible)'
    },
    semanaCorrida: {
      aplica: rule.pagaSemanaCorrida && (context.hasVariableRemuneration ?? false),
      monto: 0,
      base: 'promedio_remuneracion_variable',
      articulo: 'Art.45 CT'
    },

    vacacionesPendientes: {
      aplica: rule.pagaVacacionesPendientes,
      dias: context.vacationDaysPending,
      monto: 0,
      base: 'sueldo_diario',
      articulo: 'Art.67 CT'
    },
    vacacionesProporcionales: {
      aplica: rule.pagaVacacionesProporcionales,
      dias: context.vacationDaysProportional,
      monto: 0,
      base: 'sueldo_diario',
      articulo: 'Art.68 CT'
    },
    feriadoProgresivo: {
      aplica: rule.pagaFeriadoProgresivo && (context.feriadoProgresivoDays ?? 0) > 0,
      dias: context.feriadoProgresivoDays ?? 0,
      monto: 0,
      base: 'sueldo_diario',
      articulo: 'Art.68 CT (feriado progresivo)'
    },

    ias: {
      aplica: iasAplica,
      monto: 0,
      anios: iasAnios,
      base: 'sueldo_mensual',
      articulo: 'Art.163 CT'
    },
    iap: {
      aplica: iapAplica,
      monto: 0,
      diasAviso: context.noticeGiven ? (context.noticeDays ?? 0) : 0,
      base: 'sueldo_mensual',
      articulo: 'Art.163 bis CT'
    },
    indemnizacionVoluntaria: {
      aplica: rule.permiteIndemnizacionVoluntaria && (context.voluntaryIndemnity ?? 0) > 0,
      monto: context.voluntaryIndemnity ?? 0,
      base: 'acuerdo_voluntario',
      articulo: 'Acuerdo de partes'
    },

    descuentoAFP: {
      aplica: rule.descuentaPrevision,
      monto: 0,
      base: 'haberes_imponibles',
      articulo: 'DL 3500/1980'
    },
    descuentoSalud: {
      aplica: rule.descuentaSalud,
      monto: 0,
      base: 'haberes_imponibles',
      articulo: 'Art.88 CT / DL 3500'
    },
    descuentoAFC: {
      aplica: rule.descuentaAFC && context.contractType === 'indefinido',
      monto: 0,
      base: 'haberes_imponibles',
      articulo: 'Ley 19.728'
    },
    descuentoImpuestoUnico: {
      aplica: rule.descuentaImpuestoUnico,
      monto: 0,
      base: 'renta_liquida_imponible',
      articulo: 'Art.84 Ley de Impuesto a la Renta'
    },
    descuentoPrestamos: {
      aplica: rule.descuentaPrestamos,
      monto: 0,
      base: 'saldo_pendiente',
      articulo: 'Art.57 CT'
    },
    descuentoAnticipos: {
      aplica: rule.descuentaAnticipos,
      monto: 0,
      base: 'saldo_pendiente',
      articulo: 'Art.57 CT'
    },
    descuentoHaberesPendientes: {
      aplica: rule.descuentaHaberesPendientes,
      monto: 0,
      base: 'haberes_pendientes',
      articulo: 'Art.57 CT'
    }
  }

  return {
    ruleConfig: rule,
    conceptos,
    auditLog,
    warnings,
    blocked,
    blockedReason
  }
}

export function generateSettlementClauses(
  causeCode: string,
  settlementData: {
    employeeName: string
    employeeRut: string
    position: string
    companyName: string
    companyRut: string
    contractStartDate: string
    terminationDate: string
    serviceYears: number
    serviceDays: number
    causeDescription: string
    noticeGiven: boolean
    voluntaryIndemnity?: number
  }
): string[] {
  const rule = getSettlementRule(causeCode)
  const clauses: string[] = []

  if (!rule) {
    clauses.push('ERROR: Causal no configurada en el motor de reglas')
    return clauses
  }

  clauses.push(
    `PRIMERO: Don(a) ${settlementData.employeeName}, rut ${settlementData.employeeRut}, ` +
    `desempeaba el cargo de ${settlementData.position} en ${settlementData.companyName}, ` +
    `rut ${settlementData.companyRut}, habiendo ingresado el ${settlementData.contractStartDate}, ` +
    `con una antiguedad de ${settlementData.serviceYears} anos y ${settlementData.serviceDays % 365} dias.`
  )

  clauses.push(
    `SEGUNDO: El presente finiquito se extingue por la causal "${rule.label}" ` +
    `(${rule.article} del Codigo del Trabajo). ${rule.clausulaBase}.`
  )

  if (rule.pagaVacacionesPendientes) {
    clauses.push(
      `TERCERO: Se pagan las vacaciones pendientes conforme al articulo 67 del Codigo del Trabajo.`
    )
  }

  if (rule.pagaVacacionesProporcionales) {
    clauses.push(
      `CUARTO: Se pagan las vacaciones proporcionales conforme al articulo 68 del Codigo del Trabajo.`
    )
  }

  if (rule.pagaIAS) {
    if (settlementData.serviceYears >= 1) {
      clauses.push(
        `QUINTO: Se paga indemnizacion por anos de servicio conforme al articulo 163 del Codigo del Trabajo, ` +
        `con tope de 11 anos.`
      )
    } else {
      clauses.push(
        `QUINTO: No corresponde indemnizacion por anos de servicio por tener menos de 1 ano de servicio (art.163 CT).`
      )
    }
  } else {
    clauses.push(
      `QUINTO: No corresponde indemnizacion por anos de servicio conforme a la causal invocada (${rule.article}).`
    )
  }

  if (rule.pagaIAP) {
    if (settlementData.noticeGiven) {
      clauses.push(
        `SEXTO: Se dio aviso previo de terminacion del contrato conforme al articulo 162 del Codigo del Trabajo.`
      )
    } else {
      clauses.push(
        `SEXTO: No se dio aviso previo, por lo que corresponde indemnizacion sustitutiva del aviso previo ` +
        `conforme al articulo 163 bis del Codigo del Trabajo.`
      )
    }
  } else {
    clauses.push(
      `SEXTO: No corresponde indemnizacion sustitutiva del aviso previo conforme a la causal invocada.`
    )
  }

  if (settlementData.voluntaryIndemnity && settlementData.voluntaryIndemnity > 0) {
    clauses.push(
      `SEPTIMO: Las partes acuerdan voluntariamente el pago de una indemnizacion adicional de ` +
      `$${settlementData.voluntaryIndemnity.toLocaleString('es-CL')} (ex gratia), ` +
      `sin que ello constituya reconocimiento de obligacion legal alguna.`
    )
  }

  clauses.push(
    `OCTAVO: El trabajador declara recibir conforme y a su entera satisfaccion los haberes, ` +
    `remuneraciones e indemnizaciones que se detallan en el presente finiquito, dandose por ` +
    `cancelado en forma total y definitiva.`
  )

  clauses.push(
    `NOVENO: El presente finiquito se rige por las disposiciones del Codigo del Trabajo y demas ` +
    `normas legales aplicables.`
  )

  for (const clausulaEspecial of rule.requiereClauEspecial) {
    switch (clausulaEspecial) {
      case 'mutuo_acuerdo':
        clauses.push(
          `DECIMO: Las partes declaran que el mutuo acuerdo es libre y voluntario, sin coaccion alguna, ` +
          `conforme al articulo 159 N°1 del Codigo del Trabajo.`
        )
        break
      case 'renuncia_voluntaria':
        clauses.push(
          `DECIMO: El trabajador declara que su renuncia es voluntaria, sin presion ni coaccion, ` +
          `conforme al articulo 159 N°2 del Codigo del Trabajo.`
        )
        break
      case 'requiere_investigacion':
        clauses.push(
          `DECIMO: El empleador declara haber llevado a cabo la investigacion correspondiente y haber ` +
          `otorgado al trabajador el derecho a descargos, conforme al principio de debido proceso.`
        )
        break
      case 'despido_disciplinario':
        clauses.push(
          `DECIMO: La comunicacion del despido se realizo conforme al articulo 162 del Codigo del Trabajo, ` +
          `indicandose los hechos constitutivos de la causal invocada.`
        )
        break
      case 'incumplimiento_grave':
        clauses.push(
          `DECIMO: El empleador comunica que el incumplimiento grave de las obligaciones contractuales ` +
          `se encuentra debidamente acreditado, habiendo dado el trabajador su derecho a descargos. ` +
          `La comunicacion del despido se realizo conforme al articulo 162 del Codigo del Trabajo.`
        )
        break
      case 'requiere_aviso_previo':
        if (settlementData.noticeGiven) {
          clauses.push(
            `DECIMO: Se dio aviso previo de terminacion del contrato con ${30} dias de anticipacion, ` +
            `conforme al articulo 162 del Codigo del Trabajo.`
          )
        } else {
          clauses.push(
            `DECIMO: No se dio aviso previo de terminacion del contrato, por lo que corresponde ` +
            `indemnizacion sustitutiva del aviso previo conforme al articulo 163 bis del Codigo del Trabajo.`
          )
        }
        break
    }
  }

  clauses.push(
    `ULTIMO: Las partes declaran que el presente finiquito se celebra en conformidad a las disposiciones ` +
    `legales vigentes, renunciando el trabajador a cualquier accion judicial derivada del contrato de trabajo ` +
    `materia de este finiquito, de acuerdo con el articulo 177 del Codigo del Trabajo.`
  )

  return clauses
}

export function getSettlementCausesForDatabase(): Array<{
  code: string
  label: string
  article: string
  has_ias: boolean
  has_iap: boolean
  description: string
}> {
  return Object.values(SETTLEMENT_RULES).map(rule => ({
    code: rule.code,
    label: rule.label,
    article: rule.article,
    has_ias: rule.pagaIAS,
    has_iap: rule.pagaIAP,
    description: rule.description
  }))
}

export { SETTLEMENT_RULES }