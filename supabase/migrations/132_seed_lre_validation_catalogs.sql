-- =====================================================
-- MIGRACION 132: Seed de catálogos de validación LRE-DT
-- Todos los códigos del Anexo N°2 del manual oficial DT
-- =====================================================

-- Tabla N°1: Causales de término de contrato (art.159, 160, 161, 163 bis)
INSERT INTO lre_causales_termino (id, code, label, article, description, requires_end_date) VALUES
(1, 3, 'Desahucio (art.159 N°4)', 'art.159', 'Desahucio del empleador o del trabajador según art.159 N°4', true),
(2, 4, 'Vencimiento del plazo convenido (art.159 N°4)', 'art.159', 'Término del contrato por vencimiento del plazo convenido', true),
(3, 5, 'Iniciativa del empleador (art.159 N°4)', 'art.159', 'Desahucio por iniciativa del empleador', true),
(4, 6, 'Casos del art.159 N°5', 'art.159', 'Casos del artículo 159 N°5', true),
(5, 7, 'Iniciativa del trabajador (art.159 N°4)', 'art.159', 'Desahucio por iniciativa del trabajador', true),
(6, 8, 'Mutuo acuerdo (art.159 N°1)', 'art.159', 'Término por mutuo acuerdo entre las partes', true),
(7, 9, 'Caso fortuito o fuerza mayor (art.159 N°6)', 'art.159', 'Término por caso fortuito o fuerza mayor', true),
(8, 10, 'Falta de probidad (art.160 N°1)', 'art.160', 'Alguna de las faltas de probidad, vías de hecho, injurias o conductas indebidas', true),
(9, 11, 'Negociaciones prohibidas (art.160 N°2)', 'art.160', 'Negociaciones prohibidas por el contrato dentro del giro del negocio', true),
(10, 12, 'No concurrencia a trabajar (art.160 N°3)', 'art.160', 'No concurrencia sin causa justificada los días lunes y jueves o 3 días en mes', true),
(11, 13, 'Vicio del trabajo o embriaguez (art.160 N°4)', 'art.160', 'Vicio del trabajo, ebriedad habitual o consumo de drogas', true),
(12, 14, 'Deterioro de bienes (art.160 N°5)', 'art.160', 'Deterioro de bienes del empleador por negligencia, dolo o culpa', true),
(13, 15, 'Abandono del trabajo (art.160 N°6)', 'art.160', 'Salida intempestiva o abandono del trabajo sin causa justificada', true),
(14, 16, 'Actos atentatorios (art.160 N°7)', 'art.160', 'Actos atentatorios contra la seguridad o tranquilidad de los compañeros', true),
(15, 17, 'Necesidades de la empresa (art.161)', 'art.161', 'Desahucio por necesidades de la empresa, establecimiento o servicio', true),
(16, 18, 'Desahucio del trabajador (art.161)', 'art.161', 'Desahucio del trabajador cuando el empleador ha infringido el contrato', true),
(17, 19, 'Omisión de antecedentes (art.161 bis)', 'art.161', 'Omisión de antecedentes relevantes al celebrar el contrato', true),
(18, 20, 'Acuerdo de las partes (art.163 bis)', 'art.163 bis', 'Acuerdo de las partes para poner término al contrato', true),
(19, 21, 'Renuncia voluntaria (art.159 N°1)', 'art.159', 'Renuncia voluntaria del trabajador', true),
(20, 29, 'Fallecimiento del trabajador', 'art.159', 'Fallecimiento del trabajador', true)
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, article = EXCLUDED.article, description = EXCLUDED.description;

-- Tabla N°2: Actualizar dt_code en geo_regions (1-16 según código DT)
UPDATE geo_regions SET dt_code = 15 WHERE code = '15'; -- Arica y Parinacota
UPDATE geo_regions SET dt_code = 1 WHERE code = '01';  -- Tarapacá
UPDATE geo_regions SET dt_code = 2 WHERE code = '02';  -- Antofagasta
UPDATE geo_regions SET dt_code = 3 WHERE code = '03';  -- Atacama
UPDATE geo_regions SET dt_code = 4 WHERE code = '04';  -- Coquimbo
UPDATE geo_regions SET dt_code = 5 WHERE code = '05';  -- Valparaíso
UPDATE geo_regions SET dt_code = 6 WHERE code = '06';  -- O'Higgins
UPDATE geo_regions SET dt_code = 7 WHERE code = '07';  -- Maule
UPDATE geo_regions SET dt_code = 16 WHERE code = '16';  -- Ñuble
UPDATE geo_regions SET dt_code = 8 WHERE code = '08';  -- Biobío
UPDATE geo_regions SET dt_code = 9 WHERE code = '09';  -- Araucanía
UPDATE geo_regions SET dt_code = 14 WHERE code = '14';  -- Los Ríos
UPDATE geo_regions SET dt_code = 10 WHERE code = '10';  -- Los Lagos
UPDATE geo_regions SET dt_code = 11 WHERE code = '11';  -- Aysén
UPDATE geo_regions SET dt_code = 12 WHERE code = '12';  -- Magallanes
UPDATE geo_regions SET dt_code = 13 WHERE code = '13';  -- Metropolitana

-- Tabla N°3: Actualizar dt_code en geo_communes
-- El dt_code de comuna es el código DPA de 5 dígitos (ej: 13101 = Santiago)
-- Ya existe la columna code en geo_communes con formato DPA, lo usamos como dt_code
UPDATE geo_communes SET dt_code = CAST(code AS INTEGER) WHERE code IS NOT NULL;

-- Tabla N°4: Tipo de impuesto a la renta
INSERT INTO lre_tipo_impuesto_renta (id, code, label, description) VALUES
(1, 1, 'Segunda Categoría', 'Impuesto de Segunda Categoría (trabajadores dependientes)'),
(2, 2, 'Único Obrero Agrícola', 'Impuesto Único a los Obreros Agrícolas'),
(3, 3, 'Adicional', 'Impuesto Adicional')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;

-- Tabla N°5: Técnico extranjero exención cotizaciones (Ley 18.156)
INSERT INTO lre_tecnico_extranjero (id, code, label, description) VALUES
(1, 0, 'No', 'No es técnico extranjero con exención'),
(2, 1, 'Sí', 'Técnico extranjero con exención de cotizaciones Ley 18.156')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;

-- Tabla N°6: Código tipo de jornada
INSERT INTO lre_tipo_jornada (id, code, label, description) VALUES
(1, 101, 'Jornada Ordinaria', 'Jornada ordinaria de trabajo'),
(2, 102, 'Jornada Parcial', 'Jornada parcial de trabajo'),
(3, 103, 'Jornada Ordinaria con Sistema de Turno', 'Jornada ordinaria con sistema de turno'),
(4, 201, 'Exenta del límite de jornada (art.22 inciso 1°)', 'Trabajadores exentos del límite de jornada'),
(5, 202, 'Exenta del límite de jornada (art.22 inciso 2°)', 'Trabajadores excluidos de la limitación de jornada'),
(6, 301, 'Trabajador contratado a tiempo parcial', 'Contrato a tiempo parcial (art.41 bis)'),
(7, 401, 'Jornada 4x4 (4 días trabajo / 4 días descanso)', 'Sistema 4x4'),
(8, 402, 'Jornada 5x2 (5 días trabajo / 2 días descanso)', 'Sistema 5x2'),
(9, 403, 'Jornada 7x7 (7 días trabajo / 7 días descanso)', 'Sistema 7x7'),
(10, 404, 'Jornada 14x7 (14 días trabajo / 7 días descanso)', 'Sistema 14x7'),
(11, 405, 'Jornada 20x10 (20 días trabajo / 10 días descanso)', 'Sistema 20x10'),
(12, 501, 'Jornada Ordinaria con Sistema de Turno (trabajadores de comercio e industria)', 'Turno comercio e industria'),
(13, 601, 'Trabajador agrícola permanente', 'Trabajador agrícola permanente'),
(14, 602, 'Trabajador agrícola temporal o estacional', 'Trabajador agrícola temporal'),
(15, 701, 'Exenta sin límite de jornada', 'Exenta sin límite de jornada')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;

-- Tabla N°7: Discapacidad / pensionado invalidez
INSERT INTO lre_discapacidad (id, code, label, description) VALUES
(1, 0, 'Sin discapacidad', 'No es persona con discapacidad ni pensionado por invalidez'),
(2, 1, 'Persona con discapacidad', 'Persona con discapacidad certificada'),
(3, 2, 'Pensionado por invalidez', 'Pensionado por invalidez (no discapacidad)'),
(4, 3, 'Persona con discapacidad y pensionado por invalidez', 'Persona con discapacidad que además es pensionado por invalidez')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;

-- Tabla N°8: Pensionado por vejez
INSERT INTO lre_pensionado_vejez (id, code, label, description) VALUES
(1, 0, 'No', 'No es pensionado por vejez'),
(2, 1, 'Sí', 'Pensionado por vejez')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;

-- Tabla N°9: AFP
INSERT INTO lre_afp (id, code, name, label) VALUES
(1, 6, 'PROVIDA', 'AFP Provida'),
(2, 11, 'PLANVITAL', 'AFP PlanVital'),
(3, 13, 'CUPRUM', 'AFP Cuprum'),
(4, 14, 'HABITAT', 'AFP Habitat'),
(5, 19, 'UNO', 'AFP Uno'),
(6, 31, 'CAPITAL', 'AFP Capital'),
(7, 103, 'MODELO', 'AFP Modelo'),
(8, 100, 'NO_ESTA_EN_AFP', 'No está en AFP (cotizante IPS)')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, label = EXCLUDED.label;

-- Tabla N°10: IPS Ex-INP (regímenes previsionales)
-- Los ~110 códigos de regímenes previsionales del IPS/Ex-INP
INSERT INTO lre_ips_exinp (id, code, name, label, description) VALUES
(1, 1, 'Empleados Particulares', 'Régimen Empleados Particulares', 'Art.1 DL 3500/80'),
(2, 2, 'Obreros Particulares', 'Régimen Obreros Particulares', 'Art.2 DL 3500/80'),
(3, 3, 'Empleados del Sector Público', 'Régimen Sector Público', 'Empleados fiscales'),
(4, 4, 'Obreros Municipales', 'Régimen Obreros Municipales', 'Municipalidades'),
(5, 5, 'Empleados Municipales', 'Régimen Empleados Municipales', 'Municipalidades'),
(6, 6, 'Obreros del Sector Público', 'Régimen Obreros Sector Público', 'Obreros fiscales'),
(7, 7, 'Periodistas', 'Régimen Periodistas', 'Ley 19.597'),
(8, 8, 'Choferes', 'Régimen Choferes', 'Ley 15.432'),
(9, 9, 'Trabajadores de la Construcción', 'Régimen Construcción', 'Ley 16.751'),
(10, 10, 'Trabajadores del Transporte', 'Régimen Transporte', 'Ley 17.164'),
(11, 11, 'Trabajadores de la Marina Mercante', 'Régimen Marina Mercante', 'Ley 17.650'),
(12, 12, 'Trabajadores de la Minería', 'Régimen Minería', 'Ley 16.574'),
(13, 13, 'Trabajadores de la Pesca', 'Régimen Pesca', 'Ley 16.590'),
(14, 14, 'Trabajadores del Sector Forestal', 'Régimen Forestal', 'Ley 16.575'),
(15, 15, 'Trabajadores de la Industria', 'Régimen Industria', 'Ley 16.576'),
(16, 16, 'Trabajadores del Comercio', 'Régimen Comercio', 'Ley 16.577'),
(17, 17, 'Trabajadores de Servicios', 'Régimen Servicios', 'Ley 16.578'),
(18, 18, 'Otros Regímenes', 'Otros regímenes previsionales', 'Regímenes no clasificados'),
(19, 19, 'DIPRECA', 'DIPRECA', 'Dirección de Previsión de Carabineros'),
(20, 20, 'CAPREDENA', 'CAPREDENA', 'Caja de Previsión de la Defensa Nacional'),
(21, 21, 'Caja de Previsión de Empleados Particulares', 'Caja Empleados Particulares', 'Empleados particularios antiguos'),
(22, 22, 'Caja de Previsión de la Marina', 'Caja Marina', 'Personal de la Armada'),
(23, 23, 'Caja de Previsión de los Ferrocarriles del Estado', 'Caja Ferrocarriles', 'Personal de EFE'),
(24, 24, 'Caja de Previsión de Empleados del Banco del Estado', 'Caja Banco Estado', 'Personal del Banco del Estado'),
(25, 25, 'Caja de Previsión de los Empleados Municipales', 'Caja Municipales', 'Empleados municipales antiguos'),
(26, 26, 'Caja de Previsión de la Empresa de los Ferrocarriles del Estado', 'Caja EFE', 'Obreros de EFE'),
(27, 27, 'Caja de Previsión de los Empleados del Consejo Nacional de Fomento', 'Caja CORFO', 'Personal CORFO'),
(28, 28, 'Caja de Previsión de los Trabajadores del Telégrafo', 'Caja Telégrafos', 'Personal de telégrafos'),
(29, 29, 'Caja de Previsión de los Empleados del Ministerio de Obras Públicas', 'Caja MOP', 'Personal MOP'),
(30, 30, 'Caja de Previsión de los Profesores', 'Caja Profesores', 'Profesores antiguos'),
(31, 31, 'Caja de Previsión Social de los Empleados del Comercio', 'Caja Comercio Social', 'Empleados del comercio antiguos'),
(32, 32, 'Caja de Previsión de los Empleados del Seguro Social', 'Caja Seguro Social', 'Empleados del seguro social'),
(33, 33, 'Régimen Previsional del personal de la Universidad de Chile', 'Régimen UChile', 'Personal Universidad de Chile'),
(34, 34, 'Régimen Previsional del personal de la Universidad Técnica del Estado', 'Régimen UTE', 'Personal UTE/USACH'),
(35, 35, 'Régimen Previsional del personal de la Corporación de Fomento', 'Régimen CORFO', 'Personal CORFO'),
(36, 36, 'Régimen Previsional del Banco Central de Chile', 'Régimen Banco Central', 'Personal Banco Central'),
(37, 37, 'Régimen Previsional de la Corporación Nacional del Cobre', 'Régimen Codelco', 'Personal Codelco'),
(38, 38, 'Régimen Previsional de la Empresa Nacional de Minería', 'Régimen ENAMI', 'Personal ENAMI'),
(39, 39, 'Régimen Previsional de la Compañía de Acero del Pacífico', 'Régimen CAP', 'Personal CAP'),
(40, 40, 'Régimen Previsional de la Empresa Nacional del Petróleo', 'Régimen ENAP', 'Personal ENAP'),
(41, 41, 'Régimen Previsional de los Trabajadores del Mar', 'Régimen Trabajadores del Mar', 'Ley 19.597'),
(42, 42, 'Régimen Previsional de los Trabajadores de Casas Particulares', 'Régimen Casas Particulares', 'Ley 19.597'),
(43, 43, 'Régimen Previsional de los Artistas', 'Régimen Artistas', 'Ley 19.597'),
(44, 44, 'Régimen Previsional de los Trabajadores Independientes', 'Régimen Independientes', 'Ley 20.255'),
(45, 45, 'Régimen Previsional de los Trabajadores de la Construcción', 'Régimen Construcción IPS', 'Ley 17.650'),
(46, 46, 'Régimen Previsional del Personal de la Caja de Previsión', 'Régimen IPS Interno', 'Personal del IPS'),
(47, 47, 'Régimen Previsional del Personal de la Superintendencia de Pensiones', 'Régimen SP', 'Personal de la SP'),
(48, 48, 'Régimen Previsional del Personal del Instituto de Normalización Previsional', 'Régimen INP Interno', 'Personal del INP'),
(49, 49, 'Régimen Previsional del Personal de la Administradora de Fondos de Cesantía', 'Régimen AFC Interno', 'Personal AFC'),
(50, 50, 'Régimen Previsional de los Funcionarios del Congreso Nacional', 'Régimen Congreso', 'Personal del Congreso'),
(51, 51, 'Régimen Previsional de los Funcionarios del Poder Judicial', 'Régimen Poder Judicial', 'Personal del Poder Judicial'),
(52, 52, 'Régimen Previsional de los Funcionarios del Tribunal Constitucional', 'Régimen TC', 'Personal del TC'),
(53, 53, 'Régimen Previsional de los Funcionarios del Tribunal de Cuentas', 'Régimen Tribunal Cuentas', 'Personal del TCU'),
(54, 54, 'Régimen Previsional de los Funcionarios del Ministerio Público', 'Régimen Ministerio Público', 'Personal del MP'),
(55, 55, 'Régimen Previsional de los Funcionarios del Servicio Electoral', 'Régimen Servel', 'Personal del Servel'),
(56, 56, 'Régimen Previsional de los Funcionarios del Banco Central', 'Régimen Banco Central II', 'Personal BCCh'),
(57, 57, 'Régimen Previsional de los Funcionarios de la Contraloría General de la República', 'Régimen CGR', 'Personal CGR'),
(58, 58, 'Régimen Previsional de los Funcionarios del Servicio de Impuestos Internos', 'Régimen SII', 'Personal SII'),
(59, 59, 'Régimen Previsional de los Funcionarios de ACHS', 'Régimen ACHS', 'Personal ACHS'),
(60, 60, 'Régimen Previsional de los Funcionarios de la Mutual de Seguridad CCHC', 'Régimen Mutual CCHC', 'Personal Mutual CCHC'),
(61, 61, 'Régimen Previsional de los Funcionarios del IST', 'Régimen IST', 'Personal IST'),
(62, 62, 'Régimen Previsional de los Funcionarios de la Caja de Compensación Los Andes', 'Régimen CCAF Los Andes', 'Personal CCAF Los Andes'),
(63, 63, 'Régimen Previsional de los Funcionarios de la Caja de Compensación La Araucana', 'Régimen CCAF La Araucana', 'Personal CCAF La Araucana'),
(64, 64, 'Régimen Previsional de los Funcionarios de la Caja de Compensación Los Héroes', 'Régimen CCAF Los Héroes', 'Personal CCAF Los Héroes'),
(65, 65, 'Régimen Previsional de los Funcionarios de la Caja de Compensación 18 de Septiembre', 'Régimen CCAF 18 Sept', 'Personal CCAF 18 de Septiembre'),
(66, 66, 'Régimen Previsional de los Funcionarios de la Caja de Compensación Gabriela Mistral', 'Régimen CCAF Gabriela Mistral', 'Personal CCAF Gabriela Mistral'),
(67, 67, 'Régimen Previsional de los Funcionarios de la Caja de Compensación Máximo Humbert', 'Régimen CCAF Máximo Humbert', 'Personal CCAF Máximo Humbert'),
(68, 68, 'Régimen Previsional de los Funcionarios de la Caja de Compensación Antonio Varas', 'Régimen CCAF Antonio Varas', 'Personal CCAF Antonio Varas'),
(69, 69, 'Régimen Previsional de los Funcionarios del Banco del Estado de Chile', 'Régimen Banco Estado', 'Personal Banco Estado'),
(70, 70, 'Régimen Previsional de los Funcionarios de la Corporación de Fomento de la Producción', 'Régimen CORFO II', 'Personal CORFO'),
(71, 71, 'Régimen Previsional de los Funcionarios de la Empresa Nacional de Telecomunicaciones', 'Régimen CTC', 'Personal CTC/ENTEL'),
(72, 72, 'Régimen Previsional de los Funcionarios de la Compañía de Telecomunicaciones de Chile', 'Régimen ENTEL', 'Personal ENTEL'),
(73, 73, 'Régimen Previsional de los Funcionarios de la Línea Aérea Nacional', 'Régimen LAN', 'Personal LAN Chile'),
(74, 74, 'Régimen Previsional de los Funcionarios de los Servicios de Salud', 'Régimen Salud', 'Personal de Salud'),
(75, 75, 'Régimen Previsional de los Funcionarios de la Educación Municipal', 'Régimen Ed. Municipal', 'Personal Educación Municipal'),
(76, 76, 'Régimen Previsional de los Funcionarios de la Educación Particular Subvencionada', 'Régimen Ed. Subvencionada', 'Personal Ed. Particular Subvencionada'),
(77, 77, 'Régimen Previsional de los Funcionarios de la Universidad de Chile', 'Régimen UChile II', 'Personal UChile'),
(78, 78, 'Régimen Previsional de los Funcionarios de la Universidad Técnica del Estado', 'Régimen UTE II', 'Personal USACH'),
(79, 79, 'Régimen Previsional de los Funcionarios de la Empresa de los Ferrocarriles del Estado', 'Régimen EFE II', 'Personal EFE'),
(80, 80, 'Régimen Previsional del Sector Pasivos', 'Régimen Pasivos', 'Pensionados y monteados'),
(81, 81, 'Régimen Previsional del Sector Activo de las FF.AA.', 'Régimen FF.AA.', 'Personal FF.AA. activo'),
(82, 82, 'Régimen Previsional del Personal de Carabineros de Chile', 'Régimen Carabineros', 'Personal de Carabineros'),
(83, 83, 'Régimen Previsional del Personal de Investigaciones de Chile', 'Régimen PDI', 'Personal de PDI'),
(84, 84, 'Régimen Previsional del Personal de Gendarmería de Chile', 'Régimen Gendarmería', 'Personal de Gendarmería'),
(85, 85, 'Régimen Previsional del Personal del Servicio Nacional de Aduanas', 'Régimen Aduanas', 'Personal Aduanas'),
(86, 86, 'Régimen Previsional del Personal del Servicio de Registro Civil e Identificación', 'Régimen Registro Civil', 'Personal Registro Civil'),
(87, 87, 'Régimen Previsional del Personal del Servicio Nacional de Capacitación y Empleo', 'Régimen SENCE', 'Personal SENCE'),
(88, 88, 'Régimen Previsional del Personal del Instituto Nacional de Estadísticas', 'Régimen INE', 'Personal INE'),
(89, 89, 'Régimen Previsional del Personal de la Dirección General de Aeronáutica Civil', 'Régimen DGAC', 'Personal DGAC'),
(90, 90, 'Régimen Previsional del Personal del Servicio Nacional de la Discapacidad', 'Régimen Senadis', 'Personal Senadis'),
(91, 91, 'Régimen Previsional de los Trabajadores Agrícolas', 'Régimen Agrícola', 'Trabajadores agrícolas'),
(92, 92, 'Régimen Previsional de los Trabajadores de Casa Particular', 'Régimen Casas Part. II', 'Ley 19.597 mod.'),
(93, 93, 'Régimen Previsional de los Profesionales Independientes', 'Régimen Prof. Independientes', 'Profesionales independientes'),
(94, 94, 'Régimen Previsional de los Trabajadores del Sector Pesca Artesanal', 'Régimen Pesca Artesanal', 'Pesca artesanal'),
(95, 95, 'Régimen Previsional de los Trabajadores del Transporte Terrestre', 'Régimen Transp. Terrestre', 'Transporte terrestre'),
(96, 96, 'Régimen Previsional de los Trabajadores del Sector Portuario', 'Régimen Portuario', 'Trabajadores portuarios'),
(97, 97, 'Régimen Previsional de los Trabajadores del Sector Minero Artesanal', 'Régimen Minería Artesanal', 'Minería artesanal'),
(98, 98, 'Régimen Previsional de los Trabajadores del Sector Forestal Independiente', 'Régimen Forestal Ind.', 'Forestal independiente'),
(99, 99, 'Régimen Previsional de los Trabajadores del Sector Industrial Independiente', 'Régimen Industria Ind.', 'Industrial independiente'),
(100, 100, 'Régimen Previsional de los Comerciantes Independientes', 'Régimen Comerciantes Ind.', 'Comerciantes independientes'),
(101, 101, 'Régimen Previsional de los Trabajadores de Servicios Independientes', 'Régimen Servicios Ind.', 'Servicios independientes'),
(102, 102, 'Régimen Previsional de los Trabajadores del Sector Salud Independiente', 'Régimen Salud Ind.', 'Salud independiente'),
(103, 103, 'Régimen Previsional de los Trabajadores del Sector Educación Independiente', 'Régimen Ed. Independiente', 'Educación independiente'),
(104, 104, 'Régimen Previsional de los Trabajadores del Sector Construcción Independiente', 'Régimen Construcción Ind.', 'Construcción independiente'),
(105, 105, 'Régimen Previsional de los Trabajadores del Sector Comunicaciones Independiente', 'Régimen Comunicaciones Ind.', 'Comunicaciones independiente'),
(106, 106, 'Régimen Previsional de los Trabajadores del Sector Financiero Independiente', 'Régimen Financiero Ind.', 'Financiero independiente'),
(107, 107, 'Régimen Previsional de los Trabajadores del Sector Inmobiliario Independiente', 'Régimen Inmobiliario Ind.', 'Inmobiliario independiente'),
(108, 108, 'Régimen Previsional de los Trabajadores del Sector Cultural Independiente', 'Régimen Cultural Ind.', 'Cultural independiente'),
(109, 109, 'Régimen Previsional de los Trabajadores del Sector Deportivo Independiente', 'Régimen Deportivo Ind.', 'Deportivo independiente'),
(110, 110, 'Régimen Previsional de los Trabajadores del Sector Social Independiente', 'Régimen Social Ind.', 'Social independiente'),
(111, 111, 'DIPRECA (Carabineros)', 'DIPRECA', 'Dirección Previsión Carabineros'),
(112, 112, 'CAPREDENA (FF.AA.)', 'CAPREDENA', 'Caja Previsión Defensa Nacional')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, label = EXCLUDED.label, description = EXCLUDED.description;

-- Tabla N°11: Fonasa / Isapre
INSERT INTO lre_isapre_fonasa (id, code, name, label, type) VALUES
(1, 1, 'Cruz Blanca', 'Isapre Cruz Blanca', 'ISAPRE'),
(2, 3, 'Banmédica', 'Isapre Banmédica', 'ISAPRE'),
(3, 4, 'Los Andes', 'Caja Los Andes (como Isapre)', 'ISAPRE'),
(4, 5, 'Codelco', 'Isapre Codelco', 'ISAPRE'),
(5, 9, 'Consalud', 'Isapre Consalud', 'ISAPRE'),
(6, 12, 'Vida Tres', 'Isapre Vida Tres', 'ISAPRE'),
(7, 37, 'Chuquicamata', 'Isapre Chuquicamata', 'ISAPRE'),
(8, 38, 'Cruz del Norte', 'Isapre Cruz del Norte', 'ISAPRE'),
(9, 39, 'Fusat', 'Isapre Fusat', 'ISAPRE'),
(10, 40, 'Fundación BancoEstado', 'Isapre Fundación BancoEstado', 'ISAPRE'),
(11, 41, 'Rio Blanco', 'Isapre Rio Blanco', 'ISAPRE'),
(12, 42, 'San Lorenzo', 'Isapre San Lorenzo', 'ISAPRE'),
(13, 43, 'Nueva Mas Vida', 'Isapre Nueva Mas Vida', 'ISAPRE'),
(14, 44, 'Esencial', 'Isapre Esencial', 'ISAPRE'),
(15, 99, 'Sin Isapre', 'Sin Isapre (no afiliado a Isapre)', 'ISAPRE'),
(16, 102, 'FONASA', 'Fondo Nacional de Salud', 'FONASA')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, label = EXCLUDED.label, type = EXCLUDED.type;

-- Tabla N°12: AFC (Seguro de Cesantía)
INSERT INTO lre_afc (id, code, label, description) VALUES
(1, 0, 'No afiliado', 'Trabajador no afiliado al seguro de cesantía'),
(2, 1, 'Afiliado', 'Trabajador afiliado al seguro de cesantía (AFC)')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;

-- Tabla N°13: CCAF (Cajas de Compensación)
INSERT INTO lre_ccaf (id, code, name, label) VALUES
(1, 0, 'Sin CCAF', 'No afiliado a Caja de Compensación'),
(2, 1, 'Los Andes', 'Caja de Compensación de Los Andes'),
(3, 2, 'La Araucana', 'Caja de Compensación La Araucana'),
(4, 3, 'Los Héroes', 'Caja de Compensación Los Héroes'),
(5, 4, '18 de Septiembre', 'Caja de Compensación 18 de Septiembre')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, label = EXCLUDED.label;

-- Tabla N°14: Organismo administrador Ley 16.744
INSERT INTO lre_mutual_ley16744 (id, code, name, label) VALUES
(1, 0, 'Sin mutual', 'No afiliado a organismo administrador Ley 16.744'),
(2, 1, 'ACHS', 'Asociación Chilena de Seguridad (ACHS)'),
(3, 2, 'Mutual CCHC', 'Mutual de Seguridad de la Cámara de Comercio de Santiago'),
(4, 3, 'IST', 'Instituto de Seguridad del Trabajo (IST)')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, label = EXCLUDED.label;

-- Tabla N°15: Tramos de asignación familiar
INSERT INTO lre_tramo_asignacion_familiar (id, code, label, description) VALUES
(1, 'A', 'Tramo A', 'Tramo A - Asignación familiar plena'),
(2, 'B', 'Tramo B', 'Tramo B - Asignación familiar media'),
(3, 'C', 'Tramo C', 'Tramo C - Asignación familiar reducida'),
(4, 'D', 'Tramo D', 'Tramo D - Sin derecho a asignación familiar'),
(5, 'S', 'Tramo S', 'Tramo S - Sin asignación familiar (remuneración excede el límite)')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;

-- =====================================================
-- Mapeo de campos internos -> códigos DT (lre_field_mapping)
-- =====================================================

-- Categoría 1: Identificación del Trabajador
INSERT INTO lre_field_mapping (internal_category, dt_code, dt_concept, lre_category, dt_type, dt_max_size, is_mandatory, description) VALUES
('rut_trabajador', 1101, 'Rut trabajador', 'identificacion', 'Int', 10, true, 'RUT del trabajador sin puntos, con guion'),
('fecha_inicio_contrato', 1102, 'Fecha inicio contrato', 'identificacion', 'Date', 10, true, 'Fecha de inicio del contrato dd/mm/aaaa'),
('fecha_termino_contrato', 1103, 'Fecha término de contrato', 'identificacion', 'Date', 10, false, 'Fecha de término del contrato dd/mm/aaaa'),
('causal_termino', 1104, 'Causal de término del contrato', 'identificacion', 'Tinyint', 2, false, 'Código Tabla N°1, obligatorio si hay fecha de término'),
('region_servicios', 1105, 'Región de prestación de servicios', 'identificacion', 'Tinyint', 2, true, 'Código Tabla N°2'),
('comuna_servicios', 1106, 'Comuna de prestación de servicios', 'identificacion', 'Tinyint', 5, true, 'Código Tabla N°3'),
('tipo_impuesto_renta', 1170, 'Tipo de impuesto a la renta', 'identificacion', 'Tinyint', 1, true, 'Código Tabla N°4'),
('tecnico_extranjero', 1146, 'Técnico extranjero exención cotizaciones', 'identificacion', 'Tinyint', 1, true, 'Código Tabla N°5'),
('tipo_jornada', 1107, 'Código tipo de jornada', 'identificacion', 'Tinyint', 3, true, 'Código Tabla N°6'),
('discapacidad', 1108, 'Persona con discapacidad/pensionado invalidez', 'identificacion', 'Tinyint', 1, true, 'Código Tabla N°7'),
('pensionado_vejez', 1109, 'Pensionado por vejez', 'identificacion', 'Tinyint', 1, true, 'Código Tabla N°8'),
('afp', 1141, 'AFP', 'identificacion', 'Tinyint', 3, true, 'Código Tabla N°9'),
('ips_exinp', 1142, 'IPS Ex-INP', 'identificacion', 'Tinyint', 3, true, 'Código Tabla N°10'),
('fonasa_isapre', 1143, 'Fonasa/Isapre', 'identificacion', 'Tinyint', 3, true, 'Código Tabla N°11'),
('afc', 1151, 'AFC', 'identificacion', 'Tinyint', 1, true, 'Código Tabla N°12'),
('ccaf', 1110, 'CCAF', 'identificacion', 'Tinyint', 1, true, 'Código Tabla N°13'),
('organismo_ley16744', 1152, 'Org. administrador Ley 16.744', 'identificacion', 'Tinyint', 2, true, 'Código Tabla N°14'),
('cargas_familiares_legales', 1111, 'N° cargas familiares legales', 'identificacion', 'Int', 2, false, 'Número de cargas familiares legales'),
('cargas_familiares_maternales', 1112, 'N° cargas familiares maternales', 'identificacion', 'Int', 2, false, 'Número de cargas familiares maternales'),
('cargas_familiares_invalidez', 1113, 'N° cargas familiares invalidez', 'identificacion', 'Int', 2, false, 'Número de cargas familiares invalidez'),
('tramo_asignacion_familiar', 1114, 'Tramo asignación familiar', 'identificacion', 'Tinyint', 1, false, 'Código Tabla N°15 (A-D, S)'),
('rut_sindicato_1', 1171, 'RUT organización sindical 1', 'identificacion', 'Int', 10, false, 'RUT del sindicato 1'),
('rut_sindicato_2', 1172, 'RUT organización sindical 2', 'identificacion', 'Int', 10, false, 'RUT del sindicato 2'),
('rut_sindicato_3', 1173, 'RUT organización sindical 3', 'identificacion', 'Int', 10, false, 'RUT del sindicato 3'),
('rut_sindicato_4', 1174, 'RUT organización sindical 4', 'identificacion', 'Int', 10, false, 'RUT del sindicato 4'),
('rut_sindicato_5', 1175, 'RUT organización sindical 5', 'identificacion', 'Int', 10, false, 'RUT del sindicato 5'),
('rut_sindicato_6', 1176, 'RUT organización sindical 6', 'identificacion', 'Int', 10, false, 'RUT del sindicato 6'),
('rut_sindicato_7', 1177, 'RUT organización sindical 7', 'identificacion', 'Int', 10, false, 'RUT del sindicato 7'),
('rut_sindicato_8', 1178, 'RUT organización sindical 8', 'identificacion', 'Int', 10, false, 'RUT del sindicato 8'),
('rut_sindicato_9', 1179, 'RUT organización sindical 9', 'identificacion', 'Int', 10, false, 'RUT del sindicato 9'),
('rut_sindicato_10', 1180, 'RUT organización sindical 10', 'identificacion', 'Int', 10, false, 'RUT del sindicato 10'),
('dias_trabajados', 1115, 'N° días trabajados en el mes', 'identificacion', 'Int', 2, true, 'Días trabajados (base 30 para mes completo)'),
('dias_licencia_medica', 1116, 'N° días licencia médica en el mes', 'identificacion', 'Int', 2, false, 'Días de licencia médica'),
('dias_vacaciones', 1117, 'N° días de vacaciones en el mes', 'identificacion', 'Int', 2, false, 'Días de vacaciones'),
('subsidio_trabajador_joven', 1118, 'Subsidio trabajador joven', 'identificacion', 'Int', 1, true, '0=No, 1=Sí'),
('puesto_trabajo_pesado', 1154, 'Puesto trabajo pesado', 'identificacion', 'Int', 20, false, 'Nombre del puesto de trabajo pesado'),
('ahorro_previsional_voluntario', 1155, 'Ahorro previsional voluntario individual', 'identificacion', 'Int', 1, true, '0=No, 1=Sí'),
('ahorro_previsional_colectivo', 1157, 'Ahorro previsional voluntario colectivo', 'identificacion', 'Int', 1, true, '0=No, 1=Sí'),
('indemnizacion_a_todo_evento', 1131, 'Indemnización a todo evento (Art.164)', 'identificacion', 'Int', 1, true, '0=No, 1=Sí'),
('tasa_indemnizacion', 1132, 'Tasa indemnización a todo evento', 'identificacion', 'Float', 4, false, 'Tasa mínima 4.11%')
ON CONFLICT (internal_category, dt_code) DO UPDATE SET dt_concept = EXCLUDED.dt_concept, lre_category = EXCLUDED.lre_category, is_mandatory = EXCLUDED.is_mandatory;

-- Categoría 2 Subcategoría 1: Haberes imponibles y tributables
INSERT INTO lre_field_mapping (internal_category, dt_code, dt_concept, lre_category, dt_type, dt_max_size, is_mandatory, description) VALUES
('sueldo_base', 2101, 'Sueldo', 'haber_imp_trib', 'Int', 8, true, 'Sueldo base mensual'),
('sobresueldo', 2102, 'Sobresueldo', 'haber_imp_trib', 'Int', 8, false, 'Pago de horas extraordinarias'),
('comisiones', 2103, 'Comisiones', 'haber_imp_trib', 'Int', 8, false, 'Comisiones por ventas o servicios'),
('semana_corrida', 2104, 'Semana corrida', 'haber_imp_trib', 'Int', 8, false, 'Remuneración por semana corrida'),
('participacion', 2105, 'Participación', 'haber_imp_trib', 'Int', 8, false, 'Participación en utilidades'),
('gratificacion_mensual', 2106, 'Gratificación mensual', 'haber_imp_trib', 'Int', 8, false, 'Gratificación legal mensual'),
('recargo_30_domingo', 2107, 'Recargo 30% domingo', 'haber_imp_trib', 'Int', 8, false, 'Recargo 30% por trabajo en domingo'),
('rem_variable_vacaciones', 2108, 'Rem. variable vacaciones', 'haber_imp_trib', 'Int', 8, false, 'Remuneración variable por vacaciones'),
('rem_variable_clausura', 2109, 'Rem. variable clausura', 'haber_imp_trib', 'Int', 8, false, 'Remuneración variable por clausura'),
('aguinaldo_imp', 2110, 'Aguinaldo', 'haber_imp_trib', 'Int', 8, false, 'Aguinaldo imponible'),
('bonos_fijos_mensuales', 2111, 'Bonos fijos mensuales', 'haber_imp_trib', 'Int', 8, false, 'Bonos fijos mensuales imponibles'),
('tratos', 2112, 'Tratos', 'haber_imp_trib', 'Int', 8, false, 'Pagos por tratos'),
('bonos_variables', 2113, 'Bonos variables ≥1 mes', 'haber_imp_trib', 'Int', 8, false, 'Bonos variables de periodicidad ≥1 mes'),
('ejercicio_opcion', 2114, 'Ejercicio opción no pactada', 'haber_imp_trib', 'Int', 8, false, 'Ejercicio de opción no pactada'),
('beneficios_especie', 2115, 'Beneficios en especie', 'haber_imp_trib', 'Int', 8, false, 'Beneficios en especie imponibles'),
('rem_bimestrales', 2116, 'Rem. bimestrales', 'haber_imp_trib', 'Int', 8, false, 'Remuneraciones devengadas bimestrales'),
('rem_trimestrales', 2117, 'Rem. trimestrales', 'haber_imp_trib', 'Int', 8, false, 'Remuneraciones devengadas trimestrales'),
('rem_cuatrimestrales', 2118, 'Rem. cuatrimestrales', 'haber_imp_trib', 'Int', 8, false, 'Remuneraciones devengadas cuatrimestrales'),
('rem_semestrales', 2119, 'Rem. semestrales', 'haber_imp_trib', 'Int', 8, false, 'Remuneraciones devengadas semestrales'),
('rem_anuales', 2120, 'Rem. anuales', 'haber_imp_trib', 'Int', 8, false, 'Remuneraciones devengadas anuales'),
('participacion_anual', 2121, 'Participación anual', 'haber_imp_trib', 'Int', 8, false, 'Participación anual en utilidades'),
('gratificacion_anual', 2122, 'Gratificación anual', 'haber_imp_trib', 'Int', 8, false, 'Gratificación anual'),
('otras_rem_mas_1_mes', 2123, 'Otras rem. >1 mes', 'haber_imp_trib', 'Int', 8, false, 'Otras remuneraciones de periodicidad >1 mes'),
('pago_horas_sindical', 2124, 'Pago horas trabajo sindical', 'haber_imp_trib', 'Int', 8, false, 'Pago por horas de trabajo sindical'),
('sueldo_empresarial', 2161, 'Sueldo empresarial', 'haber_imp_trib', 'Int', 8, false, 'Sueldo empresarial')
ON CONFLICT (internal_category, dt_code) DO UPDATE SET dt_concept = EXCLUDED.dt_concept, lre_category = EXCLUDED.lre_category, is_mandatory = EXCLUDED.is_mandatory;

-- Categoría 2 Subcategoría 2: Haberes imponibles y no tributables
INSERT INTO lre_field_mapping (internal_category, dt_code, dt_concept, lre_category, dt_type, dt_max_size, is_mandatory, description) VALUES
('subsidio_incapacidad', 2201, 'Subsidio incapacidad laboral', 'haber_imp_no_trib', 'Int', 8, false, 'Subsidio por incapacidad laboral'),
('beca_estudio', 2202, 'Beca de estudio', 'haber_imp_no_trib', 'Int', 8, false, 'Beca de estudio'),
('gratificacion_zona', 2203, 'Gratificaciones de zona', 'haber_imp_no_trib', 'Int', 8, false, 'Gratificaciones de zona'),
('otros_ingresos_no_renta', 2204, 'Otros ingresos no constitutivos de renta', 'haber_imp_no_trib', 'Int', 8, false, 'Otros ingresos no constitutivos de renta')
ON CONFLICT (internal_category, dt_code) DO UPDATE SET dt_concept = EXCLUDED.dt_concept, lre_category = EXCLUDED.lre_category, is_mandatory = EXCLUDED.is_mandatory;

-- Categoría 2 Subcategoría 3: Haberes no imponibles y no tributables
INSERT INTO lre_field_mapping (internal_category, dt_code, dt_concept, lre_category, dt_type, dt_max_size, is_mandatory, description) VALUES
('colacion', 2301, 'Colación', 'haber_no_imp_no_trib', 'Int', 8, false, 'Asignación de colación'),
('movilizacion', 2302, 'Movilización', 'haber_no_imp_no_trib', 'Int', 8, false, 'Asignación de movilización'),
('viaticos', 2303, 'Viáticos', 'haber_no_imp_no_trib', 'Int', 8, false, 'Viáticos'),
('perdida_caja', 2304, 'Pérdida de caja', 'haber_no_imp_no_trib', 'Int', 8, false, 'Asignación por pérdida de caja'),
('desgaste_herramienta', 2305, 'Desgaste herramienta', 'haber_no_imp_no_trib', 'Int', 8, false, 'Asignación por desgaste de herramienta'),
('asignacion_familiar_legal', 2311, 'Asignación familiar legal', 'haber_no_imp_no_trib', 'Int', 8, false, 'Monto de asignación familiar legal'),
('gastos_causa_trabajo', 2306, 'Gastos por causa del trabajo', 'haber_no_imp_no_trib', 'Int', 8, false, 'Gastos por causa del trabajo'),
('gastos_cambio_residencia', 2307, 'Gastos cambio residencia', 'haber_no_imp_no_trib', 'Int', 8, false, 'Gastos de cambio de residencia'),
('sala_cuna', 2308, 'Sala cuna', 'haber_no_imp_no_trib', 'Int', 8, false, 'Asignación de sala cuna'),
('trabajo_distancia', 2309, 'Trabajo a distancia/teletrabajo', 'haber_no_imp_no_trib', 'Int', 8, false, 'Asignación por trabajo a distancia'),
('deposito_convenido_uf900', 2347, 'Depósito convenido hasta UF 900', 'haber_no_imp_no_trib', 'Int', 8, false, 'Depósito convenido hasta UF 900'),
('alojamiento', 2310, 'Alojamiento', 'haber_no_imp_no_trib', 'Int', 8, false, 'Asignación de alojamiento'),
('asignacion_traslacion', 2312, 'Asignación de traslación', 'haber_no_imp_no_trib', 'Int', 8, false, 'Asignación de traslación'),
('indemnizacion_feriado_legal', 2313, 'Indemnización feriado legal', 'haber_no_imp_no_trib', 'Int', 8, false, 'Indemnización por feriado legal'),
('indemnizacion_anos_servicio', 2314, 'Indemnización años de servicio', 'haber_no_imp_no_trib', 'Int', 8, false, 'Indemnización por años de servicio'),
('indemnizacion_sustitutiva_aviso', 2315, 'Indemnización sustitutiva aviso previo', 'haber_no_imp_no_trib', 'Int', 8, false, 'Indemnización sustitutiva de aviso previo'),
('indemnizacion_fuero_maternal', 2316, 'Indemnización fuero maternal', 'haber_no_imp_no_trib', 'Int', 8, false, 'Indemnización por fuero maternal'),
('indemnizacion_a_todo_evento_no_trib', 2331, 'Indemnización a todo evento', 'haber_no_imp_no_trib', 'Int', 8, false, 'Indemnización a todo evento (no tributable)')
ON CONFLICT (internal_category, dt_code) DO UPDATE SET dt_concept = EXCLUDED.dt_concept, lre_category = EXCLUDED.lre_category, is_mandatory = EXCLUDED.is_mandatory;

-- Categoría 2 Subcategoría 4: Haberes no imponibles y tributables
INSERT INTO lre_field_mapping (internal_category, dt_code, dt_concept, lre_category, dt_type, dt_max_size, is_mandatory, description) VALUES
('indemnizacion_voluntaria_tributable', 2417, 'Indemnizaciones voluntarias tributables', 'haber_no_imp_trib', 'Int', 8, false, 'Indemnizaciones voluntarias tributables'),
('indemnizacion_contractual_tributable', 2418, 'Indemnizaciones contractuales tributables', 'haber_no_imp_trib', 'Int', 8, false, 'Indemnizaciones contractuales tributables')
ON CONFLICT (internal_category, dt_code) DO UPDATE SET dt_concept = EXCLUDED.dt_concept, lre_category = EXCLUDED.lre_category, is_mandatory = EXCLUDED.is_mandatory;

-- Categoría 3: Descuentos
INSERT INTO lre_field_mapping (internal_category, dt_code, dt_concept, lre_category, dt_type, dt_max_size, is_mandatory, description) VALUES
('cotizacion_obligatoria_afp', 3141, 'Cotización obligatoria previsional (AFP/IPS)', 'descuento', 'Int', 8, true, 'Cotización obligatoria AFP o IPS'),
('cotizacion_obligatoria_salud', 3143, 'Cotización obligatoria salud 7%', 'descuento', 'Int', 8, true, 'Cotización obligatoria de salud 7%'),
('cotizacion_voluntaria_salud', 3144, 'Cotiz. voluntaria salud', 'descuento', 'Int', 8, false, 'Cotización voluntaria de salud (ISAPRE)'),
('cotizacion_afc_trabajador', 3151, 'Cotiz. AFC trabajador', 'descuento', 'Int', 8, false, 'Cotización AFC del trabajador'),
('cotizacion_tecnico_extranjero', 3146, 'Cotiz. técnico extranjero', 'descuento', 'Int', 8, false, 'Cotización de técnico extranjero'),
('descuento_deposito_convenido', 3147, 'Descuento depósito convenido', 'descuento', 'Int', 8, false, 'Descuento por depósito convenido'),
('apv_individual_modalidad_a', 3155, 'APV individual modalidad A', 'descuento', 'Int', 8, false, 'Ahorro previsional voluntario individual modalidad A'),
('apv_individual_modalidad_b', 3156, 'APV individual modalidad B', 'descuento', 'Int', 8, false, 'Ahorro previsional voluntario individual modalidad B'),
('apv_colectivo_modalidad_a', 3157, 'APV colectivo modalidad A', 'descuento', 'Int', 8, false, 'Ahorro previsional voluntario colectivo modalidad A'),
('apv_colectivo_modalidad_b', 3158, 'APV colectivo modalidad B', 'descuento', 'Int', 8, false, 'Ahorro previsional voluntario colectivo modalidad B'),
('impuesto_retenido_remuneraciones', 3161, 'Impuesto retenido por remuneraciones', 'descuento', 'Int', 8, true, 'Impuesto único retenido por remuneraciones'),
('impuesto_retenido_indemnizaciones', 3162, 'Impuesto retenido por indemnizaciones', 'descuento', 'Int', 8, false, 'Impuesto retenido por indemnizaciones'),
('mayor_retencion_solicitada', 3163, 'Mayor retención solicitada', 'descuento', 'Int', 8, false, 'Mayor retención de impuesto solicitada'),
('reliquidacion_impuesto', 3164, 'Reliquidación impuesto remuneraciones', 'descuento', 'Int', 8, false, 'Reliquidación de impuesto por remuneraciones'),
('reliquidacion_indemnizaciones', 3165, 'Reliquidación impuesto indemnizaciones', 'descuento', 'Int', 8, false, 'Reliquidación de impuesto por indemnizaciones'),
('retencion_prestamo_clase_media', 3166, 'Retención préstamo clase media', 'descuento', 'Int', 8, false, 'Retención por préstamo de la clase media'),
('rebaja_zona_extrema', 3167, 'Rebaja zona extrema', 'descuento', 'Int', 8, false, 'Rebaja por zona extrema'),
('cuota_sindical_1', 3171, 'Cuota sindical 1', 'descuento', 'Int', 8, false, 'Cuota sindical organización 1'),
('cuota_sindical_2', 3172, 'Cuota sindical 2', 'descuento', 'Int', 8, false, 'Cuota sindical organización 2'),
('cuota_sindical_3', 3173, 'Cuota sindical 3', 'descuento', 'Int', 8, false, 'Cuota sindical organización 3'),
('cuota_sindical_4', 3174, 'Cuota sindical 4', 'descuento', 'Int', 8, false, 'Cuota sindical organización 4'),
('cuota_sindical_5', 3175, 'Cuota sindical 5', 'descuento', 'Int', 8, false, 'Cuota sindical organización 5'),
('cuota_sindical_6', 3176, 'Cuota sindical 6', 'descuento', 'Int', 8, false, 'Cuota sindical organización 6'),
('cuota_sindical_7', 3177, 'Cuota sindical 7', 'descuento', 'Int', 8, false, 'Cuota sindical organización 7'),
('cuota_sindical_8', 3178, 'Cuota sindical 8', 'descuento', 'Int', 8, false, 'Cuota sindical organización 8'),
('cuota_sindical_9', 3179, 'Cuota sindical 9', 'descuento', 'Int', 8, false, 'Cuota sindical organización 9'),
('cuota_sindical_10', 3180, 'Cuota sindical 10', 'descuento', 'Int', 8, false, 'Cuota sindical organización 10'),
('credito_social_ccaf', 3110, 'Crédito social CCAF', 'descuento', 'Int', 8, false, 'Crédito social de Caja de Compensación'),
('cuota_vivienda_educacion', 3181, 'Cuota vivienda/educación', 'descuento', 'Int', 8, false, 'Cuota de vivienda o educación'),
('credito_cooperativas', 3182, 'Crédito cooperativas', 'descuento', 'Int', 8, false, 'Crédito de cooperativas'),
('otros_descuentos_autorizados', 3183, 'Otros descuentos autorizados', 'descuento', 'Int', 8, false, 'Otros descuentos autorizados por el trabajador'),
('cotizacion_adicional_trabajo_pesado', 3154, 'Cotiz. adicional trabajo pesado', 'descuento', 'Int', 8, false, 'Cotización adicional por trabajo pesado (trabajador)'),
('donaciones_culturales', 3184, 'Donaciones culturales', 'descuento', 'Int', 8, false, 'Donaciones culturales'),
('otros_descuentos_art58', 3185, 'Otros descuentos Art.58', 'descuento', 'Int', 8, false, 'Otros descuentos del Art.58'),
('pensiones_alimentos', 3186, 'Pensiones de alimentos', 'descuento', 'Int', 8, false, 'Descuento por pensiones de alimentos'),
('descuento_mujer_casada', 3187, 'Descuento mujer casada', 'descuento', 'Int', 8, false, 'Descuento por mujer casada'),
('descuentos_anticipos_prestamos', 3188, 'Descuentos anticipos/préstamos', 'descuento', 'Int', 8, false, 'Descuentos por anticipos o préstamos')
ON CONFLICT (internal_category, dt_code) DO UPDATE SET dt_concept = EXCLUDED.dt_concept, lre_category = EXCLUDED.lre_category, is_mandatory = EXCLUDED.is_mandatory;

-- Categoría 4: Aportes del Empleador
INSERT INTO lre_field_mapping (internal_category, dt_code, dt_concept, lre_category, dt_type, dt_max_size, is_mandatory, description) VALUES
('aporte_afc_empleador', 4151, 'Aporte AFC empleador', 'aporte_empleador', 'Int', 8, false, 'Aporte del empleador al seguro de cesantía'),
('aporte_seguro_accidentes', 4152, 'Aporte seguro accidentes del trabajo y Ley SANNA', 'aporte_empleador', 'Int', 8, true, 'Aporte seguro accidentes trabajo y Ley SANNA'),
('aporte_seguro_invalidez', 4155, 'Aporte seguro invalidez y sobrevivencia', 'aporte_empleador', 'Int', 8, true, 'Aporte SIS del empleador'),
('aporte_indemnizacion_evento', 4131, 'Aporte indemnización a todo evento', 'aporte_empleador', 'Int', 8, false, 'Aporte del empleador por indemnización a todo evento'),
('aporte_adicional_trabajo_pesado', 4154, 'Aporte adicional trabajo pesado', 'aporte_empleador', 'Int', 8, false, 'Aporte adicional por trabajo pesado (empleador)'),
('aporte_apv_colectivo_empleador', 4157, 'Aporte APV colectivo empleador', 'aporte_empleador', 'Int', 8, false, 'Aporte del empleador al APV colectivo')
ON CONFLICT (internal_category, dt_code) DO UPDATE SET dt_concept = EXCLUDED.dt_concept, lre_category = EXCLUDED.lre_category, is_mandatory = EXCLUDED.is_mandatory;

-- Categoría 5: Totales
INSERT INTO lre_field_mapping (internal_category, dt_code, dt_concept, lre_category, dt_type, dt_max_size, is_mandatory, description) VALUES
('total_haberes', 5201, 'Total haberes', 'total', 'Int', 8, true, 'Suma total de haberes'),
('total_haberes_imp_trib', 5210, 'Total haberes imponibles y tributables', 'total', 'Int', 8, true, 'Suma de haberes imponibles tributables'),
('total_haberes_imp_no_trib', 5220, 'Total haberes imponibles no tributables', 'total', 'Int', 8, true, 'Suma de haberes imponibles no tributables'),
('total_haberes_no_imp_no_trib', 5230, 'Total haberes no imponibles y no tributables', 'total', 'Int', 8, true, 'Suma de haberes no imponibles no tributables'),
('total_haberes_no_imp_trib', 5240, 'Total haberes no imponibles y tributables', 'total', 'Int', 8, true, 'Suma de haberes no imponibles tributables'),
('total_descuentos', 5301, 'Total descuentos', 'total', 'Int', 8, true, 'Suma total de descuentos'),
('total_descuentos_impuestos_rem', 5361, 'Total descuentos impuestos a remuneraciones', 'total', 'Int', 8, true, 'Total de descuentos por impuestos a remuneraciones'),
('total_descuentos_impuestos_ind', 5362, 'Total descuentos impuestos por indemnizaciones', 'total', 'Int', 8, false, 'Total de descuentos por impuestos a indemnizaciones'),
('total_descuentos_cotizaciones', 5341, 'Total descuentos por cotizaciones', 'total', 'Int', 8, true, 'Total de descuentos por cotizaciones previsionales'),
('total_otros_descuentos', 5302, 'Total otros descuentos', 'total', 'Int', 8, true, 'Total de otros descuentos'),
('total_aportes_empleador', 5410, 'Total aportes empleador', 'total', 'Int', 8, true, 'Suma total de aportes del empleador'),
('total_liquido', 5501, 'Total líquido', 'total', 'Int', 8, true, 'Total haberes - Total descuentos'),
('total_indemnizaciones', 5502, 'Total indemnizaciones', 'total', 'Int', 8, false, 'Total de indemnizaciones'),
('total_indemnizaciones_tributables', 5564, 'Total indemnizaciones tributables', 'total', 'Int', 8, true, 'Total de indemnizaciones tributables'),
('total_indemnizaciones_no_tributables', 5565, 'Total indemnizaciones no tributables', 'total', 'Int', 8, false, 'Total de indemnizaciones no tributables')
ON CONFLICT (internal_category, dt_code) DO UPDATE SET dt_concept = EXCLUDED.dt_concept, lre_category = EXCLUDED.lre_category, is_mandatory = EXCLUDED.is_mandatory;

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migración 132 completada exitosamente';
  RAISE NOTICE 'Catálogos LRE-DT poblados con datos oficiales';
  RAISE NOTICE '==============================================';
END $$;