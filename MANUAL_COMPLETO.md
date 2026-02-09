# Manual Completo del Sistema de Remuneraciones y RRHH - Chile

## 📋 Índice

1. [Stack Tecnológico](#stack-tecnológico)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Base de Datos](#base-de-datos)
5. [Módulos y Funcionalidades](#módulos-y-funcionalidades)
6. [Cálculos y Lógica de Negocio](#cálculos-y-lógica-de-negocio)
7. [Generación de PDFs](#generación-de-pdfs)
8. [APIs y Servicios Externos](#apis-y-servicios-externos)
9. [Variables de Entorno](#variables-de-entorno)
10. [Flujos de Trabajo](#flujos-de-trabajo)
11. [Módulo de Reportes](#módulo-de-reportes)
12. [Asistente IA (Gemini)](#asistente-ia-gemini)
13. [Módulo de Contratos y Anexos](#módulo-de-contratos-y-anexos)
14. [Sistema de Notificaciones](#sistema-de-notificaciones)
15. [Centros de Costo](#centros-de-costo)
16. [Cartas de Amonestación](#cartas-de-amonestación)
17. [Libro de Remuneraciones](#libro-de-remuneraciones)
18. [Módulo de Finiquitos](#módulo-de-finiquitos)
19. [Sistema de Departamentos](#sistema-de-departamentos)
20. [Módulo RAAT](#módulo-raat)
21. [Portal para Trabajadores](#portal-para-trabajadores)
22. [Implementación PWA](#implementación-pwa-progressive-web-app)
23. [Organigramas](#organigramas)
24. [Sistema de Storage y PDFs](#sistema-de-storage-y-pdfs)

---

## 🛠 Stack Tecnológico

### Frontend
- **Framework**: Next.js 14.2.35 (App Router)
- **Lenguaje**: TypeScript 5.3.3
- **UI Library**: React 18.2.0
- **Estilos**: Tailwind CSS v4 + CSS Modules + Inline Styles
- **UI Components**: Preline UI 4.0.1 (componentes modernos y interactivos)
- **Iconos**: react-icons 5.5.0
- **Gráficos**: recharts 3.6.0
- **PWA**: Service Worker + Web App Manifest (instalación y actualizaciones automáticas)

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Base de Datos**: PostgreSQL (Supabase)
- **ORM/Query Builder**: Supabase Client (@supabase/supabase-js 2.38.5)
- **Autenticación**: Supabase Auth (@supabase/ssr 0.8.0)

### Generación de Documentos
- **PDF**: @react-pdf/renderer 3.4.4

### Inteligencia Artificial
- **Gemini API**: @google/genai (SDK oficial de Google)

### Utilidades
- **Fechas**: date-fns 3.0.6
- **Validación**: zod 3.22.4

### Deployment
- **Plataforma**: Vercel (configurado con cron jobs)
- **Configuración**: vercel.json (cron jobs para scraping automático)

---

## 🏗 Arquitectura del Sistema

### Patrón de Arquitectura
- **Frontend**: Server-Side Rendering (SSR) + Client Components
- **Backend**: API Routes (Next.js Serverless Functions)
- **Base de Datos**: PostgreSQL con Row Level Security (RLS)
- **Autenticación**: JWT basado en Supabase Auth

### Clientes Supabase
- **Cliente Servidor**: `@/lib/supabase/server` - Para Server Components y API Routes
- **Cliente Cliente**: `@/lib/supabase/client` - Para Client Components

### Flujo de Datos
1. Usuario interactúa con la UI (Client Component)
2. Client Component llama a API Route o Server Component
3. Server Component/API Route usa Supabase Server Client
4. Supabase ejecuta query en PostgreSQL
5. Datos retornan al cliente y se renderizan

---

## 📁 Estructura del Proyecto

```
RH.Piwi-Basic/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Dashboard principal
│   ├── layout.tsx                # Layout principal con navegación
│   ├── login/                    # Autenticación
│   ├── employees/                # Módulo de trabajadores
│   │   ├── page.tsx              # Lista de trabajadores
│   │   ├── new/                  # Crear trabajador
│   │   └── [id]/                 # Detalle de trabajador
│   │       ├── page.tsx          # Vista detalle
│   │       ├── edit/              # Editar trabajador
│   │       ├── loans/             # Préstamos del trabajador
│   │       ├── vacations/        # Vacaciones del trabajador
│   │       ├── medical-leaves/    # Licencias médicas
│   │       └── certificate/       # Certificados
│   ├── payroll/                  # Módulo de liquidaciones
│   │   ├── page.tsx              # Lista de liquidaciones
│   │   ├── new/                  # Nueva liquidación
│   │   ├── bulk/                 # Liquidación masiva
│   │   └── [id]/                 # Detalle de liquidación
│   │       ├── page.tsx          # Vista detalle
│   │       ├── edit/              # Editar liquidación
│   │       └── pdf/               # Ver PDF
│   ├── advances/                 # Módulo de anticipos
│   │   ├── page.tsx              # Lista de anticipos
│   │   ├── new/                  # Nuevo anticipo
│   │   ├── bulk/                 # Anticipos masivos
│   │   └── [id]/                 # Detalle de anticipo
│   ├── loans/                    # Gestión global de préstamos
│   │   └── page.tsx              # Vista consolidada de préstamos
│   ├── vacations/                # Dashboard de vacaciones
│   │   └── page.tsx              # Vista consolidada de vacaciones
│   ├── contracts/                # Módulo de contratos
│   │   ├── page.tsx              # Lista de contratos
│   │   ├── new/                  # Nuevo contrato
│   │   ├── [id]/                 # Detalle de contrato
│   │   │   ├── page.tsx          # Vista detalle
│   │   │   ├── edit/             # Editar contrato
│   │   │   └── pdf/              # Ver PDF
│   │   └── annex/                # Anexos de contratos
│   │       ├── new/              # Nuevo anexo
│   │       └── [id]/             # Detalle de anexo
│   ├── disciplinary-actions/     # Cartas de amonestación
│   │   └── page.tsx              # Dashboard de acciones disciplinarias
│   ├── reports/                  # Módulo de reportes
│   │   ├── page.tsx              # Dashboard de reportes
│   │   ├── headcount/            # Reporte de dotación
│   │   ├── salary/               # Reporte de sueldos
│   │   ├── leaves/               # Reporte de licencias
│   │   ├── organizational/       # Reporte organizacional
│   │   ├── payroll/              # Reporte de liquidaciones
│   │   └── loans-advances/       # Reporte de préstamos y anticipos
│   ├── payroll-books/            # Libro de remuneraciones
│   │   └── [id]/                 # Detalle del libro
│   ├── settlements/               # Módulo de finiquitos
│   │   ├── page.tsx              # Lista de finiquitos
│   │   ├── new/                  # Nuevo finiquito
│   │   └── [id]/                 # Detalle de finiquito
│   ├── organigrama/              # Organigrama de trabajadores
│   │   └── page.tsx              # Vista del organigrama
│   ├── departments/              # Organigrama de departamentos
│   │   └── chart/                # Vista del organigrama de departamentos
│   ├── prevencion/               # Prevención de Riesgos
│   │   └── page.tsx              # Página en construcción
│   ├── raat/                     # Módulo RAAT
│   │   ├── page.tsx              # Dashboard RAAT
│   │   ├── new/                  # Registrar accidente
│   │   ├── dashboard/            # Dashboard avanzado con gráficos
│   │   ├── diat/                 # Gestión de DIATs
│   │   └── [id]/                 # Detalle de accidente
│   │       ├── page.tsx          # Vista detalle
│   │       └── edit/             # Editar accidente
│   ├── settings/                 # Configuración
│   │   ├── page.tsx              # Configuración general
│   │   ├── indicators/           # Indicadores previsionales
│   │   └── tax-brackets/         # Tramos de impuesto único
│   ├── admin/                    # Administración
│   │   ├── users/                # Gestión de usuarios
│   │   ├── companies/            # Gestión de empresas
│   │   ├── departments/           # Gestión de departamentos
│   │   └── cost-centers/         # Gestión de centros de costo
│   ├── employee/                 # Portal del trabajador
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── documents/            # Mis Documentos
│   │   │   └── page.tsx          # Lista de documentos (generales y laborales)
│   │   ├── loans/                # Historial de Préstamos
│   │   │   └── page.tsx          # Vista con cards y modal de detalle
│   │   ├── certificates/         # Solicitar certificado
│   │   ├── vacations/            # Solicitar vacaciones
│   │   ├── permissions/          # Solicitar permisos
│   │   └── requests/             # Mis Solicitudes
│   └── api/                      # API Routes
│       ├── alerts/               # Sistema de alertas
│       ├── tax-brackets/         # Tramos de impuesto
│       ├── ai/                   # Asistente IA
│       │   ├── ask/              # Endpoint principal
│       │   ├── test/             # Test de conexión
│       │   └── reset-rate-limit/ # Reset de límite
│       ├── employee/              # Endpoints del portal trabajador
│       │   ├── dashboard/        # Datos del dashboard
│       │   ├── certificates/     # Certificados del trabajador
│       │   │   └── request/      # Solicitar certificado
│       │   ├── vacations/        # Vacaciones del trabajador
│       │   │   └── request/      # Solicitar vacaciones
│       │   ├── permissions/      # Permisos del trabajador
│       │   │   └── request/      # Solicitar permiso
│       │   ├── permission-types/ # Tipos de permisos
│       │   ├── payroll-slips/    # Liquidaciones del trabajador
│       │   ├── overtime-pacts/   # Pactos de horas extra del trabajador
│       │   ├── contract-annexes/ # Anexos de contrato del trabajador
│       │   ├── advances/         # Anticipos del trabajador
│       │   └── loans/            # Préstamos del trabajador
│       ├── employees/             # Endpoints de trabajadores
│       │   └── create-user/      # Crear usuario automáticamente
│       ├── certificates/         # Endpoints de certificados
│       │   └── [id]/             # Aprobar/rechazar certificado
│       │       ├── approve/      # Aprobar
│       │       └── reject/       # Rechazar
│       ├── vacations/            # Endpoints de vacaciones
│       │   └── [id]/             # Aprobar/rechazar vacaciones
│       │       ├── approve/      # Aprobar
│       │       └── reject/       # Rechazar
│       ├── permissions/           # Endpoints de permisos
│       │   └── [id]/             # Aprobar/rechazar permiso
│       │       ├── approve/      # Aprobar
│       │       └── reject/       # Rechazar
│       ├── organigrama/           # Endpoints de organigrama
│       │   └── tree/             # Árbol jerárquico de trabajadores
│       ├── departments/           # Endpoints de departamentos
│       │   ├── tree/             # Árbol jerárquico de departamentos
│       │   └── chart/            # Datos para organigrama de departamentos
│       ├── raat/                 # Endpoints de RAAT
│       │   ├── stats/            # Estadísticas de accidentes
│       │   └── [id]/             # Operaciones sobre accidente
│       │       ├── diat/         # Marcar DIAT como enviado
│       │       └── close/        # Cerrar accidente
│       └── admin/                # Endpoints de administración
├── components/                    # Componentes React reutilizables
│   ├── Layout.tsx                # Layout principal
│   ├── PayrollPDF.tsx            # PDF de liquidación
│   ├── LoanPDF.tsx               # PDF de préstamo
│   ├── VacationPDF.tsx           # PDF de vacaciones
│   ├── AdvancePDF.tsx            # PDF de anticipo
│   ├── AlertFab.tsx              # Botón flotante de alertas
│   ├── AlertDrawer.tsx           # Panel de alertas
│   ├── NotificationsDropdown.tsx # Dropdown de notificaciones
│   ├── AIChatWidget.tsx          # Widget de chat con IA
│   ├── DateInput.tsx             # Input de fecha (formato chileno)
│   ├── MonthInput.tsx            # Input de mes/año
│   ├── ToggleSwitch.tsx          # Switch toggle personalizado
│   ├── EnhancedOrgChart.tsx      # Organigrama de trabajadores (D3.js)
│   ├── EmployeeNodeCard.tsx      # Card de trabajador en organigrama
│   ├── DepartmentChart.tsx       # Organigrama de departamentos (D3.js)
│   ├── DepartmentNodeCard.tsx   # Card de departamento en organigrama
│   ├── DepartmentSelector.tsx   # Selector de departamento (dropdown)
│   ├── AccidentPDFButton.tsx    # Botón de descarga PDF de accidente
│   ├── AccidentPDFDocument.tsx  # PDF de accidente RAAT
│   └── reports/                  # Componentes de reportes PDF
│       ├── HeadcountReportPDF.tsx
│       ├── SalaryReportPDF.tsx
│       ├── LeavesReportPDF.tsx
│       ├── OrganizationalReportPDF.tsx
│       ├── PayrollReportPDF.tsx
│       └── LoansAdvancesReportPDF.tsx
├── lib/                           # Utilidades y servicios
│   ├── services/                 # Lógica de negocio
│   │   ├── payrollCalculator.ts  # Cálculo de liquidaciones
│   │   ├── previredAPI.ts        # Integración con API Previred
│   │   ├── indicatorsCache.ts    # Cache de indicadores
│   │   ├── taxBracketsScraper.ts # Scraper de tramos SII
│   │   ├── vacationPeriods.ts    # Gestión de períodos de vacaciones
│   │   ├── vacationCalculator.ts # Cálculos de vacaciones
│   │   ├── alertEngine.ts        # Motor de alertas
│   │   ├── geminiClient.ts      # Cliente de Gemini API
│   │   ├── aiContextBuilder.ts  # Constructor de contexto para IA
│   │   ├── rateLimiter.ts       # Limitador de tasa para IA
│   │   ├── notificationService.ts # Servicio de notificaciones
│   │   ├── contractService.ts   # Servicio de contratos
│   │   ├── settlementService.ts # Servicio de finiquitos
│   │   ├── costCenterService.ts # Servicio de centros de costo
│   │   ├── departmentService.ts # Servicio de departamentos
│   │   ├── raatService.ts       # Servicio de RAAT (accidentes)
│   │   ├── permissionService.ts  # Servicio de permisos
│   │   └── reports/              # Servicios de reportes
│   │       ├── headcountReports.ts
│   │       ├── salaryReports.ts
│   │       ├── leavesReports.ts
│   │       ├── organizationalReports.ts
│   │       ├── payrollReports.ts
│   │       └── loansAdvancesReports.ts
│   ├── supabase/                 # Clientes Supabase
│   │   ├── client.ts             # Cliente para componentes cliente
│   │   └── server.ts             # Cliente para servidor
│   └── utils/                    # Utilidades
│       ├── date.ts               # Utilidades de fechas
│       ├── formatNumber.ts      # Formateo de números
│       ├── contractText.ts      # Generación de texto de contratos
│       └── annexClauses.ts      # Gestión de cláusulas de anexos
├── types/                         # Tipos TypeScript
│   └── index.ts                  # Definiciones de tipos
├── supabase/                      # Scripts SQL
│   ├── schema.sql                # Esquema principal
│   ├── rls_policies.sql          # Políticas RLS
│   └── migrations/               # Migraciones específicas
│       ├── 068_allow_employees_view_own_overtime_pacts.sql  # RLS para trabajadores vean sus documentos
│       ├── 069_add_pdf_url_to_payroll_slips.sql            # Agrega campo pdf_url
│       ├── 070_allow_update_pdf_url_payroll_slips.sql      # RLS para actualizar pdf_url
│       └── 071_storage_policies_signed_documents.sql       # Políticas Storage para PDFs
├── public/                        # Archivos estáticos
├── vercel.json                    # Configuración Vercel (cron jobs)
├── package.json                   # Dependencias
├── tsconfig.json                  # Configuración TypeScript
└── next.config.js                 # Configuración Next.js
```

---

## 🗄 Base de Datos

### Tablas Principales

#### 1. `companies`
Almacena información de la empresa.

**Campos:**
- `id` (UUID, PK)
- `name` (VARCHAR) - Razón social
- `employer_name` (VARCHAR) - Nombre del empleador
- `rut` (VARCHAR, UNIQUE) - RUT de la empresa
- `address` (TEXT) - Dirección
- `city` (VARCHAR) - Ciudad
- `created_at`, `updated_at` (TIMESTAMP)

#### 2. `employees`
Información de trabajadores.

**Campos:**
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies)
- `user_id` (UUID, FK → auth.users, nullable) - Usuario vinculado para portal del trabajador
- `email` (VARCHAR) - Email del trabajador (para crear usuario automáticamente)
- `full_name` (VARCHAR) - Nombre completo
- `rut` (VARCHAR, UNIQUE) - RUT del trabajador
- `birth_date` (DATE)
- `address`, `phone` (TEXT/VARCHAR)
- `hire_date` (DATE) - Fecha de ingreso
- `position` (VARCHAR) - Cargo
- `superior_id` (UUID, FK → employees, nullable) - Supervisor/jefe directo (para organigrama)
- `cost_center_id` (UUID, FK → cost_centers, nullable) - Centro de costo (relación)
- `department_id` (UUID, FK → departments, nullable) - Departamento asignado
- `afp` (VARCHAR) - AFP afiliado (PROVIDA, HABITAT, etc.)
- `health_system` (VARCHAR) - FONASA o ISAPRE
- `health_plan` (VARCHAR) - Plan de salud (si ISAPRE)
- `health_plan_percentage` (DECIMAL) - Monto en UF para ISAPRE
- `base_salary` (DECIMAL) - Sueldo base
- `transportation` (DECIMAL) - Asignación de movilización
- `meal_allowance` (DECIMAL) - Asignación de colación
- `contract_type` (VARCHAR) - Tipo de contrato (indefinido, plazo_fijo, temporal)
- `contract_end_date` (DATE) - Fecha fin de contrato (si plazo fijo)
- `requests_advance` (BOOLEAN) - Solicita anticipos
- `advance_amount` (DECIMAL) - Monto de anticipo solicitado
- `status` (VARCHAR) - active/inactive/licencia_medica/renuncia/despido
- `created_at`, `updated_at` (TIMESTAMP)

#### 3. `payroll_periods`
Períodos de liquidación (mes/año).

**Campos:**
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies)
- `year` (INTEGER)
- `month` (INTEGER, 1-12)
- `status` (VARCHAR) - open/closed
- `created_at`, `updated_at` (TIMESTAMP)
- **UNIQUE(company_id, year, month)**

#### 4. `payroll_slips`
Liquidaciones de sueldo.

**Campos:**
- `id` (UUID, PK)
- `employee_id` (UUID, FK → employees)
- `period_id` (UUID, FK → payroll_periods)
- `days_worked` (INTEGER) - Días trabajados
- `days_leave` (INTEGER) - Días de licencia médica
- `base_salary` (DECIMAL) - Sueldo base
- `taxable_base` (DECIMAL) - Base imponible
- `total_taxable_earnings` (DECIMAL) - Total haberes imponibles
- `total_non_taxable_earnings` (DECIMAL) - Total haberes no imponibles
- `total_earnings` (DECIMAL) - Total haberes
- `total_legal_deductions` (DECIMAL) - Total descuentos legales
- `total_other_deductions` (DECIMAL) - Total otros descuentos
- `total_deductions` (DECIMAL) - Total descuentos
- `net_pay` (DECIMAL) - Líquido a pagar
- `pdf_url` (TEXT, nullable) - URL del PDF guardado en Storage (generado automáticamente al emitir)
- `status` (VARCHAR) - draft/issued/sent
- `issued_at`, `sent_at` (TIMESTAMP)
- `created_at`, `updated_at` (TIMESTAMP)
- **UNIQUE(employee_id, period_id)**

#### 5. `payroll_items`
Ítems detallados de cada liquidación (haberes y descuentos).

**Campos:**
- `id` (UUID, PK)
- `payroll_slip_id` (UUID, FK → payroll_slips)
- `loan_id` (UUID, FK → loans, nullable) - Si es descuento de préstamo
- `type` (VARCHAR) - taxable_earning/non_taxable_earning/legal_deduction/other_deduction
- `category` (VARCHAR) - sueldo_base/gratificacion/bonos/afp/salud/etc.
- `description` (VARCHAR) - Descripción del ítem
- `amount` (DECIMAL) - Monto
- `created_at` (TIMESTAMP)

#### 6. `loans`
Préstamos internos a trabajadores.

**Campos:**
- `id` (UUID, PK)
- `employee_id` (UUID, FK → employees)
- `loan_number` (VARCHAR, UNIQUE) - ID correlativo (PT-##)
- `amount` (DECIMAL) - Monto solicitado
- `interest_rate` (DECIMAL) - Tasa de interés (%)
- `total_amount` (DECIMAL) - Monto total a pagar (con interés)
- `installments` (INTEGER) - Número de cuotas
- `installment_amount` (DECIMAL) - Monto por cuota
- `status` (VARCHAR) - active/paid/cancelled
- `paid_installments` (INTEGER) - Cuotas pagadas
- `remaining_amount` (DECIMAL) - Monto pendiente
- `loan_date` (DATE) - Fecha del préstamo
- `description` (TEXT) - Descripción/glosa
- `issued_at`, `sent_at`, `paid_at` (TIMESTAMP)
- `created_at`, `updated_at` (TIMESTAMP)

#### 7. `loan_payments`
Registro de pagos de cuotas de préstamos.

**Campos:**
- `id` (UUID, PK)
- `loan_id` (UUID, FK → loans)
- `payroll_slip_id` (UUID, FK → payroll_slips)
- `installment_number` (INTEGER) - Número de cuota (1, 2, 3...)
- `amount` (DECIMAL) - Monto pagado
- `payment_date` (DATE)
- `created_at` (TIMESTAMP)
- **UNIQUE(loan_id, payroll_slip_id)** - Una cuota por préstamo por liquidación

#### 8. `advances`
Anticipos de remuneración (quincenas).

**Campos:**
- `id` (UUID, PK)
- `employee_id` (UUID, FK → employees)
- `company_id` (UUID, FK → companies)
- `period` (VARCHAR) - Período YYYY-MM
- `advance_date` (DATE) - Fecha del anticipo
- `amount` (DECIMAL) - Monto
- `reason` (TEXT) - Motivo/glosa
- `payment_method` (VARCHAR) - transferencia/efectivo
- `status` (VARCHAR) - borrador/emitido/firmado/pagado/descontado
- `payroll_slip_id` (UUID, FK → payroll_slips, nullable) - Liquidación donde se descontó
- `discounted_at` (TIMESTAMP, nullable) - Fecha de descuento
- `created_by`, `approved_by` (UUID, nullable) - Auditoría
- `issued_at`, `signed_at`, `paid_at` (TIMESTAMP, nullable)
- `created_at`, `updated_at` (TIMESTAMP)

#### 9. `vacations`
Solicitudes y registros de vacaciones.

**Campos:**
- `id` (UUID, PK)
- `employee_id` (UUID, FK → employees)
- `start_date` (DATE) - Fecha inicio
- `end_date` (DATE) - Fecha fin
- `days_business` (INTEGER) - Días hábiles
- `days_count` (INTEGER) - Días totales (calculado)
- `status` (VARCHAR) - solicitada/aprobada/rechazada/tomada/cancelada
- `period_year` (INTEGER) - Año del período al que se descuentan los días
- `requested_by` (UUID, FK → auth.users, nullable) - Usuario que solicitó (si es desde portal)
- `requested_at` (TIMESTAMP, nullable) - Fecha de solicitud
- `approved_by` (UUID, FK → auth.users, nullable) - Usuario que aprobó
- `approved_at` (TIMESTAMP, nullable) - Fecha de aprobación
- `rejection_reason` (TEXT, nullable) - Motivo de rechazo
- `rejected_at` (TIMESTAMP, nullable) - Fecha de rechazo
- `taken_at` (TIMESTAMP, nullable)
- `created_at`, `updated_at` (TIMESTAMP)

#### 10. `vacation_periods`
Períodos de vacaciones por trabajador y año.

**Campos:**
- `id` (UUID, PK)
- `employee_id` (UUID, FK → employees)
- `period_year` (INTEGER) - Año del período
- `accumulated_days` (DECIMAL) - Días acumulados (1.25 por mes completo)
- `used_days` (DECIMAL) - Días usados
- `available_days` (DECIMAL) - Días disponibles
- `created_at`, `updated_at` (TIMESTAMP)
- **UNIQUE(employee_id, period_year)**

#### 11. `medical_leaves`
Licencias médicas.

**Campos:**
- `id` (UUID, PK)
- `employee_id` (UUID, FK → employees)
- `start_date` (DATE)
- `end_date` (DATE)
- `days` (INTEGER) - Días de licencia
- `is_active` (BOOLEAN) - Si está activa
- `created_at`, `updated_at` (TIMESTAMP)

#### 12. `previred_indicators`
Cache de indicadores previsionales de Previred.

**Campos:**
- `id` (UUID, PK)
- `year` (INTEGER)
- `month` (INTEGER)
- `indicators_json` (JSONB) - Datos completos de la API
- `created_at`, `updated_at` (TIMESTAMP)
- **UNIQUE(year, month)**

#### 13. `tax_brackets`
Tramos del Impuesto Único de Segunda Categoría (SII).

**Campos:**
- `id` (UUID, PK)
- `year` (INTEGER)
- `month` (INTEGER)
- `period_type` (VARCHAR) - MENSUAL/QUINCENAL/SEMANAL/DIARIO
- `brackets` (JSONB) - Array de tramos: [{desde, hasta, factor, cantidad_rebajar, tasa_efectiva}]
- `source` (VARCHAR) - sii_scraper
- `created_at`, `updated_at` (TIMESTAMP)
- **Índice**: idx_tax_brackets_latest (year, month, period_type, created_at DESC)

#### 14. `alerts`
Sistema de alertas y sugerencias.

**Campos:**
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies)
- `severity` (VARCHAR) - critical/high/info
- `type` (VARCHAR) - contract_expiry/vacation_balance/legal_params_missing/etc.
- `title` (VARCHAR) - Título de la alerta
- `message` (TEXT) - Mensaje descriptivo
- `entity_type` (VARCHAR) - employee/payroll_period/company
- `entity_id` (UUID, nullable) - ID de la entidad relacionada
- `due_date` (DATE, nullable) - Fecha límite
- `metadata` (JSONB) - Datos adicionales
- `status` (VARCHAR) - open/dismissed/resolved
- `created_at`, `updated_at` (TIMESTAMP)

#### 15. `user_profiles`
Perfiles de usuario (extensión de auth.users).

**Campos:**
- `id` (UUID, PK, FK → auth.users)
- `email` (VARCHAR)
- `full_name` (VARCHAR)
- `role` (VARCHAR) - super_admin/admin/user
- `company_id` (UUID, FK → companies, nullable)
- `must_change_password` (BOOLEAN, default true) - Obliga cambio de contraseña en primer login
- `password_changed_at` (TIMESTAMP, nullable) - Fecha del último cambio de contraseña
- `created_at`, `updated_at` (TIMESTAMP)

#### 16. `cost_centers`
Catálogo de centros de costo.

**Campos:**
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies)
- `code` (TEXT) - Código del centro (ej: "CC-001")
- `name` (TEXT) - Nombre del centro
- `description` (TEXT) - Descripción opcional
- `status` (VARCHAR) - active/inactive
- `created_at`, `updated_at` (TIMESTAMP)
- **UNIQUE(company_id, code)**

#### 17. `user_cost_centers`
Asignación de centros de costo a usuarios.

**Campos:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `company_id` (UUID, FK → companies)
- `cost_center_id` (UUID, FK → cost_centers)
- `created_at`, `updated_at` (TIMESTAMP)
- **UNIQUE(user_id, company_id, cost_center_id)**

#### 18. `contracts`
Contratos laborales.

**Campos:**
- `id` (UUID, PK)
- `contract_number` (VARCHAR, UNIQUE) - CT-##
- `employee_id` (UUID, FK → employees)
- `company_id` (UUID, FK → companies)
- `contract_type` (VARCHAR) - indefinido/plazo_fijo/obra_faena/part_time
- `start_date`, `end_date` (DATE)
- `position` (TEXT) - Cargo
- `position_description` (TEXT) - Descripción de funciones
- `work_schedule` (TEXT) - Horario de trabajo
- `work_location` (TEXT) - Lugar de trabajo
- `base_salary` (DECIMAL)
- `gratuity` (BOOLEAN) - Gratificación legal
- `gratuity_amount` (DECIMAL) - Monto fijo si aplica
- `other_allowances` (TEXT) - Otros bonos (formato: "Bono: $monto; Bono2: $monto2")
- `payment_method` (VARCHAR) - transferencia/efectivo/cheque
- `payment_periodicity` (VARCHAR) - mensual/quincenal/semanal
- `bank_name`, `account_type`, `account_number` (VARCHAR)
- `confidentiality_clause`, `authorized_deductions`, `advances_clause`, `internal_regulations`, `additional_clauses` (TEXT) - Cláusulas editables
- `status` (VARCHAR) - draft/issued/signed/active/terminated/cancelled
- `issued_at`, `signed_at`, `terminated_at` (TIMESTAMP)
- `created_by` (UUID, FK → auth.users)
- `created_at`, `updated_at` (TIMESTAMP)

#### 19. `contract_annexes`
Anexos a contratos.

**Campos:**
- `id` (UUID, PK)
- `annex_number` (VARCHAR, UNIQUE) - ANX-##
- `contract_id` (UUID, FK → contracts)
- `employee_id` (UUID, FK → employees)
- `company_id` (UUID, FK → companies)
- `annex_type` (VARCHAR) - modificacion_sueldo/cambio_cargo/cambio_jornada/prorroga/otro
- `start_date`, `end_date` (DATE)
- `content` (TEXT) - Contenido del anexo (JSON con cláusulas)
- `modifications_summary` (TEXT)
- `status` (VARCHAR) - draft/issued/signed/active/cancelled
- `issued_at`, `signed_at` (TIMESTAMP)
- `created_by` (UUID, FK → auth.users)
- `created_at`, `updated_at` (TIMESTAMP)

#### 20. `disciplinary_actions`
Cartas de amonestación y acciones disciplinarias.

**Campos:**
- `id` (UUID, PK)
- `action_number` (VARCHAR, UNIQUE) - CA-##
- `employee_id` (UUID, FK → employees)
- `company_id` (UUID, FK → companies)
- `action_type` (VARCHAR) - verbal/written
- `incident_date` (DATE)
- `incident_description` (TEXT)
- `riohs_rule` (VARCHAR) - Regla RIOHS aplicada
- `witnesses` (JSONB) - Array de testigos
- `status` (VARCHAR) - draft/under_review/approved/issued/acknowledged/void
- `issued_at`, `acknowledged_at` (TIMESTAMP)
- `created_by` (UUID, FK → auth.users)
- `created_at`, `updated_at` (TIMESTAMP)

#### 21. `settlements`
Finiquitos de trabajadores.

**Campos:**
- `id` (UUID, PK)
- `settlement_number` (VARCHAR, UNIQUE) - FIN-###
- `employee_id` (UUID, FK → employees)
- `company_id` (UUID, FK → companies)
- `contract_id` (UUID, FK → contracts, nullable)
- `termination_date` (DATE)
- `cause_code` (VARCHAR, FK → settlement_causes)
- `contract_start_date` (DATE) - Snapshot
- `last_salary_monthly` (DECIMAL) - Snapshot
- `worked_days_last_month` (INTEGER)
- `service_days` (INTEGER) - Días totales de servicio
- `service_years_raw` (NUMERIC) - Años con decimales
- `service_years_effective` (INTEGER) - Años efectivos
- `service_years_capped` (INTEGER) - Máximo 11 años
- `vacation_days_pending` (NUMERIC)
- `notice_given` (BOOLEAN)
- `notice_days` (INTEGER)
- `salary_balance` (DECIMAL) - Sueldo proporcional
- `vacation_payout` (DECIMAL)
- `ias_amount` (DECIMAL) - Indemnización años servicio
- `iap_amount` (DECIMAL) - Indemnización aviso previo
- `total_earnings` (DECIMAL)
- `loan_balance` (DECIMAL)
- `advance_balance` (DECIMAL)
- `total_deductions` (DECIMAL)
- `net_to_pay` (DECIMAL)
- `status` (VARCHAR) - draft/under_review/approved/signed/paid/void
- `calculation_version` (INTEGER)
- `calculation_snapshot` (JSONB)
- `calculation_log` (JSONB)
- `reviewed_at`, `approved_at`, `signed_at`, `paid_at`, `voided_at` (TIMESTAMP)
- `created_by`, `reviewed_by`, `approved_by` (UUID, FK → auth.users)
- `notes`, `void_reason` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

#### 22. `settlement_items`
Ítems detallados de finiquitos.

**Campos:**
- `id` (UUID, PK)
- `settlement_id` (UUID, FK → settlements)
- `type` (VARCHAR) - earning/deduction
- `category` (VARCHAR) - salary_balance/vacation/ias/iap/loan/advance/other
- `description` (VARCHAR)
- `amount` (DECIMAL)
- `metadata` (JSONB)
- `created_at` (TIMESTAMP)

#### 23. `settlement_causes`
Maestro de causales de término.

**Campos:**
- `code` (VARCHAR, PK) - Código de causal (ej: "159_1", "161_1")
- `label` (VARCHAR) - Etiqueta descriptiva
- `article` (VARCHAR) - Artículo del Código del Trabajo
- `has_ias` (BOOLEAN) - Indemnización años servicio
- `has_iap` (BOOLEAN) - Indemnización aviso previo
- `is_termination` (BOOLEAN)
- `description` (TEXT)
- `created_at` (TIMESTAMP)

#### 24. `payroll_books`
Libros de remuneraciones.

**Campos:**
- `id` (UUID, PK)
- `book_number` (VARCHAR, UNIQUE) - LB-###
- `company_id` (UUID, FK → companies)
- `period_id` (UUID, FK → payroll_periods)
- `status` (VARCHAR) - draft/completed
- `created_by` (UUID, FK → auth.users)
- `created_at`, `updated_at` (TIMESTAMP)

#### 25. `ai_queries`
Registro de consultas al asistente IA.

**Campos:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `company_id` (UUID, FK → companies)
- `question` (TEXT)
- `answer` (TEXT)
- `tokens_used` (INTEGER, nullable)
- `created_at` (TIMESTAMP)

#### 26. `company_users`
Relación usuarios-empresas con roles por empresa.

**Campos:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `company_id` (UUID, FK → companies)
- `role` (VARCHAR) - owner/admin/user
- `created_at`, `updated_at` (TIMESTAMP)
- **UNIQUE(user_id, company_id)**

#### 27. `departments`
Departamentos con estructura jerárquica.

**Campos:**
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies)
- `name` (VARCHAR) - Nombre del departamento
- `code` (VARCHAR) - Código único del departamento
- `status` (VARCHAR) - active/inactive
- `parent_department_id` (UUID, FK → departments, nullable) - Departamento padre
- `created_at`, `updated_at` (TIMESTAMP)
- **UNIQUE(company_id, code)**
- **CHECK**: No puede ser su propio padre

#### 28. `accidents`
Registro de accidentes del trabajo y enfermedades profesionales (RAAT).

**Campos:**
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies)
- `employee_id` (UUID, FK → employees)
- `employee_snapshot` (JSONB) - Snapshot histórico del trabajador al momento del evento
- `cost_center_id` (UUID, FK → cost_centers)
- `accident_number` (VARCHAR, UNIQUE) - Número correlativo por empresa
- `event_date` (DATE) - Fecha del evento
- `event_time` (TIME) - Hora del evento
- `event_location` (TEXT) - Lugar del evento
- `event_type` (VARCHAR) - accidente_trabajo/enfermedad_profesional/accidente_trayecto
- `labor_performed` (TEXT) - Labor que realizaba
- `event_description` (TEXT) - Descripción técnica del evento
- `identified_hazards` (TEXT) - Peligros identificados
- `body_part_affected` (VARCHAR) - Parte del cuerpo afectada
- `injury_type` (VARCHAR) - Tipo de lesión
- `witnesses` (JSONB) - Array de testigos [{name, rut}]
- `possible_sequelae` (TEXT) - Posibles secuelas
- `immediate_actions` (TEXT) - Acciones inmediatas tomadas
- `medical_transfer` (BOOLEAN) - Si fue trasladado a centro médico
- `medical_transfer_location` (TEXT) - Lugar de traslado
- `notification_date` (DATE) - Fecha de notificación
- `notification_time` (TIME) - Hora de notificación
- `diat_sent_at` (TIMESTAMP, nullable) - Fecha de envío de DIAT
- `diat_number` (VARCHAR, nullable) - Número de DIAT
- `diat_status` (VARCHAR) - pending/sent/overdue
- `status` (VARCHAR) - open/closed
- `registered_by` (UUID, FK → auth.users)
- `created_at`, `updated_at` (TIMESTAMP)

#### 29. `accident_attachments`
Archivos adjuntos a accidentes.

**Campos:**
- `id` (UUID, PK)
- `accident_id` (UUID, FK → accidents)
- `file_name` (VARCHAR)
- `file_path` (TEXT)
- `file_type` (VARCHAR)
- `file_size` (INTEGER)
- `description` (TEXT)
- `uploaded_by` (UUID, FK → auth.users)
- `created_at` (TIMESTAMP)

#### 30. `permissions`
Permisos laborales.

**Campos:**
- `id` (UUID, PK)
- `employee_id` (UUID, FK → employees)
- `permission_type_id` (UUID, FK → permission_types)
- `start_date` (DATE)
- `end_date` (DATE)
- `days` (INTEGER) - Días de permiso
- `reason` (TEXT) - Motivo del permiso
- `status` (VARCHAR) - solicitada/aprobada/rechazada/tomada/cancelada
- `requested_by` (UUID, FK → auth.users, nullable) - Usuario que solicitó (si es desde portal)
- `requested_at` (TIMESTAMP, nullable) - Fecha de solicitud
- `approved_by` (UUID, FK → auth.users, nullable) - Usuario que aprobó
- `approved_at` (TIMESTAMP, nullable) - Fecha de aprobación
- `rejection_reason` (TEXT, nullable) - Motivo de rechazo
- `rejected_at` (TIMESTAMP, nullable) - Fecha de rechazo
- `created_at`, `updated_at` (TIMESTAMP)

#### 31. `permission_types`
Tipos de permisos laborales.

**Campos:**
- `id` (UUID, PK)
- `name` (VARCHAR) - Nombre del tipo de permiso
- `description` (TEXT) - Descripción
- `requires_approval` (BOOLEAN) - Si requiere aprobación
- `created_at`, `updated_at` (TIMESTAMP)

#### 32. `certificates`
Certificados laborales.

**Campos:**
- `id` (UUID, PK)
- `employee_id` (UUID, FK → employees)
- `certificate_type` (VARCHAR) - trabajo/renta/antiguedad/otro
- `purpose` (TEXT) - Propósito del certificado
- `status` (VARCHAR) - solicitada/aprobada/rechazada/emitida
- `requested_by` (UUID, FK → auth.users, nullable) - Usuario que solicitó (si es desde portal)
- `requested_at` (TIMESTAMP, nullable) - Fecha de solicitud
- `approved_by` (UUID, FK → auth.users, nullable) - Usuario que aprobó
- `approved_at` (TIMESTAMP, nullable) - Fecha de aprobación
- `rejection_reason` (TEXT, nullable) - Motivo de rechazo
- `rejected_at` (TIMESTAMP, nullable) - Fecha de rechazo
- `issued_at` (TIMESTAMP, nullable) - Fecha de emisión
- `created_at`, `updated_at` (TIMESTAMP)

---

## 📦 Módulos y Funcionalidades

### 1. Dashboard Principal (`/`)

**Funcionalidades:**
- Vista general del sistema
- Accesos rápidos a módulos principales:
  - Trabajadores
  - Liquidaciones
  - Anticipos
  - Préstamos
  - Vacaciones
  - Licencias Médicas
  - Contratos
  - Reportes
  - Banco de Documentos
- Cards de estadísticas:
  - Trabajadores Activos
  - Trabajadores con Licencia Médica
  - Trabajadores con Permiso Laboral
  - Liquidaciones Pendientes
  - Liquidaciones Confirmadas
- Gráfico de remuneraciones mensuales (Recharts):
  - Vista histórica mes a mes
  - Toggle para ver remuneraciones brutas (con aportes empleador)
  - Vista de solo aportes del empleador
- Proyección de pago del mes siguiente:
  - Título dinámico: "Proyección de sueldos para el mes de {MES}"
  - Cálculo completo de liquidaciones proyectadas
- Cards de imposiciones desglosadas:
  - **Primera fila**: Descuentos legales proyectados por concepto
    - AFP (Fondo de Pensiones)
    - Salud/ISAPRE
    - Impuesto Único
    - Seguro de Cesantía
    - Total Imposiciones (sin aportes empleador)
  - **Segunda fila**: Aportes del empleador
    - SIS (Seguro de Invalidez y Sobrevivencia) con porcentaje
    - AFP Empleador con porcentaje
    - AFC Empleador con porcentaje
    - Total Aportes Empleador
- Ranking de trabajadores (ordenable por antigüedad, ingresos, ausencias, etc.)
- Sistema de alertas (FAB flotante)
- Sistema de notificaciones (dropdown en header)

**Cálculos del Dashboard:**
- Proyección mensual: Calcula liquidación completa para cada trabajador activo
- Considera: días trabajados, licencias, vacaciones, préstamos, anticipos
- Usa indicadores actuales de Previred
- Usa tramos de impuesto único del mes actual o siguiente
- Título dinámico con nombre del mes siguiente en español (ENERO, FEBRERO, etc.)

### 2. Módulo de Trabajadores (`/employees`)

#### 2.1 Lista de Trabajadores
- Tabla con todos los trabajadores
- Filtros por:
  - Centro de Costo (respeta permisos del usuario)
  - Estado (activo, licencia médica, renuncia, despido, inactivo)
  - AFP
  - Sistema de Salud
  - Cargo
- Acciones: Ver, Editar, Eliminar
- Responsive: Se convierte en cards en móvil
- Filtrado automático por centro de costo según permisos del usuario

#### 2.2 Crear/Editar Trabajador (`/employees/new`, `/employees/[id]/edit`)
**Campos organizados en filas:**
- **Fila 1**: Nombre, RUT, Fecha de Nacimiento
- **Fila 2**: Dirección, Teléfono, Email
- **Fila 3**: Banco, Tipo de Cuenta, Número de Cuenta
- **Fila 4**: Fecha de Ingreso, Cargo, Centro de Costo (dropdown con opción de crear nuevo para admin)
- **Fila 5**: Sueldo Base, Movilización, Colación (con formato de miles)
- **Fila 6**: Solicita Anticipo? (toggle switch), Monto del Anticipo (si aplica, misma fila)
- **Fila 7**: AFP, Sistema de Salud, Plan de Salud
- **Fila 8**: Tipo de Contrato, Estado

**Características:**
- Formato de miles en campos monetarios (Sueldo Base, Movilización, Colación)
- Toggle switch para "Solicita Anticipo?"
- Dropdown de centros de costo con opción de crear nuevo (solo admin)
- Validaciones según estado del trabajador

#### 2.3 Detalle de Trabajador (`/employees/[id]`)
- Vista completa de datos del trabajador
- Tabs para:
  - Préstamos
  - Vacaciones
  - Licencias médicas
  - Certificados
  - Cartas de Amonestación
- Acciones: Editar, Generar certificado
- **Restricciones según estado:**
  - **Activo**: Todas las acciones habilitadas
  - **Licencia Médica**: Solo certificados y liquidaciones habilitadas
  - **Renuncia/Despido/Inactivo**: Todas las acciones deshabilitadas (excepto ver datos)

#### 2.4 Préstamos del Trabajador (`/employees/[id]/loans`)
- Lista de préstamos del trabajador
- Acciones: Ver detalle, Ver PDF, Emitir, Cancelar
- Estado: Activo, Pagado, Cancelado

#### 2.5 Vacaciones del Trabajador (`/employees/[id]/vacations`)
- Vista de períodos de vacaciones por año
- Solicitudes de vacaciones
- Cálculo automático de días acumulados (1.25 por mes completo)
- Asignación de días a períodos (máximo 2 períodos según ley)

#### 2.6 Licencias Médicas (`/employees/[id]/medical-leaves`)
- Registro de licencias médicas
- Cálculo automático de días de licencia en períodos de liquidación

### 3. Módulo de Liquidaciones (`/payroll`)

#### 3.1 Lista de Liquidaciones
- Tabla con todas las liquidaciones
- Filtros por trabajador, período, estado
- Acciones: Ver, Editar, Eliminar, Ver PDF
- Responsive: Cards en móvil

#### 3.2 Nueva Liquidación (`/payroll/new`)
**Proceso:**
1. Selección de trabajador y período
2. **Cálculo automático de días trabajados:**
   - Campo "Días Trabajados" siempre debe ser **30 días** (convención legal chilena)
   - El sistema descuenta automáticamente:
     - Permisos sin goce de sueldo
     - Licencias médicas
   - **Días efectivos = 30 - permisos sin goce - licencias médicas**
   - Las vacaciones NO se descuentan (se pagan como días trabajados normales)
   - El sistema muestra claramente los días efectivos a calcular
3. Ingreso de haberes adicionales:
   - Bonos (imponible)
   - Horas extras (imponible)
   - Vacaciones (se pagan como días normales, no como concepto adicional)
   - Otros haberes imponibles
   - Movilización (no imponible)
   - Colación (no imponible)
   - Aguinaldo (no imponible)
4. Descuentos automáticos:
   - Préstamos activos (cuota siguiente) - **Monto autorizado completo (sin límite del 15%)**
   - Anticipos del período (firmados/pagados)
5. Cálculo automático de:
   - Haberes imponibles y no imponibles
   - Descuentos legales (AFP, Salud, Impuesto Único, Cesantía)
   - Otros descuentos (con montos autorizados completos)
   - Líquido a pagar (Total Haberes - Total Descuentos esperados)
6. Guardado de liquidación y ítems detallados

#### 3.3 Editar Liquidación (`/payroll/[id]/edit`)
- Permite modificar todos los campos editables
- Recalcula automáticamente al cambiar valores
- Actualiza la liquidación existente

#### 3.4 Liquidación Masiva (`/payroll/bulk`)
- Genera liquidaciones para múltiples trabajadores
- **Campos organizados:**
  - **Fila 1**: Año, Mes (dropdown con nombres ENERO-DICIEMBRE), Días Trabajados, Días de Licencia
  - **Sección Bonificaciones**: Título "Montos Generales de Bonificaciones"
    - Bonos: Dropdown de bonos disponibles, campo de monto (aplica a todos)
    - Horas Extra: Alerta con número de trabajadores con/sin pacto, lista desplegable de pendientes
  - **Fila adicional**: Movilización, Colación, Anticipo, Vacaciones
- Todos los campos monetarios con formato de miles
- Usa valores por defecto configurables
- Permite ajustes individuales
- Cálculo automático de horas extra por trabajador según su sueldo y términos del contrato

#### 3.5 Lista de Liquidaciones (`/payroll`) - Mejorado
**Cards de Resumen (arriba de filtros):**
1. **Total Líquido a Pagar**: Suma de liquidaciones emitidas/enviadas del período seleccionado
2. **Total Imposiciones**: Descuentos legales + Aportes del empleador (AFP, SIS, AFC)
3. **Liquidaciones Pendientes**: Trabajadores activos sin liquidación del mes en curso
4. **Liquidaciones Atrasadas**: Trabajadores activos sin liquidación del mes anterior

**Filtros Mejorados:**
- Trabajador, Año, Mes, Estado
- Botón "Actualizar" en la misma fila que el título "Filtros"
- Diseño compacto y responsive

**Tabla de Liquidaciones:**
- Columnas: Trabajador, RUT, Período, Días Trabajados, **Total Haberes**, **Total Descuentos**, Líquido a Pagar, Estado, Acciones
- Valores tomados directamente de la liquidación (independiente del estado)
- Vista responsive: tabla en desktop, cards en mobile
- Acciones: Ver detalle, Eliminar (con restauración de anticipos vinculados)

**Gráfico Histórico Anual:**
- Gráfico de líneas suavizadas con histórico desde la primera liquidación
- Dos líneas: Total Haberes (azul) y Líquido Pagado (verde)
- Vista anual agrupada por año
- Solo muestra liquidaciones emitidas/enviadas
- Tooltip con formato de moneda chilena
- Eje Y en millones para mejor legibilidad
- Se muestra después de los filtros y antes de la tabla

#### 3.6 Detalle de Liquidación (`/payroll/[id]`)
- Vista completa de la liquidación
- Desglose de haberes y descuentos
- Desglose expandible de préstamos y anticipos
- Acciones: Editar, Emitir, Enviar por correo, Ver PDF

### 4. Módulo de Anticipos (`/advances`)

#### 4.1 Lista de Anticipos
- Tabla con todos los anticipos
- Filtros por trabajador, período, estado
- Cards de estadísticas:
  - Total a pagar (período actual)
  - Proyección mes siguiente (promedio últimos 3 meses)
  - Anticipos pendientes
- Acciones: Ver, Editar, Eliminar, Ver PDF, Cambiar estado

#### 4.2 Nuevo Anticipo (`/advances/new`)
**Campos organizados en filas:**
- **Fila 1**: Trabajador, Período de Descuento (YYYY-MM)
- **Fila 2**: Fecha del Anticipo, Monto (con formato de miles), Medio de Pago
- **Fila 3**: Motivo / Glosa (campo completo)

**Características:**
- Formato de miles en campo de monto
- Validación: Máximo 50% del sueldo base (con alerta si se excede)
- Medio de pago: transferencia o efectivo

#### 4.3 Anticipos Masivos (`/advances/bulk`)
- Crear anticipos para todos los trabajadores activos
- Valores por defecto configurables
- Permite edición individual antes de guardar

#### 4.4 Integración con Liquidaciones
- Anticipos "firmados" o "pagados" se suman automáticamente en liquidaciones
- Se marcan como "descontado" al generar liquidación
- Se vinculan a la liquidación (`payroll_slip_id`)
- Si se elimina la liquidación, los anticipos vuelven a estado activo

### 5. Módulo de Préstamos (`/loans`)

#### 5.1 Gestión Global de Préstamos (`/loans`)
- Vista consolidada de todos los préstamos activos y cancelados
- Cards de estadísticas:
  - Monto pendiente a pago
  - Monto prestado (mes actual)
  - Préstamos activos
- Tabla con información completa:
  - ID Préstamo (PT-##)
  - Trabajador y RUT
  - Fecha, montos, cuotas
  - Cuotas pagadas vs total
  - Monto pendiente
  - Estado
- Acciones: Ver detalle, Ver PDF, Ver trabajador, Eliminar (solo cancelados)

#### 5.2 Préstamos por Trabajador (`/employees/[id]/loans`)
- Lista de préstamos del trabajador específico
- Historial de pagos
- Acciones: Ver, PDF, Emitir, Cancelar

#### 5.3 Nuevo Préstamo (`/employees/[id]/loans/new`)
**Campos:**
- Monto del préstamo (con formato de miles)
- Tasa de interés (%)
- Número de cuotas
- Fecha del préstamo (calendario chileno)
- Descripción (opcional)
- **Genera automáticamente**: ID correlativo (PT-##)

**Cálculos:**
- Monto total = Monto × (1 + interés%)
- Monto por cuota = Monto total / Número de cuotas
- Redondeo hacia arriba en todos los cálculos

#### 5.4 Integración con Liquidaciones
- Préstamos activos se descuentan automáticamente en liquidaciones
- Se registra el pago en `loan_payments`
- Se actualiza `paid_installments` y `remaining_amount`
- Se vincula a la liquidación

### 6. Módulo de Vacaciones (`/vacations`)

#### 6.1 Dashboard de Vacaciones (`/vacations`)
- Vista consolidada de vacaciones de todos los trabajadores
- Cards de estadísticas:
  - Trabajadores con múltiples períodos
  - Total días acumulados
  - Trabajadores con saldo negativo
- Tabla ordenable por:
  - Total acumulado
  - Total usado
  - Total disponible
  - Períodos
- Acciones: Ver detalle del trabajador

#### 6.2 Vacaciones por Trabajador (`/employees/[id]/vacations`)
- Vista de períodos de vacaciones por año
- Solicitudes de vacaciones
- Cálculo automático de días acumulados
- Asignación de días a períodos (más antiguo primero)

**Reglas de Cálculo:**
- 1.25 días hábiles por mes completo trabajado
- Un mes se considera completo cuando se alcanza el mismo día del mes siguiente
- Máximo 2 períodos (60 días) según ley chilena
- Permite días negativos (períodos futuros)

### 7. Módulo de Configuración (`/settings`)

#### 7.1 Configuración General
- Datos de la empresa
- Accesos a sub-módulos

#### 7.2 Indicadores Previsionales (`/settings/indicators`)
- Vista de indicadores cargados desde API Previred
- Cache por mes/año
- Actualización manual

#### 7.3 Tramos de Impuesto Único (`/settings/tax-brackets`)
- Vista de tramos cargados
- Historial de versiones (desplegable)
- Scraper manual del SII
- Vista por mes/año y tipo de período

### 8. Sistema de Alertas

#### 8.1 Alert Engine (`lib/services/alertEngine.ts`)
**Reglas implementadas:**
1. **Contract Expiry**: Alerta cuando contrato plazo fijo vence en ≤30 días (high) o ≤10 días (critical)
2. **High Vacation Balance**: Alerta si saldo de vacaciones ≥20 días (high) o ≥30 días (critical)
3. **Missing Legal Parameters**: Alerta critical si faltan parámetros legales del mes actual o siguiente
4. **Active Medical Leaves**: Alerta info/high si hay licencia médica activa

#### 8.2 UI de Alertas
- FAB flotante (esquina inferior derecha)
- Badge con número de alertas activas
- Animación bounce solo cuando hay alertas
- Drawer con tabs: Críticas, Importantes, Info
- Acciones: Ir a entidad, Marcar como resuelta, Ocultar

#### 8.3 Ejecución
- API Route: `/api/alerts/run` (requiere admin)
- Preparado para ejecución automática (cron)

---

## 🧮 Cálculos y Lógica de Negocio

### 1. Cálculo de Liquidación (`lib/services/payrollCalculator.ts`)

#### 1.1 Haberes Imponibles

**Sueldo Base Proporcional:**
```
Sueldo Base Proporcional = (Sueldo Base / 30) × Días Efectivos
Días Efectivos = 30 - Permisos sin goce - Licencias médicas
```
- **IMPORTANTE:** El campo "Días Trabajados" siempre debe ser **30 días** (convención legal)
- El sistema descuenta automáticamente permisos sin goce y licencias médicas
- Las vacaciones NO se descuentan (se pagan como días trabajados normales)
- Redondeo hacia arriba

**Gratificación Mensual:**
```
Gratificación = MIN(Sueldo Base × 25%, Tope Gratificación)
Tope Gratificación = (4.75 × Salario Mínimo) / 12
```
- Se obtiene del indicador `RMITrabDepeInd` de Previred

**Base Imponible:**
```
Base Imponible = Sueldo Base Proporcional + Gratificación Mensual
```

**Otros Haberes Imponibles:**
- Bonos
- Horas Extras
- Vacaciones (se pagan como días normales)
- Otros haberes imponibles (campo adicional)

#### 1.2 Haberes No Imponibles
- Movilización
- Colación
- Aguinaldo

#### 1.3 Descuentos Legales

**AFP (Fondo de Pensiones):**
```
AFP Total = Base Imponible × Tasa AFP
```
- Tasa AFP: Se obtiene de API Previred según AFP del trabajador
- Ejemplo: Provida Diciembre 2025 = 11.45%
- Incluye el 10% base + comisión adicional
- **Unificado en un solo concepto**

**Salud:**
```
Si FONASA:
  Salud = Base Imponible × 7%

Si ISAPRE:
  Salud = Monto UF × Valor UF del día
  Valor UF = indicators.UFValPeriodo
```
- **NO se suma el 7% para ISAPRE**, se reemplaza completamente
- El 7% es solo para FONASA

**Seguro de Cesantía (AFC):**
```
Cesantía = Base Imponible × Tasa AFC
```
- Tasa según tipo de contrato:
  - Indefinido: Se obtiene de `AFCCpiTrabajador` (ej: 0.6%)
  - Plazo fijo: Se obtiene de `AFCCpfTrabajador` (ej: 0%)
  - Temporal: Se obtiene de `AFCTcpTrabajador` (ej: 0%)

**Impuesto Único de Segunda Categoría:**
```
RLI = Base Imponible - AFP - Salud - Cesantía
Impuesto Único = (RLI × Factor) - Rebaja
```
- Se obtienen tramos de la tabla `tax_brackets`
- Se busca el tramo donde: `desde < RLI <= hasta`
- Si RLI <= límite exento: Impuesto = 0
- Si hasta es null ("Y MÁS"): Se aplica el último tramo
- Redondeo hacia arriba

**Lógica de Búsqueda de Tramos:**
1. Intenta obtener tramos del mes solicitado
2. Si no hay, intenta tramos del mes actual
3. Si no hay, usa valores por defecto (fallback)

#### 1.4 Otros Descuentos

**Préstamos:**
- Suma de cuotas pendientes de préstamos activos
- **IMPORTANTE:** Se usa el monto autorizado completo (`installment_amount`) del préstamo
- **NO se aplica límite del 15%** si el trabajador autorizó un monto mayor
- Se registra en `loan_payments`
- Se actualiza estado del préstamo
- En la visualización se muestra el monto autorizado con referencia "(Autorizado: $XXX)"

**Anticipos:**
- Suma de anticipos "firmados" o "pagados" del período
- No descontados previamente
- Se marcan como "descontado" al guardar liquidación

**Préstamos Manuales:**
- Campo adicional para préstamos no registrados en el sistema
- Se muestran como "Otros Préstamos" en el detalle y PDF

#### 1.5 Totales

```
Total Haberes Imponibles = Suma de todos los haberes imponibles
Total Haberes No Imponibles = Suma de todos los haberes no imponibles
Total Haberes = Total Haberes Imponibles + Total Haberes No Imponibles

Total Descuentos Legales = AFP + Salud + Cesantía + Impuesto Único
Total Otros Descuentos = Préstamos (montos autorizados) + Anticipos + Otros Préstamos Manuales

Total Descuentos = Total Descuentos Legales + Total Otros Descuentos

Líquido a Pagar = Total Haberes - Total Descuentos (esperados, sin límite del 15%)
```

**IMPORTANTE sobre Préstamos:**
- Los préstamos se muestran y calculan con el **monto autorizado completo** (`installment_amount`)
- No se aplica límite del 15% si el trabajador autorizó un monto mayor al momento de crear el préstamo
- El texto legal en el PDF indica: "se descontarán conforme la autorización del trabajador y empleador"

**Redondeo:**
- Todos los cálculos monetarios usan `Math.ceil()` (redondeo hacia arriba)
- No se consideran decimales en los resultados finales

### 2. Cálculo de Vacaciones (`lib/services/vacationPeriods.ts`)

#### 2.1 Acumulación de Días
```
Días Acumulados = Meses Completos Trabajados × 1.25
```

**Cálculo de Meses Completos:**
- Un mes se considera completo cuando se alcanza el mismo día del mes siguiente
- Ejemplo: Ingreso 4 de marzo → acumula 1.25 días el 4 de abril
- Si hoy es 3 de abril, aún no ha completado el mes (0 días)

**Lógica:**
```typescript
function calculateCompleteMonthsWorked(hireDate, referenceDate) {
  // Calcular diferencia en años, meses y días
  yearsDiff = referenceDate.year - hireDate.year
  monthsDiff = referenceDate.month - hireDate.month
  daysDiff = referenceDate.day - hireDate.day
  
  completeMonths = yearsDiff * 12 + monthsDiff
  
  // Si el día de referencia es menor al día de ingreso, restar 1 mes
  if (daysDiff < 0) {
    completeMonths -= 1
  }
  
  return Math.max(0, completeMonths)
}
```

#### 2.2 Períodos de Vacaciones
- Se crean períodos por año de servicio
- Máximo 2 períodos activos (60 días según ley)
- Los días se asignan al período más antiguo primero
- Permite días negativos (períodos futuros)

#### 2.3 Asignación de Días
- Al crear solicitud de vacaciones, se asignan días al período más antiguo
- Si el período más antiguo se agota, se usa el siguiente
- Se actualiza `used_days` y `available_days` del período

### 3. Cálculo de Aportes del Empleador

**AFP Empleador:**
```
AFP Empleador = Base Imponible × 0.1%
```
- Tasa fija según normativa

**SIS (Seguro de Invalidez y Sobrevivencia):**
```
SIS = Base Imponible × Tasa SIS
```
- Se obtiene de `indicators.TasaSIS` (ej: 1.49%)

**AFC Empleador:**
```
AFC = Base Imponible × Tasa AFC Empleador
```
- Tasa según tipo de contrato:
  - Indefinido: `AFCCpiEmpleador` (ej: 2.4%)
  - Plazo fijo: `AFCCpfEmpleador` (ej: 3.0%)
  - Temporal: `AFCTcpEmpleador` (ej: 3.0%)

**Total Aportes Empleador:**
```
Total = AFP Empleador + SIS + AFC Empleador
```

---

## 📄 Generación de PDFs

### Sistema de Generación Automática de PDFs

#### Generación al Emitir Liquidación
- Al emitir una liquidación (cambiar estado a "issued"), se genera automáticamente el PDF
- El PDF se guarda en Supabase Storage (`signed-documents/{company_id}/payroll/{slip_id}.pdf`)
- La URL pública del PDF se guarda en `payroll_slips.pdf_url`
- API Route: `/api/payroll/[id]/generate-pdf` (POST)
- Flujo: Cliente genera PDF con `@react-pdf/renderer` → envía blob al servidor → servidor guarda en Storage → actualiza `pdf_url`

#### Visualización de PDFs
- **Liquidaciones**: `/payroll/[id]/pdf`
  - Si existe `pdf_url`, muestra el PDF guardado en un `<iframe>`
  - Si no existe `pdf_url`, genera el PDF dinámicamente
  - Layout sin contenedor (solo PDF visible)
- **Pactos de horas extra**: `/overtime/[id]/pdf`
  - Misma lógica que liquidaciones
- **Anexos de contrato**: `/contracts/annex/[id]/pdf`
  - Misma lógica que liquidaciones

#### Políticas RLS para Storage
- Migración `071_storage_policies_signed_documents.sql`
- Permite a usuarios autenticados subir, leer, actualizar y eliminar archivos en `signed-documents`
- Estructura de carpetas: `{company_id}/payroll/`, `{company_id}/certificates/`, etc.

### 1. Liquidación de Sueldo (`components/PayrollPDF.tsx`)

**Estructura:**
- Encabezado: Datos de la empresa
- Título: "LIQUIDACIÓN DE SUELDO"
- Datos del trabajador (2 columnas)
- Tres columnas principales:
  - **Haberes**: Imponibles y no imponibles
  - **Descuentos**: Legales y otros (con desglose de préstamos y anticipos)
  - **Información**: Sueldo base, líquido, días trabajados, bases imponibles
- Resumen: Líquido a pagar (en número y palabras)
- Firmas: Trabajador y empresa

**Nombre de archivo:**
```
LIQUIDACIÓN-{RUT}-{MES}-{AÑO}.pdf
Ejemplo: LIQUIDACIÓN-18.968.229-8-DIC-2025.pdf
```

**Desglose de Préstamos en PDF:**
- Muestra cada préstamo con ID (PT-##) y cuota pagada/total
- Ejemplo: "PT-01 - Cuota 2/12 $125.000"
- **IMPORTANTE:** Se muestra el monto autorizado completo (`installment_amount`), no el monto limitado por el 15%

**Desglose de Anticipos en PDF:**
- Muestra cada anticipo con fecha y monto

**Texto Legal en PDF:**
- Los descuentos voluntarios (préstamos, anticipos) se descontarán conforme la autorización del trabajador y empleador, considerando lo establecido en el Código del Trabajo.
- Ya no se menciona el límite del 15% ya que los préstamos pueden estar autorizados para montos mayores.

### 2. Préstamo Interno (`components/LoanPDF.tsx`)

**Estructura:**
- Encabezado: Datos de la empresa
- Título: "CONTRATO DE PRÉSTAMO INTERNO"
- Datos del trabajador (2 columnas, texto pequeño)
- Términos del préstamo (2 columnas, texto pequeño):
  - Columna izquierda: Fecha, Monto solicitado, Tasa de interés
  - Columna derecha: Monto total a pagar, Valor por cuota, Número de cuotas
- Tabla de cuotas con:
  - Cuota
  - **Período** (mes/año en que se pagará)
  - Monto
  - Estado (Pagada/Pendiente)
- Texto legal
- Firmas: Trabajador y empresa
- ID del préstamo (PT-##) en esquina superior derecha (debajo del paginador)

**Nombre de archivo:**
```
PREST.INT-{RUT}-{MES}-{AÑO}.pdf
Ejemplo: PREST.INT-18.968.229-8-DIC-2025.pdf
```

### 3. Solicitud de Vacaciones (`components/VacationPDF.tsx`)

**Estructura:**
- Encabezado: Datos de la empresa
- Título: "SOLICITUD DE VACACIONES"
- Datos del trabajador
- Período de vacaciones (fechas inicio/fin)
- Días hábiles
- Período al que se descuentan los días (si aplica)
- Firmas: Trabajador y empresa

**Nombre de archivo:**
```
VACACIONES-{RUT}-{MES}-{AÑO}.pdf
```

### 4. Anticipo de Remuneración (`components/AdvancePDF.tsx`)

**Estructura:**
- Encabezado: Datos de la empresa
- Título: "ANTICIPO DE REMUNERACIÓN"
- Datos del trabajador
- Fecha y monto (en número y palabras)
- Glosa: "Anticipo de remuneración / Quincena"
- Cláusula de descuento en liquidación
- Firmas: Trabajador y empresa

**Nombre de archivo:**
```
ANTICIPO-{RUT}-{MES/AÑO}-{ID}.pdf
```

### 5. Certificado de Trabajo (`components/CertificatePDF.tsx`)

**Estructura:**
- Encabezado: Datos de la empresa
- Título: "CERTIFICADO DE TRABAJO"
- Datos del trabajador
- Período de trabajo
- Cargo
- Firmas: Empresa

### 6. Registro de Accidente RAAT (`components/AccidentPDFDocument.tsx`)

**Estructura:**
- Encabezado: Datos de la empresa
- Título: "REGISTRO DE ACCIDENTE DEL TRABAJO"
- Identificación del evento:
  - Número de accidente
  - Fecha y hora
  - Lugar
  - Tipo de evento
- Datos del trabajador (snapshot histórico):
  - Nombre completo y RUT
  - Centro de costo
  - Cargo
  - Tipo de contrato
  - Departamento
- Descripción técnica:
  - Labor que realizaba
  - Descripción detallada
  - Peligros identificados
  - Parte del cuerpo afectada
  - Tipo de lesión
  - Posibles secuelas
- Testigos (lista)
- Acciones inmediatas:
  - Acciones tomadas
  - Traslado médico (si aplica)
- Notificación:
  - Fecha y hora de notificación
- Estado DIAT:
  - Número de DIAT (si enviado)
  - Fecha de envío
- Disclaimers legales
- Firmas: Trabajador y empresa

**Nombre de archivo:**
```
RAAT-{NUMERO}-{RUT}-{FECHA}.pdf
Ejemplo: RAAT-001-18.968.229-8-2025-01-15.pdf
```

---

## 🔌 APIs y Servicios Externos

### 1. API Previred (Gael Cloud)

**Endpoint:**
```
https://api.gael.cloud/general/public/clima
```

**Uso:**
- Obtiene indicadores previsionales mensuales
- Cache en tabla `previred_indicators`
- Servicio: `lib/services/previredAPI.ts`

**Indicadores Obtenidos:**
- UF (Valor del día)
- UTM, UTA
- Salario Mínimo
- Tope Imponible
- Tasas AFP (por administradora)
- Tasas AFC (por tipo de contrato)
- Tasa SIS
- Y más...

**Funciones Principales:**
- `getPreviredIndicators(month, year)`: Obtiene indicadores de la API
- `getCachedIndicators(year, month)`: Obtiene desde cache o API
- `getAFPRate(afp, indicators)`: Obtiene tasa AFP según administradora
- `getSISRate(indicators)`: Obtiene tasa SIS
- `getUnemploymentInsuranceEmployerRate(contractType, indicators)`: Obtiene tasa AFC empleador
- `getUnemploymentInsuranceEmployeeRate(contractType, indicators)`: Obtiene tasa AFC trabajador

### 2. Scraper SII (Tramos de Impuesto Único)

**Endpoint:**
```
https://www.sii.cl/valores_y_fechas/impuesto_segunda_categoria/impuesto_segunda_categoria.htm
```

**Uso:**
- Scraping web del sitio del SII
- Extrae tramos de impuesto único por mes/año
- Guarda en tabla `tax_brackets`
- Servicio: `lib/services/taxBracketsScraper.ts`

**Tipos de Períodos:**
- MENSUAL
- QUINCENAL
- SEMANAL
- DIARIO

**Estructura de Tramos:**
```json
{
  "desde": number | null,  // null para tramo exento
  "hasta": number | null,  // null para "Y MÁS"
  "factor": number,        // Factor multiplicador
  "cantidad_rebajar": number,  // Rebaja
  "tasa_efectiva": string  // Tasa efectiva (ej: "4%")
}
```

**Funciones:**
- `scrapeTaxBrackets(year, month)`: Scrapea tramos del SII
- `extractBracketsFromTable(html, periodType)`: Extrae tramos de tabla HTML
- `saveTaxBrackets(year, month, brackets)`: Guarda en BD (con historial)
- `getTaxBrackets(year, month, periodType)`: Obtiene tramos de BD (última versión)

**Ejecución Automática:**
- Cron job configurado en `vercel.json`
- Se ejecuta el día 1 de cada mes a las 00:00
- Scrapea mes actual y mes siguiente

### 3. API Routes Internas

#### `/api/payroll/[id]/generate-pdf`
- **Método**: POST
- **Autenticación**: Requerida
- **Funcionalidad**: Recibe PDF como blob desde el cliente y lo guarda en Storage
- **Body**: `FormData` con campo `pdf` (File)
- **Proceso**:
  1. Verifica autenticación
  2. Obtiene `company_id` desde la liquidación
  3. Sube PDF a Storage: `{company_id}/payroll/{slip_id}.pdf`
  4. Obtiene URL pública del PDF
  5. Actualiza `payroll_slips.pdf_url` en la base de datos
- **Respuesta**: `{ pdf_url: string }`
- **RLS**: Requiere política para actualizar `pdf_url` (migración `070`)

#### `/api/alerts`
- `GET`: Obtiene alertas por empresa
- `POST /api/alerts/[id]/resolve`: Marca alerta como resuelta
- `POST /api/alerts/[id]/dismiss`: Oculta alerta
- `POST /api/alerts/run`: Ejecuta Alert Engine (requiere admin)

#### `/api/tax-brackets`
- `GET`: Obtiene tramos de impuesto único
- `POST /api/tax-brackets/scrape`: Scrapea tramos manualmente
- `POST /api/tax-brackets/scrape-scheduled`: Scrapea automáticamente (cron)

#### `/api/admin/*`
- Crear, eliminar usuarios
- Resetear contraseñas

---

## 🔐 Variables de Entorno

### Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_aqui
```

### Opcionales

```env
# Para cron jobs de Vercel
CRON_SECRET=tu_secreto_aqui

# Para Asistente IA (Gemini)
GEMINI_API_KEY=tu_api_key_de_gemini
GEMINI_MODEL=gemini-2.5-flash  # Modelo por defecto
```

---

## 🔄 Flujos de Trabajo

### 1. Flujo de Liquidación Mensual

1. **Preparación:**
   - Verificar indicadores previsionales cargados
   - Verificar tramos de impuesto único del mes
   - Revisar alertas del sistema

2. **Generación Individual:**
   - Seleccionar trabajador y período
   - Sistema calcula automáticamente:
     - Días trabajados (descontando licencias)
     - Haberes base
     - Descuentos legales
     - Préstamos y anticipos pendientes
   - Usuario ajusta haberes adicionales si es necesario
   - Revisa cálculo y guarda

3. **Generación Masiva:**
   - Seleccionar período
   - Sistema genera para todos los trabajadores activos
   - Permite ajustes individuales
   - Guarda todas las liquidaciones

4. **Emisión:**
   - Revisar liquidaciones en estado "Borrador"
   - Emitir (cambia a "Emitida")
   - Generar PDFs
   - Enviar a trabajadores (opcional)

### 2. Flujo de Anticipos

1. **Creación:**
   - Seleccionar trabajador o crear masivo
   - Ingresar monto, período, fecha
   - Validación: Máximo 50% del sueldo base

2. **Aprobación:**
   - Generar PDF
   - Firmar (cambiar estado a "Firmado")
   - Pagar (cambiar estado a "Pagado")

3. **Descuento en Liquidación:**
   - Al generar liquidación, se suman automáticamente
   - Se marcan como "Descontado"
   - Se vinculan a la liquidación

4. **Reversión:**
   - Si se elimina la liquidación, los anticipos vuelven a "Pagado"

### 3. Flujo de Préstamos (Actualizado)

**Creación:**
1. Ir a `/employees/[id]/loans/new`
2. Completar formulario (monto, interés, cuotas, fecha, descripción)
3. Sistema calcula automáticamente: total, valor por cuota, monto pendiente
4. Guardar préstamo

**Edición (solo si no tiene pagos):**
1. Ir a `/employees/[id]/loans/[loanId]`
2. Hacer clic en "Editar"
3. Modificar campos permitidos (fecha, monto, interés, cuotas, descripción)
4. Sistema recalcula automáticamente totales
5. Guardar cambios

**Cancelación:**
1. Ir a `/employees/[id]/loans/[loanId]`
2. Hacer clic en "Cancelar"
3. Confirmar cancelación
4. El préstamo cambia a estado "Cancelado"

**Eliminación (solo si no tiene pagos):**
1. Ir a `/employees/[id]/loans/[loanId]`
2. Hacer clic en "Eliminar" (solo visible si está cancelado o activo sin pagos)
3. Confirmar eliminación
4. El préstamo se elimina permanentemente

**Flujo Original:**

1. **Creación:**
   - Ingresar datos del préstamo
   - Sistema genera ID correlativo (PT-##)
   - Calcula monto total y cuota

2. **Emisión:**
   - Generar PDF del contrato
   - Emitir préstamo

3. **Pago de Cuotas:**
   - Al generar liquidación, se descuenta cuota siguiente
   - Se registra en `loan_payments`
   - Se actualiza estado del préstamo

4. **Finalización:**
   - Cuando `paid_installments === installments`, estado cambia a "Pagado"
   - Si se cancela, estado cambia a "Cancelado"
   - Préstamos cancelados se pueden eliminar

### 4. Flujo de Vacaciones

1. **Acumulación Automática:**
   - Sistema calcula días acumulados mensualmente
   - Crea períodos por año de servicio
   - Máximo 2 períodos activos

2. **Solicitud:**
   - Trabajador solicita vacaciones
   - Sistema asigna días al período más antiguo
   - Permite días negativos (períodos futuros)

3. **Aprobación:**
   - Aprobar solicitud
   - Generar PDF
   - Actualizar días usados del período

### 5. Flujo de Alertas

1. **Generación:**
   - Alert Engine se ejecuta (manual o automático)
   - Revisa condiciones para cada regla
   - Crea/actualiza alertas idempotentemente

2. **Notificación:**
   - FAB muestra badge con número de alertas
   - Usuario hace clic para ver detalles

3. **Resolución:**
   - Usuario puede ir a la entidad relacionada
   - Marcar como resuelta
   - Ocultar alerta

---

## 📊 Módulo de Reportes

### Descripción General
Sistema completo de generación de reportes ejecutivos en PDF y análisis detallados en Excel/CSV, con filtros avanzados por empresa, centro de costo, período, estado, tipo de contrato, AFP y sistema de salud.

### Estructura
- **Dashboard**: `/reports` - Vista general con cards de acceso a cada reporte
- **Reportes individuales**: Cada reporte tiene su propia ruta con filtros y exportación

### Tipos de Reportes

#### 1. Reporte de Dotación y Distribución (`/reports/headcount`)
**Descripción**: Información de trabajadores agrupada por centro de costo, AFP, sistema de salud y tipo de contrato.

**Filtros:**
- Empresa
- Centro de costo
- Período (mes/año)
- Estado del trabajador
- Tipo de contrato
- AFP
- Sistema de salud

**Exportación:**
- PDF: Vista ejecutiva con gráficos y tablas resumidas
- Excel/CSV: Datos detallados por trabajador

#### 2. Reporte de Trabajadores con Información de Sueldo (`/reports/salary`)
**Descripción**: Lista de trabajadores con remuneraciones fijas y análisis por centro de costo y cargo.

**Filtros:**
- Empresa
- Centro de costo
- Período (mes/año)
- Estado
- Cargo

**Exportación:**
- PDF: Vista ejecutiva con análisis de sueldos
- Excel/CSV: Datos detallados con sueldos base, movilización, colación

#### 3. Reporte de Estados Laborales y Licencias Médicas (`/reports/leaves`)
**Descripción**: Trabajadores con licencias médicas activas e historial de días de licencias.

**Filtros:**
- Empresa
- Centro de costo
- Período (mes/año)
- Estado del trabajador
- Estado de licencia (activa/inactiva)

**Exportación:**
- PDF: Vista ejecutiva con resumen de licencias
- Excel/CSV: Detalle de licencias con fechas, días, folios

#### 4. Reporte de Cargos y Estructura Organizacional (`/reports/organizational`)
**Descripción**: Número de trabajadores por cargo y centro de costo.

**Filtros:**
- Empresa
- Centro de costo
- Período (mes/año)

**Exportación:**
- PDF: Vista ejecutiva con organigrama y distribución
- Excel/CSV: Matriz de cargos vs centros de costo

#### 5. Reporte de Remuneraciones Mensuales (`/reports/payroll`)
**Descripción**: Vista gerencial de liquidaciones con masas salariales por centro de costo.

**Filtros:**
- Empresa
- Centro de costo
- Período (mes/año)
- Estado de liquidación

**Exportación:**
- PDF: Vista ejecutiva con gráficos de masas salariales
- Excel/CSV: Detalle de liquidaciones con haberes y descuentos

#### 6. Reporte de Préstamos y Anticipos (`/reports/loans-advances`)
**Descripción**: Monto prestado, saldo pendiente y anticipos por trabajador y centro de costo.

**Filtros:**
- Empresa
- Centro de costo
- Período (mes/año)
- Estado de préstamo/anticipo

**Exportación:**
- PDF: Vista ejecutiva con resumen de deudas
- Excel/CSV: Detalle de préstamos y anticipos con cuotas y pagos

### Implementación Técnica
- **Servicios**: `lib/services/reports/*.ts` - Lógica de consulta y agregación
- **Componentes PDF**: `components/reports/*PDF.tsx` - Generación de PDFs ejecutivos
- **API Routes**: Endpoints para exportación CSV/Excel
- **Filtros**: Componente reutilizable `ReportFilters.tsx`

### Seguridad
- Todos los reportes respetan RLS (Row Level Security)
- Filtrado automático por `company_id` y `cost_center_id` según permisos del usuario
- Usuarios admin ven todos los centros de costo
- Usuarios restringidos ven solo sus centros asignados

---

## 🤖 Asistente IA (Gemini)

### Descripción General
Asistente de inteligencia artificial integrado con Google Gemini API que permite realizar consultas sobre datos del sistema en lenguaje natural.

### Características
- **Chat interactivo**: Widget flotante con historial de conversación
- **Contexto inteligente**: Construcción automática de contexto según la pregunta
- **Rate limiting**: 50 consultas por usuario por hora
- **Logging**: Registro de todas las consultas en `ai_queries`

### Arquitectura

#### Cliente Gemini (`lib/services/geminiClient.ts`)
- SDK oficial `@google/genai`
- Modelo por defecto: `gemini-2.5-flash`
- Singleton pattern para el cliente
- Manejo robusto de errores

#### Constructor de Contexto (`lib/services/aiContextBuilder.ts`)
**Estrategia de contexto en capas:**

1. **Contexto Base** (`buildBaseContext`): Siempre incluido
   - Resumen general de trabajadores (activos, por estado)
   - Resumen de liquidaciones recientes
   - Resumen de licencias médicas activas
   - Resumen de pactos de horas extra
   - Datos adicionales: contratos, préstamos, anticipos, permisos, bonos

2. **Contexto Específico** (`buildContextFromQuestion`): Detecta keywords y agrega contexto relevante
   - **Trabajadores**: Lista completa con nombres, RUTs, sueldos, cargos
   - **Licencias médicas**: Detalle completo con días restantes
   - **Vacaciones**: Días acumulados, usados, disponibles por trabajador
   - **Préstamos**: Estado, cuotas pagadas, monto pendiente
   - **Anticipos**: Montos, períodos, estados
   - **Pactos de horas extra**: Trabajadores con/sin pacto activo
   - **Centros de costo**: Distribución de trabajadores y masas salariales
   - **AFP/Salud**: Distribución y trabajadores con datos faltantes
   - **Estados laborales**: Contrataciones, salidas, contratos por vencer
   - **Cumplimiento**: Datos incompletos, sueldos bajo mínimo, inconsistencias
   - **Finiquitos**: Detalles de finiquitos recientes y pendientes

#### API Endpoint (`/api/ai/ask`)
- **Método**: POST
- **Autenticación**: Requerida (Supabase Auth)
- **Body**: `{ question: string, companyId: string, context?: { employeeId?, periodId? } }`
- **Rate limiting**: Verificación antes de procesar
- **Respuesta**: `{ answer: string }`

#### UI Component (`components/AIChatWidget.tsx`)
- Widget flotante con icono de robot
- Historial de conversación con scroll
- Input de texto con botón enviar
- Estados de carga y error
- Integrado en `Layout.tsx`

### Limitaciones y Protecciones
- **Rate limiting**: 50 consultas por usuario por hora (in-memory)
- **Sanitización**: Limpieza de input del usuario (máximo 2000 caracteres)
- **Control de datos**: No se envían datos excesivamente sensibles
- **Logging**: Todas las consultas se registran para auditoría

### Endpoints Adicionales
- `/api/ai/test`: Test de conexión con Gemini (desarrollo)
- `/api/ai/reset-rate-limit`: Reset manual del rate limit (desarrollo)

---

## 📄 Módulo de Contratos y Anexos

### Descripción General
Gestión completa de contratos laborales con cláusulas editables y sistema de anexos para modificaciones contractuales.

### Funcionalidades de Contratos

#### Crear Contrato (`/contracts/new`)
**Campos principales:**
- Selección de trabajador (con validaciones)
- Tipo de contrato: indefinido, plazo fijo, obra/faena, part-time
- Fechas: inicio y fin (si aplica)
- Cargo y descripción de funciones
- Horario de trabajo (configurable)
- Lugar de trabajo
- Remuneraciones:
  - Sueldo base
  - Gratificación legal (toggle switch)
  - Monto fijo de gratificación (si aplica)
  - Otros bonos (lista dinámica con dropdown)
- Datos bancarios (en una fila)
- 15 cláusulas editables con botón "Regenerar"

**Validaciones:**
- No puede crear nuevo contrato si trabajador tiene contrato activo
- No puede crear contrato si trabajador está en "despido" o "renuncia" sin finiquito aprobado
- No puede crear contrato en borrador si trabajador está activo
- Sugiere crear anexos si hay contrato activo

#### Editar Contrato (`/contracts/[id]/edit`)
- Misma interfaz que creación
- Carga datos existentes
- Permite modificar todas las cláusulas

#### Detalle de Contrato (`/contracts/[id]`)
- Vista completa del contrato
- Acciones: Editar, Ver PDF, Terminar contrato
- Historial de anexos relacionados

#### Terminar Contrato
- Modal para recopilar datos de terminación
- Campos: fecha, causal, aviso previo, notas
- Crea pre-finiquito automáticamente
- Cambia estado del trabajador a "despido"

### Funcionalidades de Anexos

#### Crear Anexo (`/contracts/annex/new`)
**Tipos de anexo:**
- Modificación de sueldo
- Cambio de cargo
- Cambio de jornada
- Prórroga
- Otro

**Características:**
- 6 cláusulas editables con toggle switch para activar/desactivar
- Botón "Regenerar" para cada cláusula
- Contenido se almacena como JSON con estado de cada cláusula
- Pre-llenado automático basado en contrato y datos del trabajador

#### Editar Anexo (`/contracts/annex/[id]/edit`)
- Misma interfaz que creación
- Carga cláusulas existentes desde JSON
- Permite modificar y activar/desactivar cláusulas

### Generación de PDFs
- **Contratos**: PDF completo con todas las cláusulas
- **Anexos**: PDF con solo las cláusulas activadas
- Formato legal chileno
- Firmas de trabajador y empresa

### Integración con Otros Módulos
- **Finiquitos**: Al terminar contrato se crea pre-finiquito
- **Trabajadores**: Cambia estado automáticamente
- **Liquidaciones**: Usa datos del contrato activo

---

## 🔔 Sistema de Notificaciones

### Descripción General
Sistema de notificaciones en tiempo real que alerta sobre eventos importantes del sistema.

### Componente UI (`components/NotificationsDropdown.tsx`)
- Botón en el header junto al login
- Badge con número de notificaciones no leídas
- Dropdown desplegable con lista de notificaciones
- Cierre automático al hacer click fuera

### Tipos de Notificaciones

1. **Contratos en Borrador**
   - Alerta sobre contratos pendientes de emisión
   - Link directo al contrato

2. **Finiquitos Pendientes de Aprobación**
   - Alerta sobre finiquitos en revisión
   - Link directo al finiquito

3. **Contratos por Vencer**
   - Alerta sobre contratos plazo fijo que vencen en ≤30 días
   - Link directo al contrato

4. **Licencias Médicas por Vencer**
   - Alerta sobre licencias que expiran en ≤7 días
   - Link directo al trabajador

5. **Solicitudes de Vacaciones Pendientes**
   - Alerta sobre vacaciones en estado "solicitada"
   - Link directo a la solicitud

### Servicio (`lib/services/notificationService.ts`)
- Función `getNotifications(companyId, supabase)`
- Agrupa todas las notificaciones por tipo
- Retorna array con tipo, título, mensaje y link

---

## 🏢 Centros de Costo

### Descripción General
Sistema de gestión de centros de costo para organización y filtrado de trabajadores y datos.

### Funcionalidades

#### Gestión de Centros de Costo (`/settings/cost-centers`)
- Crear, editar, activar/desactivar centros de costo
- Código único por empresa
- Nombre y descripción
- Estado: activo/inactivo

#### Asignación a Trabajadores
- Campo en formulario de trabajador
- Dropdown con centros activos
- Opción para admin de crear nuevo centro desde el formulario

#### Asignación a Usuarios (`/admin/users`)
- Columna en tabla de usuarios
- Permite asignar múltiples centros de costo a un usuario
- Usuarios restringidos solo ven datos de sus centros asignados
- Super admin y admin ven todos los centros

#### Filtrado Automático
- Lista de trabajadores filtra por centro asignado al usuario
- Liquidaciones filtran por centro del trabajador
- Reportes respetan filtros de centro de costo
- RLS (Row Level Security) implementado en base de datos

### Estructura de Datos
- Tabla `cost_centers`: Catálogo de centros
- Tabla `user_cost_centers`: Asignación usuarios-centros
- Columna `cost_center_id` en `employees`: Relación trabajador-centro

---

## ⚠️ Cartas de Amonestación

### Descripción General
Sistema de gestión de acciones disciplinarias (amonestaciones verbales y escritas) conforme a normativa laboral chilena.

### Funcionalidades

#### Dashboard (`/disciplinary-actions`)
- Vista consolidada de todas las acciones disciplinarias
- Estadísticas: totales, escritas, verbales, pendientes
- Tabla resumida por trabajador con contadores
- Filtros por estado y tipo

#### Crear Acción Disciplinaria (`/employees/[id]/disciplinary-actions/new`)
**Campos:**
- Tipo: Verbal o Escrita
- Fecha del incidente
- Descripción del incidente
- Regla RIOHS aplicada
- Testigos (múltiples con nombre y RUT)
- Estado: Borrador, En Revisión, Aprobada, Emitida, Acusada Recibo, Anulada

#### Editar Acción (`/employees/[id]/disciplinary-actions/[id]/edit`)
- Misma interfaz que creación
- Permite modificar todos los campos

#### Detalle (`/employees/[id]/disciplinary-actions/[id]`)
- Vista completa de la acción
- Historial de cambios de estado
- Acciones: Editar, Ver PDF, Cambiar estado

#### Generación de PDF
- Formato legal chileno
- Incluye datos del trabajador, incidente, testigos, regla RIOHS
- Firmas de trabajador y empresa
- ID correlativo (CA-##)

### Estados y Flujo
1. **Borrador**: Creada pero no enviada
2. **En Revisión**: En proceso de aprobación
3. **Aprobada**: Aprobada, lista para emitir
4. **Emitida**: Enviada al trabajador
5. **Acusada Recibo**: Trabajador recibió y acusó recibo
6. **Anulada**: Cancelada

---

## 📚 Libro de Remuneraciones

### Descripción General
Generación de libro de remuneraciones consolidado por período, conforme a normativa chilena.

### Funcionalidades

#### Acceso
- Botón en módulo de Liquidaciones
- Genera libro para un período específico

#### Contenido
- Consolidado de todas las liquidaciones del período
- Datos por trabajador: haberes, descuentos, líquido
- Totales por concepto
- Formato legal chileno

#### Generación de PDF
- PDF completo del libro
- Incluye todas las liquidaciones del período
- Formato conforme a normativa

---

## 💼 Módulo de Finiquitos

### Descripción General
Sistema completo de cálculo y gestión de finiquitos conforme al Código del Trabajo chileno.

### Funcionalidades

#### Crear Finiquito (`/settlements/new`)
**Proceso:**
1. Selección de trabajador
2. Validaciones automáticas:
   - Debe tener contrato activo o finiquito previo aprobado
   - No puede tener finiquito pendiente
3. Datos del finiquito:
   - Fecha de término
   - Causal de término (dropdown con causales legales)
   - Aviso previo (toggle switch)
   - Días de aviso previo (si aplica)
   - Notas adicionales

**Cálculos Automáticos:**
- Sueldo proporcional último mes
- Vacaciones pendientes
- Indemnización años de servicio (IAS) - según causal
- Indemnización aviso previo (IAP) - según causal
- Saldo de préstamos
- Saldo de anticipos
- Total haberes y descuentos
- Líquido a pagar

#### Causales de Término
- **159_1**: Mutuo acuerdo (sin IAS, sin IAP)
- **159_2**: Renuncia voluntaria (sin IAS, sin IAP)
- **161_1**: Necesidades empresa (con IAS, con IAP)
- **161_2**: Desahucio empleador (con IAS, con IAP)
- Y más según Código del Trabajo

#### Estados y Flujo
1. **Borrador**: Creado, pendiente de revisión
2. **En Revisión**: En proceso de aprobación
3. **Aprobado**: Aprobado, listo para firmar
4. **Firmado**: Firmado por ambas partes
5. **Pagado**: Pagado al trabajador
6. **Anulado**: Cancelado

#### Integración con Contratos
- Al terminar contrato desde módulo de contratos, se crea pre-finiquito automáticamente
- Al aprobar finiquito, cambia estado del trabajador a "despido"
- Trabajador no puede tener nuevo contrato hasta que finiquito esté aprobado

---

## 🎨 Componentes UI Reutilizables

### 1. Layout (`components/Layout.tsx`)
- Navegación lateral con menús anidados
- Responsive (menú hamburguesa en móvil)
- Integración de AlertFab

### 2. DateInput (`components/DateInput.tsx`)
- Input de fecha con calendario en español
- Formato DD/MM/YYYY
- Conversión automática a ISO (YYYY-MM-DD)

### 3. MonthInput (`components/MonthInput.tsx`)
- Selector de mes/año
- Meses en español
- Formato YYYY-MM

### 4. AlertFab (`components/AlertFab.tsx`)
- Botón flotante de alertas
- Badge con contador
- Animación bounce cuando hay alertas

### 5. AlertDrawer (`components/AlertDrawer.tsx`)
- Panel lateral de alertas
- Tabs por severidad
- Acciones por alerta

### 6. NotificationsDropdown (`components/NotificationsDropdown.tsx`)
- Dropdown de notificaciones en header
- Badge con contador
- Lista de notificaciones con links

### 7. AIChatWidget (`components/AIChatWidget.tsx`)
- Widget flotante de chat con IA
- Historial de conversación
- Input de texto con envío

### 8. ToggleSwitch (`components/ToggleSwitch.tsx`)
- Switch toggle personalizado
- Estados: activado/desactivado
- Usado en múltiples formularios

### 9. ReportFilters (`components/reports/ReportFilters.tsx`)
- Componente reutilizable de filtros para reportes
- Filtros: empresa, centro de costo, período, estado, etc.

---

## 📊 Tipos TypeScript Principales

### Employee
```typescript
{
  id: string
  company_id: string
  full_name: string
  rut: string
  hire_date: string
  position: string
  afp: string
  health_system: 'FONASA' | 'ISAPRE'
  health_plan?: string
  health_plan_percentage?: number  // Monto en UF para ISAPRE
  base_salary: number
  contract_type: 'indefinido' | 'plazo_fijo' | 'temporal'
  contract_end_date?: string
  // ... más campos
}
```

### PayrollCalculationInput
```typescript
{
  baseSalary: number
  daysWorked: number
  daysLeave: number
  bonuses?: number
  overtime?: number
  vacation?: number
  otherTaxableEarnings?: number
  transportation?: number
  mealAllowance?: number
  aguinaldo?: number
  loans?: number
  advances?: number
  employee: Employee
  indicators?: PreviredIndicators
  year?: number
  month?: number
}
```

### PayrollCalculationResult
```typescript
{
  taxableEarnings: {
    baseSalary: number
    monthlyGratification: number
    bonuses: number
    overtime: number
    vacation: number
    otherTaxableEarnings: number
  }
  nonTaxableEarnings: {
    transportation: number
    mealAllowance: number
    aguinaldo: number
  }
  legalDeductions: {
    afpTotal: number  // Unificado (10% + adicional)
    health: number
    unemploymentInsurance: number
    uniqueTax: number
  }
  otherDeductions: {
    loans: number
    advances: number
  }
  totals: {
    totalTaxableEarnings: number
    totalNonTaxableEarnings: number
    totalEarnings: number
    totalLegalDeductions: number
    totalOtherDeductions: number
    totalDeductions: number
    netPay: number
  }
  taxableBase: number
}
```

---

## 🔧 Configuraciones Especiales

### Vercel Cron Jobs (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/tax-brackets/scrape-scheduled",
      "schedule": "0 0 1 * *"  // Día 1 de cada mes a las 00:00
    }
  ]
}
```

### TypeScript (`tsconfig.json`)
- Excluye `supabase/functions/**/*` del build
- Paths configurados: `@/*` → `./*`

### Next.js (`next.config.js`)
- Output: `standalone` (para Docker)
- React Strict Mode habilitado

---

## 🚀 Deployment

### Vercel
1. Conectar repositorio GitHub
2. Configurar variables de entorno
3. Deploy automático en push a `main`

### Variables de Entorno en Vercel
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `CRON_SECRET` (opcional, para cron jobs)
- `GEMINI_API_KEY` (opcional, para asistente IA)
- `GEMINI_MODEL` (opcional, modelo de Gemini, por defecto: gemini-2.5-flash)

---

## 📝 Notas Importantes

### Redondeo
- **Todos los cálculos monetarios** usan `Math.ceil()` (redondeo hacia arriba)
- No se consideran decimales en resultados finales

### Formato de Números
- Inputs muestran separadores de miles (1.000.000)
- Funciones: `formatNumberForInput()` y `parseFormattedNumber()`

### Fechas
- Formato interno: ISO (YYYY-MM-DD)
- Formato visual: DD/MM/YYYY (Chile)
- Componentes: `DateInput` y `MonthInput` para inputs

### IDs Correlativos
- Préstamos: `PT-##` (PT-01, PT-02, etc.)
- Contratos: `CT-##` (CT-01, CT-02, etc.)
- Anexos: `ANX-##` (ANX-01, ANX-02, etc.)
- Finiquitos: `FIN-###` (FIN-001, FIN-002, etc.)
- Cartas de amonestación: `CA-##` (CA-01, CA-02, etc.)
- Libros de remuneraciones: `LB-###` (LB-001, LB-002, etc.)
- Empresas: `EMP-{##}-{ddmmaaaa}` (EMP-01-02012026)
- Accidentes RAAT: Número correlativo por empresa (auto-incremental)
- Se generan automáticamente al crear

### Historial y Versiones
- Tramos de impuesto único: Se guardan múltiples versiones por mes/año
- Indicadores previsionales: Se guardan por mes/año
- Permite revisar valores históricos sin re-scrapear

### Storage de Documentos
- **Bucket**: `signed-documents` (configurado como público)
- **Estructura de carpetas**:
  - `{company_id}/payroll/{slip_id}.pdf` - Liquidaciones
  - `{company_id}/certificates/{certificate_id}.pdf` - Certificados
  - `{company_id}/vacations/{vacation_id}.pdf` - Vacaciones
  - `{company_id}/permissions/{permission_id}.pdf` - Permisos
- **Políticas RLS**: Usuarios autenticados pueden subir, leer, actualizar y eliminar archivos
- **Generación automática**: PDFs de liquidaciones se generan y guardan automáticamente al emitir

---

## 👤 Portal para Trabajadores

### Descripción General
Sistema completo de portal para que los trabajadores accedan a sus propios documentos, realicen solicitudes y descarguen PDFs desde cualquier dispositivo. **Diseñado como Progressive Web App (PWA) con enfoque Mobile First Responsive**.

### Características Técnicas

#### Progressive Web App (PWA)
- **Service Worker**: Implementado en `public/sw.js` para funcionalidad offline y actualizaciones automáticas
- **Manifest**: Configurado en `public/site.webmanifest` con metadata completa
- **Instalación**: Banner de instalación en página de login (Android e iOS)
- **Actualizaciones Automáticas**: Sistema de detección de nuevas versiones con banner discreto
- **Offline**: Caché de recursos estáticos para funcionamiento sin conexión

#### Diseño y Estilos
- **Framework CSS**: Tailwind CSS v4 con sintaxis `@import "tailwindcss"`
- **UI Library**: Preline UI integrado para componentes modernos
- **Enfoque**: Mobile First Responsive Design
- **Estilos Aislados**: CSS específico en `app/employee/employee-portal-tailwind.css` para evitar conflictos
- **Tema Minimalista**: Paleta de colores blanco/gris para dropdowns y componentes

### Funcionalidades Principales

#### Dashboard (`/employee`)
- Vista general con acceso rápido a:
  - Mis Documentos
  - Historial de Préstamos
  - Solicitar Certificado
  - Solicitar Vacaciones
  - Solicitar Permiso
  - Mis Solicitudes
- Cards de acceso rápido con diseño moderno
- Balance de vacaciones visible
- Resumen de documentos pendientes

#### Mis Documentos (`/employee/documents`)
**Pestañas:**
1. **Documentos Generales**:
   - Certificados (aprobados/emitidos)
   - Vacaciones (aprobadas/tomadas)
   - Permisos (aprobados/aplicados)
   - Liquidaciones de Sueldo (emitidas/enviadas)
   - Cartas de Amonestación
   - Anticipos (firmados/pagados)
   
2. **Documentos Laborales**:
   - Contratos (firmados/activos)
   - Anexos de Contrato (firmados/activos)
   - Pactos de Horas Extra (activos/renovados)

**Características:**
- Filtros por tipo de documento con diseño minimalista (dropdowns blancos/grises)
- Filtros específicos para liquidaciones (año/mes)
- Botón "Ver Detalle" para liquidaciones y pactos (modal con información completa)
- Botón "Descargar" icono-only (sin texto) para mejor UX móvil
- Botones con estilo minimalista (fondo blanco, hover gris)
- Diseño responsive optimizado para móviles

**APIs utilizadas:**
- `/api/employee/certificates`
- `/api/employee/vacations`
- `/api/employee/permissions`
- `/api/employee/payroll-slips`
- `/api/employee/disciplinary-actions`
- `/api/employee/advances`
- `/api/employee/contracts`
- `/api/employee/contract-annexes`
- `/api/employee/overtime-pacts`

#### Historial de Préstamos (`/employee/loans`)
- Vista exclusiva de préstamos del trabajador
- Cards con información resumida:
  - Número de préstamo (PT-##)
  - Monto total y pendiente
  - Cuotas pagadas/total
  - Barra de progreso
- Botón "Ver Detalle" que abre modal con:
  - Número del préstamo
  - Fecha de inicio y término
  - Cuotas pagadas
  - Monto, tasa de interés, total a pagar
  - Botón "Descargar" para PDF del préstamo

**API:** `/api/employee/loans`

#### Mis Solicitudes (`/employee/requests`)
- Vista consolidada de todas las solicitudes del trabajador
- Filtros con dropdowns minimalistas (estado, tipo, período)
- Tabla responsive con información detallada
- Estados: Pendiente, Aprobada, Rechazada
- Diseño consistente con el resto del portal

#### Mis Cumplimientos (`/employee/compliance`)
- Vista de cumplimientos asignados al trabajador
- Cards de resumen con estado de cumplimiento
- Notificaciones de cumplimientos pendientes
- Filtros y búsqueda integrados
- Diseño con márgenes y espaciado optimizados

#### Historial de Auditoría (`/employee/audit-history`)
- Registro completo de eventos relacionados con el trabajador
- Filtros por tipo de evento y fecha
- Vista de tabla responsive
- Botón "Volver" icono-only en esquina superior izquierda

### Autenticación y Autorización

#### Middleware
- Rutas `/employee/*` requieren autenticación
- Verifica que el usuario esté vinculado a un trabajador
- Excepciones para rutas PDF:
  - `/payroll/[id]/pdf`
  - `/overtime/[id]/pdf`
  - `/contracts/annex/[id]/pdf`
  - `/employees/[id]/loans/[loanId]/pdf`
  - `/employees/[id]/certificates/[type]/pdf`

#### Row Level Security (RLS)
- Migración `068_allow_employees_view_own_overtime_pacts.sql`
- Permite a trabajadores ver sus propios documentos:
  - `overtime_pacts` (pactos de horas extra)
  - `overtime_entries` (entradas de horas extra)
  - `advances` (anticipos)
  - `payroll_slips` (liquidaciones)
  - `contract_annexes` (anexos de contrato)
  - `loans` (préstamos)
- Validación mediante `employees.user_id = auth.uid()`

### Flujos de Descarga de PDFs

1. **Liquidaciones**:
   - Click en "Descargar" → Abre `/payroll/[id]/pdf` en nueva pestaña
   - Si `pdf_url` existe: muestra PDF guardado directamente
   - Si no existe: genera PDF dinámicamente con todos los datos

2. **Pactos de Horas Extra**:
   - Click en "Descargar" → Abre `/overtime/[id]/pdf` en nueva pestaña
   - Genera PDF dinámicamente

3. **Anexos de Contrato**:
   - Click en "Descargar" → Abre `/contracts/annex/[id]/pdf` en nueva pestaña
   - Si `pdf_url` existe: muestra PDF guardado directamente
   - Si no existe: genera PDF dinámicamente

4. **Préstamos**:
   - Click en "Descargar" desde modal → Abre `/employees/[id]/loans/[loanId]/pdf`

### APIs del Portal Trabajador

#### `/api/employee/payroll-slips`
- **Método**: GET
- **Autenticación**: Requerida
- **Funcionalidad**: Obtiene liquidaciones emitidas/enviadas del trabajador
- **Filtros**: `year`, `month` (opcionales)
- **Respuesta**: Array de liquidaciones con datos del período

#### `/api/employee/overtime-pacts`
- **Método**: GET
- **Autenticación**: Requerida
- **Funcionalidad**: Obtiene pactos activos/renovados del trabajador
- **Respuesta**: Array de pactos con datos completos

#### `/api/employee/contract-annexes`
- **Método**: GET
- **Autenticación**: Requerida
- **Funcionalidad**: Obtiene anexos firmados/activos del trabajador
- **Respuesta**: Array de anexos

#### `/api/employee/advances`
- **Método**: GET
- **Autenticación**: Requerida
- **Funcionalidad**: Obtiene anticipos del trabajador (excluye borradores)
- **Respuesta**: Array de anticipos

#### `/api/employee/loans`
- **Método**: GET
- **Autenticación**: Requerida
- **Funcionalidad**: Obtiene préstamos activos/pagados del trabajador
- **Respuesta**: Array de préstamos con todos los datos

### Mejoras de Diseño y Estilos

#### Estilos del Portal Trabajador
- **Archivo CSS**: `app/employee/employee-portal-tailwind.css`
- **Aislamiento**: Clase `.employee-portal-isolated` para evitar conflictos con otros módulos
- **Tailwind v4**: Sintaxis `@import "tailwindcss"` (compatible con v4)
- **Preline UI**: Integrado para componentes interactivos modernos
- **Tema Minimalista**: 
  - Dropdowns: fondo blanco, texto gris oscuro, selector gris claro
  - Botones: estilo limpio sin bordes gruesos
  - Sin colores azules en componentes de filtro
  - Paleta consistente en todo el portal

#### Componentes Mejorados
- **Botón "Volver"**: Icono-only en esquina superior izquierda (mejor UX móvil)
- **Botones de Descarga**: Solo icono, sin texto "Descargar"
- **Filtros**: Dropdowns minimalistas con estilo consistente
- **Tabs**: Diseño limpio sin bordes gruesos
- **Cards**: Espaciado y márgenes optimizados

#### Responsive Design
- **Mobile First**: Diseño optimizado primero para móviles
- **Breakpoints**: Adaptación automática a diferentes tamaños de pantalla
- **Tablas**: Se convierten en cards en dispositivos móviles
- **Navegación**: Bottom navigation en móviles, sidebar en desktop

### Implementación PWA (Progressive Web App)

#### Service Worker (`public/sw.js`)
- **Estrategia de Caché**: Network First con fallback a cache
- **Eventos**: `install`, `activate`, `fetch`, `message`
- **Actualizaciones**: `self.skipWaiting()` para activación inmediata
- **Versiones**: Detecta nuevas versiones y notifica al usuario

#### Manifest (`public/site.webmanifest`)
- **Configuración completa**: name, short_name, description, icons
- **Orientación**: portrait (optimizado para móviles)
- **Display**: standalone (experiencia tipo app nativa)
- **Theme**: Color de tema y fondo configurados
- **Scope**: `/` (toda la aplicación)

#### Componentes PWA

**PWAInstallBanner** (`components/PWAInstallBanner.tsx`):
- Banner de instalación en página de login
- Solo visible en dispositivos móviles
- Instrucciones específicas para Android e iOS
- Botón "Instalar" para Android (usa `beforeinstallprompt`)
- Instrucciones de "Compartir" para iOS
- Persistencia de estado (no mostrar si ya se descartó)

**PWAUpdateBanner** (`components/PWAUpdateBanner.tsx`):
- Banner discreto para notificar actualizaciones
- Aparece en el layout del portal trabajador
- Permite actualizar manualmente o descartar
- Se muestra cuando se detecta nueva versión del service worker

**PWAScript** (`components/PWAScript.tsx`):
- Componente para registrar el service worker
- Se incluye en el layout principal
- Maneja el registro y actualizaciones

#### Hooks Personalizados

**usePWAInstall** (`lib/hooks/usePWAInstall.ts`):
- Detecta si la app puede instalarse
- Maneja el evento `beforeinstallprompt`
- Detecta plataforma (iOS, Android, Desktop)
- Verifica si la app ya está instalada
- Controla la visibilidad del banner

**usePWAUpdate** (`lib/hooks/usePWAUpdate.ts`):
- Detecta nuevas versiones del service worker
- Notifica al usuario cuando hay actualizaciones disponibles
- Permite actualización manual o automática

#### Utilidades PWA (`lib/utils/pwa.ts`)
- `registerServiceWorker()`: Registra el service worker
- `isPWAInstalled()`: Verifica si la app está instalada
- `isMobileDevice()`: Detecta dispositivos móviles
- `isIOS()`: Detecta iOS
- `isAndroid()`: Detecta Android

#### Flujo de Instalación

1. **Android**:
   - Usuario visita login en móvil
   - Aparece banner con botón "Instalar"
   - Click dispara `beforeinstallprompt`
   - Navegador muestra diálogo nativo de instalación
   - App se instala como PWA

2. **iOS**:
   - Usuario visita login en iPhone/iPad
   - Aparece banner con instrucciones
   - Usuario debe usar botón "Compartir" del navegador
   - Selecciona "Añadir a pantalla de inicio"
   - App se instala como PWA

#### Flujo de Actualización

1. Service worker detecta nueva versión
2. Banner discreto aparece en portal trabajador
3. Usuario puede:
   - Click en "Actualizar" → Recarga la app con nueva versión
   - Click en "Cerrar" → Descarta el banner (aparecerá de nuevo)
4. Actualización automática en segundo plano

---

## 🔍 Búsqueda y Referencias Rápidas

### Archivos Clave por Funcionalidad

**Cálculos:**
- `lib/services/payrollCalculator.ts` - Cálculo de liquidaciones
- `lib/services/vacationPeriods.ts` - Gestión de vacaciones
- `lib/services/vacationCalculator.ts` - Utilidades de vacaciones

**APIs Externas:**
- `lib/services/previredAPI.ts` - API Previred
- `lib/services/taxBracketsScraper.ts` - Scraper SII
- `lib/services/indicatorsCache.ts` - Cache de indicadores

**PDFs:**
- `components/PayrollPDF.tsx` - Liquidación
- `components/LoanPDF.tsx` - Préstamo
- `components/VacationPDF.tsx` - Vacaciones
- `components/AdvancePDF.tsx` - Anticipo
- `components/CertificatePDF.tsx` - Certificado de trabajo
- `components/reports/*PDF.tsx` - Reportes ejecutivos

**UI:**
- `components/Layout.tsx` - Layout principal
- `components/AlertFab.tsx` - Botón de alertas
- `components/AlertDrawer.tsx` - Panel de alertas
- `components/NotificationsDropdown.tsx` - Dropdown de notificaciones
- `components/AIChatWidget.tsx` - Widget de chat con IA
- `components/ToggleSwitch.tsx` - Switch toggle
- `components/DateInput.tsx` - Input de fecha
- `components/MonthInput.tsx` - Input de mes

**Utilidades:**
- `lib/utils/date.ts` - Utilidades de fechas
- `lib/utils/formatNumber.ts` - Formateo de números
- `lib/utils/contractText.ts` - Generación de texto de contratos
- `lib/utils/annexClauses.ts` - Gestión de cláusulas de anexos

**IA y Contexto:**
- `lib/services/geminiClient.ts` - Cliente de Gemini API
- `lib/services/aiContextBuilder.ts` - Constructor de contexto para IA
- `lib/services/rateLimiter.ts` - Limitador de tasa

**Servicios Adicionales:**
- `lib/services/notificationService.ts` - Servicio de notificaciones
- `lib/services/contractService.ts` - Servicio de contratos
- `lib/services/settlementService.ts` - Servicio de finiquitos
- `lib/services/costCenterService.ts` - Servicio de centros de costo

---

## 💾 Sistema de Storage y PDFs

### Descripción General
Sistema integrado de generación, almacenamiento y distribución de PDFs usando Supabase Storage.

### Generación Automática

#### Liquidaciones de Sueldo
- **Trigger**: Al emitir liquidación (estado → "issued")
- **Proceso**:
  1. Cliente genera PDF usando `PayrollPDF` component y `@react-pdf/renderer`
  2. Convierte PDF a blob
  3. Envía blob a `/api/payroll/[id]/generate-pdf`
  4. Servidor guarda en Storage: `{company_id}/payroll/{slip_id}.pdf`
  5. Obtiene URL pública y actualiza `payroll_slips.pdf_url`
- **Ventajas**:
  - PDF original se preserva (no se regenera)
  - Consistencia en datos mostrados
  - Rendimiento mejorado (no regenera cada vez)

### Visualización Inteligente

#### Estrategia de Renderizado
- **Si existe `pdf_url`**: Muestra PDF guardado directamente en `<iframe>`
- **Si no existe `pdf_url`**: Genera PDF dinámicamente con todos los datos
- **Layout especial**: Rutas `/pdf` tienen layout sin contenedor para mostrar solo el PDF

#### Rutas PDF
- `/payroll/[id]/pdf` - Liquidaciones
- `/overtime/[id]/pdf` - Pactos de horas extra
- `/contracts/annex/[id]/pdf` - Anexos de contrato
- `/employees/[id]/loans/[loanId]/pdf` - Préstamos
- `/employees/[id]/certificates/[type]/pdf` - Certificados

### Migraciones Relacionadas

#### `069_add_pdf_url_to_payroll_slips.sql`
- Agrega columna `pdf_url TEXT` a `payroll_slips`

#### `070_allow_update_pdf_url_payroll_slips.sql`
- Política RLS para permitir actualizar `pdf_url`
- Solo usuarios autenticados de la misma empresa

#### `071_storage_policies_signed_documents.sql`
- Políticas de Storage para bucket `signed-documents`
- INSERT: Subir documentos (autenticados)
- SELECT: Leer documentos (autenticados)
- UPDATE: Actualizar documentos (autenticados)
- DELETE: Eliminar documentos (autenticados)

#### `115_delete_loan_pt09.sql`
- Script de ejemplo para eliminar préstamos con validaciones
- Verifica restricciones antes de eliminar
- Elimina cuotas asociadas en cascada

---

## 25. Gestión Avanzada de Préstamos

### 25.1 Funcionalidades de Gestión

El sistema permite gestionar préstamos de manera completa, con validaciones que aseguran la integridad de los datos contables.

#### Edición de Préstamos

**Cuándo se puede editar:**
- ✅ Préstamo en estado `active`
- ✅ Sin pagos registrados en `loan_payments`
- ✅ Sin cuotas pagadas (`paid_installments = 0`)
- ✅ Sin cuotas con estado `paid` o `partial` en `loan_installments`

**Campos editables:**
- Fecha del préstamo (`loan_date`)
- Monto solicitado (`amount`)
- Tasa de interés (`interest_rate`)
- Número de cuotas (`installments`)
- Descripción (`description`)

**Campos recalculados automáticamente:**
- `total_amount` = `amount` + (`amount` × `interest_rate` / 100)
- `installment_amount` = `total_amount` / `installments`
- `remaining_amount` = `total_amount` (se reinicia al editar)

#### Cancelación de Préstamos

**Cuándo se puede cancelar:**
- ✅ Préstamo en estado `active`
- ✅ No está pagado completamente

**Efectos:**
- Cambia estado a `cancelled`
- El préstamo deja de estar activo
- No se pueden agregar más pagos
- Se puede eliminar después de cancelar (si no tiene pagos)

#### Eliminación de Préstamos

**Cuándo se puede eliminar:**
- ✅ Está cancelado (`status = 'cancelled'`) Y no tiene pagos
- ✅ Está activo (`status = 'active'`) Y no tiene pagos ni cuotas pagadas

**Restricciones:**
- ❌ No se puede eliminar si tiene pagos registrados
- ❌ No se puede eliminar si tiene cuotas pagadas
- ❌ No se puede eliminar si está pagado completamente

**Relaciones eliminadas en cascada:**
- `loan_payments` (ON DELETE CASCADE)
- `loan_installments` (ON DELETE CASCADE)
- `payroll_items.loan_id` (ON DELETE SET NULL)

### 25.2 API de Gestión

#### Endpoints Disponibles

**`GET /api/loans/[id]`**
- Obtiene préstamo con todas sus relaciones
- Incluye: empleado, pagos, cuotas

**`PUT /api/loans/[id]`**
- Actualiza préstamo
- Valida restricciones antes de permitir edición
- Recalcula totales automáticamente

**`DELETE /api/loans/[id]`**
- Elimina préstamo
- Valida que no tenga pagos antes de eliminar
- Elimina relaciones en cascada

**`PATCH /api/loans/[id]`**
- Cancela préstamo (con `action: 'cancel'`)
- Valida que no esté pagado antes de cancelar

### 25.3 Interfaz de Usuario

#### Página de Detalle (`/employees/[id]/loans/[loanId]`)

**Botones disponibles según estado:**

1. **Editar** (solo si `canEdit()` retorna `true`)
   - Muestra formulario de edición inline
   - Permite modificar campos editables
   - Recalcula automáticamente totales
   - Botones: "Guardar Cambios" y "Cancelar"

2. **Cancelar** (solo si `canCancel()` retorna `true`)
   - Cambia estado a "Cancelado"
   - Muestra confirmación antes de cancelar
   - Icono: `FaTimesCircle`

3. **Eliminar** (solo si `canDelete()` retorna `true`)
   - Elimina el préstamo permanentemente
   - Muestra confirmación antes de eliminar
   - Redirige a la lista de préstamos después de eliminar
   - Icono: `FaTrash`

4. **Ver PDF** (siempre disponible)
   - Genera y muestra el PDF del préstamo

**Indicadores visuales:**
- Badge de estado (Activo, Pagado, Cancelado)
- Mensaje informativo si no se puede editar
- Validaciones en tiempo real

### 25.4 Flujos de Trabajo Recomendados

#### Escenario 1: Error en fecha o monto (sin pagos)
1. Ir a detalle del préstamo
2. Hacer clic en "Editar"
3. Corregir los campos necesarios
4. Guardar cambios

#### Escenario 2: Préstamo creado por error (sin pagos)
1. Ir a detalle del préstamo
2. Opción A: Hacer clic en "Cancelar" (mantiene historial)
3. Opción B: Hacer clic en "Eliminar" (elimina permanentemente)

#### Escenario 3: Préstamo con pagos (no se puede editar/eliminar)
1. El sistema mostrará mensaje informativo
2. Solo se puede cancelar si está activo
3. Para corregir, crear una reliquidación o ajuste manual

### 25.5 Consideraciones Importantes

1. **Integridad de datos:** Los préstamos con pagos no se pueden modificar para mantener la integridad contable.

2. **Auditoría:** Los préstamos cancelados se mantienen en el sistema para auditoría, pero se pueden eliminar si no tienen pagos.

3. **Liquidaciones:** Si un préstamo ya fue aplicado en una liquidación, no se puede editar ni eliminar. Se debe usar el módulo de reliquidaciones.

4. **Validaciones:** Todas las validaciones se realizan tanto en el frontend como en el backend para seguridad.

### 25.6 Script SQL para Eliminación Manual

Si necesitas eliminar un préstamo manualmente desde la base de datos:

```sql
-- Verificar restricciones
SELECT 
  l.id,
  l.loan_number,
  l.status,
  l.paid_installments,
  (SELECT COUNT(*) FROM loan_payments WHERE loan_id = l.id) as payments_count,
  (SELECT COUNT(*) FROM loan_installments WHERE loan_id = l.id AND status IN ('paid', 'partial')) as paid_installments_count
FROM loans l
WHERE l.id = 'UUID_DEL_PRESTAMO';

-- Si no tiene pagos, eliminar
DELETE FROM loans WHERE id = 'UUID_DEL_PRESTAMO';
```

Ver también: `supabase/migrations/115_delete_loan_pt09.sql` para un ejemplo completo de script de eliminación con validaciones.

### Seguridad

#### Row Level Security
- Trabajadores solo pueden ver sus propios documentos
- Validación mediante `employees.user_id = auth.uid()`
- Aplicado a: payroll_slips, overtime_pacts, advances, contract_annexes, loans

---

## 25. Gestión Avanzada de Préstamos

### 25.1 Funcionalidades de Gestión

El sistema permite gestionar préstamos de manera completa, con validaciones que aseguran la integridad de los datos contables.

#### Edición de Préstamos

**Cuándo se puede editar:**
- ✅ Préstamo en estado `active`
- ✅ Sin pagos registrados en `loan_payments`
- ✅ Sin cuotas pagadas (`paid_installments = 0`)
- ✅ Sin cuotas con estado `paid` o `partial` en `loan_installments`

**Campos editables:**
- Fecha del préstamo (`loan_date`)
- Monto solicitado (`amount`)
- Tasa de interés (`interest_rate`)
- Número de cuotas (`installments`)
- Descripción (`description`)

**Campos recalculados automáticamente:**
- `total_amount` = `amount` + (`amount` × `interest_rate` / 100)
- `installment_amount` = `total_amount` / `installments`
- `remaining_amount` = `total_amount` (se reinicia al editar)

#### Cancelación de Préstamos

**Cuándo se puede cancelar:**
- ✅ Préstamo en estado `active`
- ✅ No está pagado completamente

**Efectos:**
- Cambia estado a `cancelled`
- El préstamo deja de estar activo
- No se pueden agregar más pagos
- Se puede eliminar después de cancelar (si no tiene pagos)

#### Eliminación de Préstamos

**Cuándo se puede eliminar:**
- ✅ Está cancelado (`status = 'cancelled'`) Y no tiene pagos
- ✅ Está activo (`status = 'active'`) Y no tiene pagos ni cuotas pagadas

**Restricciones:**
- ❌ No se puede eliminar si tiene pagos registrados
- ❌ No se puede eliminar si tiene cuotas pagadas
- ❌ No se puede eliminar si está pagado completamente

**Relaciones eliminadas en cascada:**
- `loan_payments` (ON DELETE CASCADE)
- `loan_installments` (ON DELETE CASCADE)
- `payroll_items.loan_id` (ON DELETE SET NULL)

### 25.2 API de Gestión

#### Endpoints Disponibles

**`GET /api/loans/[id]`**
- Obtiene préstamo con todas sus relaciones
- Incluye: empleado, pagos, cuotas

**`PUT /api/loans/[id]`**
- Actualiza préstamo
- Valida restricciones antes de permitir edición
- Recalcula totales automáticamente

**`DELETE /api/loans/[id]`**
- Elimina préstamo
- Valida que no tenga pagos antes de eliminar
- Elimina relaciones en cascada

**`PATCH /api/loans/[id]`**
- Cancela préstamo (con `action: 'cancel'`)
- Valida que no esté pagado antes de cancelar

### 25.3 Interfaz de Usuario

#### Página de Detalle (`/employees/[id]/loans/[loanId]`)

**Botones disponibles según estado:**

1. **Editar** (solo si `canEdit()` retorna `true`)
   - Muestra formulario de edición inline
   - Permite modificar campos editables
   - Recalcula automáticamente totales
   - Botones: "Guardar Cambios" y "Cancelar"

2. **Cancelar** (solo si `canCancel()` retorna `true`)
   - Cambia estado a "Cancelado"
   - Muestra confirmación antes de cancelar
   - Icono: `FaTimesCircle`

3. **Eliminar** (solo si `canDelete()` retorna `true`)
   - Elimina el préstamo permanentemente
   - Muestra confirmación antes de eliminar
   - Redirige a la lista de préstamos después de eliminar
   - Icono: `FaTrash`

4. **Ver PDF** (siempre disponible)
   - Genera y muestra el PDF del préstamo

**Indicadores visuales:**
- Badge de estado (Activo, Pagado, Cancelado)
- Mensaje informativo si no se puede editar
- Validaciones en tiempo real

### 25.4 Flujos de Trabajo Recomendados

#### Escenario 1: Error en fecha o monto (sin pagos)
1. Ir a detalle del préstamo
2. Hacer clic en "Editar"
3. Corregir los campos necesarios
4. Guardar cambios

#### Escenario 2: Préstamo creado por error (sin pagos)
1. Ir a detalle del préstamo
2. Opción A: Hacer clic en "Cancelar" (mantiene historial)
3. Opción B: Hacer clic en "Eliminar" (elimina permanentemente)

#### Escenario 3: Préstamo con pagos (no se puede editar/eliminar)
1. El sistema mostrará mensaje informativo
2. Solo se puede cancelar si está activo
3. Para corregir, crear una reliquidación o ajuste manual

### 25.5 Consideraciones Importantes

1. **Integridad de datos:** Los préstamos con pagos no se pueden modificar para mantener la integridad contable.

2. **Auditoría:** Los préstamos cancelados se mantienen en el sistema para auditoría, pero se pueden eliminar si no tienen pagos.

3. **Liquidaciones:** Si un préstamo ya fue aplicado en una liquidación, no se puede editar ni eliminar. Se debe usar el módulo de reliquidaciones.

4. **Validaciones:** Todas las validaciones se realizan tanto en el frontend como en el backend para seguridad.

### 25.6 Script SQL para Eliminación Manual

Si necesitas eliminar un préstamo manualmente desde la base de datos:

```sql
-- Verificar restricciones
SELECT 
  l.id,
  l.loan_number,
  l.status,
  l.paid_installments,
  (SELECT COUNT(*) FROM loan_payments WHERE loan_id = l.id) as payments_count,
  (SELECT COUNT(*) FROM loan_installments WHERE loan_id = l.id AND status IN ('paid', 'partial')) as paid_installments_count
FROM loans l
WHERE l.id = 'UUID_DEL_PRESTAMO';

-- Si no tiene pagos, eliminar
DELETE FROM loans WHERE id = 'UUID_DEL_PRESTAMO';
```

Ver también: `supabase/migrations/115_delete_loan_pt09.sql` para un ejemplo completo de script de eliminación con validaciones.

#### Storage Policies
- Bucket `signed-documents` requiere autenticación
- Estructura por `company_id` previene acceso cruzado
- URLs públicas solo para documentos aprobados

---

Este manual cubre todos los aspectos del sistema. Para más detalles sobre implementación específica, consultar los archivos fuente mencionados.

