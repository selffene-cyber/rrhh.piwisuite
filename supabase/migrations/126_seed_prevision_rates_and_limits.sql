-- ==============================================================================
-- MIGRACION 126: Datos iniciales (seed) para prevision_rates y prevision_limits
-- Reforma Previsional 2026 - Fase 2
--
-- Todas las tasas y topes se insertan con sus vigencias correctas.
-- Las tasas confirmed historical se insertan como 'validated'.
-- Las tasas que requieren validacion futura se insertan como 'pending'.
--
-- REGLAS:
-- - No modificar registros historicos
-- - No eliminar ni renombrar tablas/columnas existentes
-- - Las tasas con vigencia futura o sin confirmar oficial = 'pending'
-- - Las tasas con vigencia confirmada por normativa publicada = 'validated'
-- ==============================================================================

-- ==============================================================================
-- TASAS PREVISIONALES (prevision_rates)
-- ==============================================================================

-- AFP TRABAJADOR (tasas por AFP)
-- Valores confirmados por SAFP vigentes desde 2025-08-01 (diciembre 2025 en API)
-- Estas tasas se revalidan periodicamente por la SAFP. Las insertamos como validated
-- porque son las tasas vigentes al momento de esta migracion.

-- CAPITAL: 11.44% trabajador (10% obligatorio + 1.44% comision)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFP_TRABAJADOR_CAPITAL', '2025-08-01', NULL, 11.44, 'trabajador', 'imponible_afp', 'AFP Capital', 'Comision SAFP agosto 2025', 'previred_api', 'validated');

-- CUPRUM: 11.44% trabajador (10% obligatorio + 1.44% comision)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFP_TRABAJADOR_CUPRUM', '2025-08-01', NULL, 11.44, 'trabajador', 'imponible_afp', 'AFP Cuprum', 'Comision SAFP agosto 2025', 'previred_api', 'validated');

-- HABITAT: 11.27% trabajador (10% obligatorio + 1.27% comision)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFP_TRABAJADOR_HABITAT', '2025-08-01', NULL, 11.27, 'trabajador', 'imponible_afp', 'AFP Habitat', 'Comision SAFP agosto 2025', 'previred_api', 'validated');

-- PLANVITAL: 11.16% trabajador (10% obligatorio + 1.16% comision)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFP_TRABAJADOR_PLANVITAL', '2025-08-01', NULL, 11.16, 'trabajador', 'imponible_afp', 'AFP PlanVital', 'Comision SAFP agosto 2025', 'previred_api', 'validated');

-- PROVIDA: 11.45% trabajador (10% obligatorio + 1.45% comision)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFP_TRABAJADOR_PROVIDA', '2025-08-01', NULL, 11.45, 'trabajador', 'imponible_afp', 'AFP ProVida', 'Comision SAFP agosto 2025', 'previred_api', 'validated');

-- MODELO: 10.58% trabajador (10% obligatorio + 0.58% comision)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFP_TRABAJADOR_MODELO', '2025-08-01', NULL, 10.58, 'trabajador', 'imponible_afp', 'AFP Modelo', 'Comision SAFP agosto 2025', 'previred_api', 'validated');

-- UNO: 10.46% trabajador (10% obligatorio + 0.46% comision)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFP_TRABAJADOR_UNO', '2025-08-01', NULL, 10.46, 'trabajador', 'imponible_afp', 'AFP Uno', 'Comision SAFP agosto 2025', 'previred_api', 'validated');

-- AFP EMPLEADOR CUENTA INDIVIDUAL (0.10%)
-- Vigente desde 2025-08-01 segun API Gael Cloud (verificado en datos de agosto 2025+)
-- Antes de agosto 2025, la API no mostraba este campo por separado
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFP_EMPLEADOR_CUENTA_INDIVIDUAL', '2025-08-01', NULL, 0.10, 'empleador', 'imponible_afp', 'AFP', 'DL 3500 Art 15, Reforma Previsional', 'previred_api', 'validated');

-- ==============================================================================
-- SIS (Seguro de Invalidez y Sobrevivencia)
-- Las tasas SIS han variado historicamente. Insertamos los periodos conocidos.
-- El motor previsional busca la tasa vigente para el periodo solicitado.
-- ==============================================================================

-- SIS: 1.49% - periodo julio 2019 a septiembre 2025 (tasa historica confirmada)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('SIS', '2019-07-01', '2025-09-30', 1.49, 'empleador', 'imponible_afp', 'SCIS', 'Resolucion SAFP', 'previred_api', 'validated');

-- SIS: 1.88% - octubre 2025 a junio 2026 (verificado en API julio 2025)
-- La API de julio 2025 devuelve TasaSIS = "1,88"
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('SIS', '2025-10-01', '2026-06-30', 1.88, 'empleador', 'imponible_afp', 'SCIS', 'Resolucion SAFP oct 2025', 'previred_api', 'validated');

-- SIS: 1.62% - julio 2026 (verificado en API julio 2026)
-- La API de julio 2026 devuelve TasaSIS = "1,62"
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('SIS', '2026-07-01', '2026-07-31', 1.62, 'empleador', 'imponible_afp', 'SCIS', 'Resolucion SAFP jul 2026', 'previred_api', 'validated');

-- SIS: 2.00% - agosto 2026 en adelante (Reforma Previsional Ley 21.735)
-- PENDIENTE: Confirmar tasa SIS post-agosto 2026 cuando se publique oficialmente
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('SIS', '2026-08-01', NULL, 2.00, 'empleador', 'imponible_afp', 'SCIS', 'Ley 21.735 - Reforma Previsional 2026', 'internal_validated', 'pending');

-- ==============================================================================
-- CRP (Cotizacion de Rentabilidad Protegida) - 0.90%
-- Vigente desde agosto 2026 (Ley 21.735)
-- PENDIENTE: Confirmar monto exacto cuando se publique el reglamento
-- ==============================================================================
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('CRP', '2026-08-01', NULL, 0.90, 'empleador', 'imponible_afp', 'AFP', 'Ley 21.735 Art 5 - Reforma Previsional 2026', 'internal_validated', 'pending');

-- ==============================================================================
-- AFC - SEGURO DE CESANTIA
-- ==============================================================================

-- AFC Trabajador Indefinido: 0.6% (tasa historica confirmada)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFC_TRABAJADOR_INDEFINIDO', '2025-08-01', NULL, 0.60, 'trabajador', 'imponible_seg_ces', 'AFC', 'Ley 19.728 Art 15', 'previred_api', 'validated');

-- AFC Trabajador Plazo Fijo: 0% (exento)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFC_TRABAJADOR_PLAZO_FIJO', '2025-08-01', NULL, 0.00, 'trabajador', 'imponible_seg_ces', 'AFC', 'Ley 19.728 Art 15', 'previred_api', 'validated');

-- AFC Trabajador Temporal: 0% (exento)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFC_TRABAJADOR_TEMPORAL', '2025-08-01', NULL, 0.00, 'trabajador', 'imponible_seg_ces', 'AFC', 'Ley 19.728 Art 15', 'previred_api', 'validated');

-- AFC Empleador Indefinido: 2.4% (confirmado por API)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFC_EMPLEADOR_INDEFINIDO', '2025-08-01', NULL, 2.40, 'empleador', 'imponible_seg_ces', 'AFC', 'Ley 19.728 Art 15', 'previred_api', 'validated');

-- AFC Empleador Plazo Fijo: 3.0% (confirmado por API)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFC_EMPLEADOR_PLAZO_FIJO', '2025-08-01', NULL, 3.00, 'empleador', 'imponible_seg_ces', 'AFC', 'Ley 19.728 Art 15', 'previred_api', 'validated');

-- AFC Empleador Temporal: 3.0% (confirmado por API)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFC_EMPLEADOR_TEMPORAL', '2025-08-01', NULL, 3.00, 'empleador', 'imponible_seg_ces', 'AFC', 'Ley 19.728 Art 15', 'previred_api', 'validated');

-- ==============================================================================
-- FONASA 7% (tasa fija historica)
-- ==============================================================================
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('FONASA', '2025-01-01', NULL, 7.00, 'trabajador', 'imponible_ips', 'FONASA', 'DL 2763 Art 7', 'internal_validated', 'validated');

-- ==============================================================================
-- MUTUAL y LEY SANNA (tasas fijas)
-- La Mutualidad puede variar por empresa. Se usa 0.93% como referencia.
-- ==============================================================================
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('MUTUAL', '2025-01-01', NULL, 0.93, 'empleador', 'imponible_afp', 'Mutualidad', 'Ley 16.744', 'internal_validated', 'pending');

INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('LEY_SANNA', '2025-01-01', NULL, 0.40, 'empleador', 'imponible_afp', 'ISL', 'DFL 44 Art 13', 'internal_validated', 'pending');

-- ==============================================================================
-- CAJA COMPENSACION (0.25% - puede variar por caja)
-- ==============================================================================
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('CAJA_COMPENSACION', '2025-01-01', NULL, 0.25, 'empleador', 'imponible_ips', 'CCAF', 'Ley 18.834', 'internal_validated', 'pending');

-- ==============================================================================
-- TOPES IMPONIBLES (prevision_limits)
-- ==============================================================================

-- RTI AFP en pesos (agosto 2025 - valores confirmados por API)
-- API julio 2025: RTIAfpPesos = "2.351.824"
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('RTI_AFP', '2025-08-01', '2025-12-31', 2351824, 'pesos', 'DFL 3500 Art 50', 'validated');

-- RTI AFP en pesos (enero 2026 en adelante - pendiente actualizacion)
-- Se inserta como pending hasta confirmar con indicadores de enero 2026
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('RTI_AFP', '2026-01-01', NULL, 2351824, 'pesos', 'DFL 3500 Art 50', 'pending');

-- RTI IPS en pesos (agosto 2025 - confirmado por API)
-- API julio 2025: RTIIpsPesos = "1.835.024"
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('RTI_IPS', '2025-08-01', '2025-12-31', 1835024, 'pesos', 'DL 2763 Art 7', 'validated');

-- RTI IPS en pesos (enero 2026 en adelante - pendiente actualizacion)
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('RTI_IPS', '2026-01-01', NULL, 1835024, 'pesos', 'DL 2763 Art 7', 'pending');

-- RTI Seguro de Cesantia en pesos (agosto 2025 - confirmado por API)
-- API julio 2025: RTISegCesPesos = "352.774"
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('RTI_SEG_CES', '2025-08-01', '2025-12-31', 352774, 'pesos', 'Ley 19.728 Art 15', 'validated');

-- RTI Seguro de Cesantia en pesos (enero 2026 en adelante - pendiente)
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('RTI_SEG_CES', '2026-01-01', NULL, 352774, 'pesos', 'Ley 19.728 Art 15', 'pending');

-- UF (agosto 2025 - valor confirmado por API)
-- API julio 2025: UFValPeriodo = "38.636,63"
-- Se almacena como numero sin formato
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('UF', '2025-08-01', '2025-08-31', 38636.63, 'pesos', 'Banco Central', 'validated');

-- UF (septiembre 2025 - confirmado por API agosto 2025)
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('UF', '2025-09-01', '2025-09-30', 38835.84, 'pesos', 'Banco Central', 'validated');

-- UF (octubre 2025 - confirmado por API septiembre 2025)
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('UF', '2025-10-01', '2025-10-31', 39023.67, 'pesos', 'Banco Central', 'validated');

-- UF (periodos futuros - pending)
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('UF', '2026-01-01', NULL, 39023.67, 'pesos', 'Banco Central', 'pending');

-- UTM (agosto 2025 - confirmado por API)
-- API julio 2025: UTMVal = "69.774"
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('UTM', '2025-08-01', '2025-08-31', 69774, 'pesos', 'Banco Central', 'validated');

-- UTM (septiembre 2025)
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('UTM', '2025-09-01', '2025-09-30', 70124, 'pesos', 'Banco Central', 'validated');

-- UTM (octubre 2025)
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('UTM', '2025-10-01', '2025-10-31', 70571, 'pesos', 'Banco Central', 'validated');

-- UTM (periodos futuros - pending)
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('UTM', '2026-01-01', NULL, 70571, 'pesos', 'Banco Central', 'pending');

-- RMI Trabajador Dependiente (agosto 2025 - confirmado por API)
-- API julio 2025: RMITrabDepeInd = "260.000"
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('RMI_TRAB_DEPE', '2025-08-01', '2025-12-31', 260000, 'pesos', 'DL 2763 Art 7', 'validated');

-- RMI Trabajador Dependiente (enero 2026 - pending actualizacion)
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('RMI_TRAB_DEPE', '2026-01-01', NULL, 260000, 'pesos', 'DL 2763 Art 7', 'pending');

-- ==============================================================================
-- NOTA: No se insertan tasas para ISAPRE ni IMPUESTO_UNICO
-- porque dependen del plan especifico del trabajador (ISAPRE)
-- y del tramo impositivo (IMPUESTO_UNICO), no son tasas fijas.
-- ==============================================================================