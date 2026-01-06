# 📋 Plan de Implementación: Portal de Trabajadores y Firma Digital

## 🎯 Objetivo General

Implementar dos sistemas complementarios:
1. **Portal Self-Service para Trabajadores**: Aplicación web responsive (móvil-first) donde los trabajadores pueden solicitar documentos y descargar los aprobados.
2. **Sistema de Firma Digital**: Solo para Certificados, Vacaciones y Permisos, con verificación de integridad mediante QR code.

---

## 📊 PARTE 1: PORTAL DE TRABAJADORES (SELF-SERVICE)

### Etapa 1.1: Base de Datos y Autenticación

**Objetivo**: Establecer la relación entre empleados y usuarios del sistema, con creación automática de usuarios y cambio obligatorio de contraseña.

#### Flujo de Autenticación:
1. **Creación de Trabajador**:
   - Admin crea trabajador en el sistema
   - Se solicita **email** en el formulario de creación (campo obligatorio)
   - Al guardar, se crea automáticamente un usuario en `auth.users` con:
     - Email: el proporcionado
     - Password: `"colaborador1"` (contraseña inicial estándar)
     - Email confirmado: `true` (no requiere verificación)
   - Se vincula el `user_id` al registro del trabajador
   - Se marca en `user_profiles` que debe cambiar contraseña en primer login

2. **Login del Trabajador**:
   - Trabajador ingresa al mismo link de la app (`/login`)
   - Ingresa su email y contraseña (inicialmente "colaborador1")
   - Sistema detecta si es trabajador (verificando `user_id` en `employees`)
   - Si es primer login y no ha cambiado contraseña → redirige a `/employee/change-password`
   - Si ya cambió contraseña → redirige a `/employee` (portal de trabajadores)
   - Si es admin/owner → redirige a `/` (dashboard admin)

#### Tareas:
1. **Migración SQL**: Agregar campos necesarios
   ```sql
   -- Agregar relación entre empleado y usuario
   ALTER TABLE employees 
   ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
   ADD COLUMN email VARCHAR(255); -- Email del trabajador (para crear usuario)
   
   CREATE INDEX idx_employees_user_id ON employees(user_id);
   CREATE INDEX idx_employees_email ON employees(email);
   
   -- Agregar campo para controlar cambio de contraseña inicial
   ALTER TABLE user_profiles
   ADD COLUMN must_change_password BOOLEAN DEFAULT false,
   ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE;
   ```

2. **Función auxiliar**: Crear función para verificar si un usuario es trabajador
   ```sql
   CREATE OR REPLACE FUNCTION is_employee_user(p_user_id UUID)
   RETURNS BOOLEAN AS $$
   BEGIN
     RETURN EXISTS (
       SELECT 1 FROM employees
       WHERE user_id = p_user_id
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

3. **API de Creación de Usuario para Trabajador**:
   - `POST /api/employees/create-user`
   - Recibe: `email`, `employee_id`
   - Crea usuario con contraseña "colaborador1"
   - Marca `must_change_password = true`
   - Vincula `user_id` al empleado

4. **Modificar Formulario de Creación de Trabajador**:
   - Agregar campo `email` (obligatorio) en `app/employees/new/page.tsx`
   - Al guardar, llamar a API para crear usuario automáticamente
   - Manejar errores (email duplicado, etc.)

5. **Modificar Página de Login** (`app/login/page.tsx`):
   - Después de login exitoso, verificar si es trabajador
   - Verificar si debe cambiar contraseña (`must_change_password = true`)
   - Redirigir según corresponda:
     - Trabajador con contraseña inicial → `/employee/change-password`
     - Trabajador con contraseña cambiada → `/employee` (portal del trabajador)
     - Admin/Owner → `/` (dashboard administrativo)
   - ⚠️ NO confundir con `/employees` (gestión administrativa de trabajadores)

6. **Página de Cambio de Contraseña Obligatorio**:
   - `app/employee/change-password/page.tsx` (ruta: `/employee/change-password`)
   - Formulario simple: contraseña actual, nueva contraseña, confirmar
   - Validación: nueva contraseña debe ser diferente de "colaborador1"
   - Al cambiar, actualizar `must_change_password = false` y `password_changed_at`
   - Redirigir a `/employee` después de cambio exitoso
   - ⚠️ Proteger ruta: solo accesible para trabajadores que deben cambiar contraseña

7. **RLS Policies**: Actualizar políticas para que trabajadores vean solo sus datos
   - Trabajadores pueden ver solo su propio registro en `employees`
   - Trabajadores pueden ver solo sus certificados, vacaciones y permisos
   - Trabajadores pueden crear solicitudes (certificados, vacaciones, permisos) solo para sí mismos

#### Archivos a crear:
- `supabase/migrations/038_add_employee_user_relation.sql`
- `app/api/employees/create-user/route.ts`
- `app/employee/change-password/page.tsx`

#### Archivos a modificar:
- `app/employees/new/page.tsx` - Agregar campo email y lógica de creación de usuario
- `app/employees/[id]/edit/page.tsx` - Permitir editar email (con validación)
- `app/login/page.tsx` - Agregar lógica de redirección según tipo de usuario
- `middleware.ts` - Agregar protección de rutas `/employee/*` (solo trabajadores, no admins)
  - Verificar que el usuario tiene `user_id` en tabla `employees`
  - Si es admin/owner intentando acceder a `/employee/*`, redirigir a `/`
  - Si es trabajador intentando acceder a rutas admin, redirigir a `/employee`

---

### Etapa 1.2: Sistema de Solicitudes y Aprobaciones

**Objetivo**: Modificar el flujo de certificados, vacaciones y permisos para incluir estados de solicitud y aprobación.

#### Tareas:
1. **Actualizar tabla `certificates`**:
   - Agregar campo `requested_by` (UUID del usuario trabajador)
   - Agregar campo `requested_at` (timestamp)
   - Modificar `status` para incluir: `'requested'`, `'approved'`, `'rejected'`, `'issued'`, `'void'`
   - Agregar campo `rejection_reason` (TEXT, opcional)

2. **Actualizar tabla `vacations`**:
   - Ya tiene `status` con `'solicitada'`, `'aprobada'`, `'rechazada'`
   - Agregar campo `requested_by` (UUID del usuario trabajador)
   - Agregar campo `requested_at` (timestamp)
   - Agregar campo `rejection_reason` (TEXT, opcional)

3. **Actualizar tabla `permissions`**:
   - Ya tiene `status` con `'draft'`, `'approved'`, `'applied'`, `'void'`
   - Agregar campo `requested_by` (UUID del usuario trabajador)
   - Agregar campo `requested_at` (timestamp)
   - Agregar campo `rejection_reason` (TEXT, opcional)
   - Modificar `status` para incluir: `'requested'`, `'approved'`, `'rejected'`, `'applied'`, `'void'`

#### Archivos a crear:
- `supabase/migrations/039_add_request_fields_to_documents.sql`

---

### Etapa 1.3: APIs de Solicitud y Aprobación

**Objetivo**: Crear endpoints para que trabajadores soliciten documentos y admins los aprueben.

#### Tareas:
1. **API de Solicitud de Certificados**:
   - `POST /api/employee/certificates/request`
   - Validar que el usuario es trabajador
   - Validar que el `employee_id` corresponde al usuario
   - Crear registro con `status = 'requested'`

2. **API de Solicitud de Vacaciones**:
   - `POST /api/employee/vacations/request`
   - Validar que el usuario es trabajador
   - Validar que el `employee_id` corresponde al usuario
   - Validar días disponibles
   - Crear registro con `status = 'solicitada'`

3. **API de Solicitud de Permisos**:
   - `POST /api/employee/permissions/request`
   - Validar que el usuario es trabajador
   - Validar que el `employee_id` corresponde al usuario
   - Crear registro con `status = 'requested'`

4. **APIs de Aprobación** (para admin/owner):
   - `POST /api/certificates/[id]/approve`
   - `POST /api/certificates/[id]/reject`
   - `POST /api/vacations/[id]/approve`
   - `POST /api/vacations/[id]/reject`
   - `POST /api/permissions/[id]/approve`
   - `POST /api/permissions/[id]/reject`

5. **APIs de Consulta para Trabajadores**:
   - `GET /api/employee/certificates` - Lista certificados del trabajador
   - `GET /api/employee/vacations` - Lista vacaciones del trabajador
   - `GET /api/employee/permissions` - Lista permisos del trabajador
   - `GET /api/employee/dashboard` - Resumen (días de vacaciones disponibles, etc.)

#### Archivos a crear:
- `app/api/employee/certificates/request/route.ts`
- `app/api/employee/vacations/request/route.ts`
- `app/api/employee/permissions/request/route.ts`
- `app/api/employee/certificates/route.ts`
- `app/api/employee/vacations/route.ts`
- `app/api/employee/permissions/route.ts`
- `app/api/employee/dashboard/route.ts`
- `app/api/certificates/[id]/approve/route.ts`
- `app/api/certificates/[id]/reject/route.ts`
- `app/api/vacations/[id]/approve/route.ts`
- `app/api/vacations/[id]/reject/route.ts`
- `app/api/permissions/[id]/approve/route.ts`
- `app/api/permissions/[id]/reject/route.ts`

---

### Etapa 1.4: Interfaz del Portal de Trabajadores (Frontend)

**Objetivo**: Crear aplicación web responsive (móvil-first) para trabajadores.

#### Tareas:
1. **Layout del Portal**:
   - Diseño móvil-first con navegación inferior (bottom navigation)
   - Header con logo de la empresa/app y nombre del trabajador
   - Colores y branding diferenciado del portal admin (púrpura/azul como acento principal)
   - Fondo blanco/gris claro, cards con sombras sutiles

2. **Página Principal (Dashboard)** - Diseño basado en imágenes de referencia:
   
   **Header Section:**
   - Logo de la aplicación (izquierda)
   - Saludo personalizado: "Buen día, [Nombre]" con emoji de mano
   - Tags de resumen horizontal (badges con puntos de color):
     - Púrpura: "Días disp. X" (días disponibles de vacaciones)
     - Verde: "Aprobadas X" (solicitudes aprobadas)
     - Naranja: "Pendientes X" (solicitudes pendientes)
   
   **Card de Vacaciones (Prominente):**
   - Título: "Vacaciones" / "Tu saldo"
   - Indicador circular de progreso (izquierda):
     - Círculo grande con arco de progreso azul
     - Número grande en el centro: días disponibles
     - Texto "días disp." debajo
   - Resumen de texto: "Usaste X días • Quedan X de Y"
   - Radio buttons: "Disponible" (seleccionado) / "Usado"
   - Botón grande azul "Solicitar" con icono de calendario
   - Icono de historial (reloj) al lado del botón
   
   **Sección "Acciones rápidas"**:
   - Grid 2x2 o 2x3 de cards blancas con bordes redondeados
   - Cada card con:
     - Icono grande (calendario, clipboard, reloj, documento, corazón, auriculares)
     - Título (Vacaciones, Permisos, Horas extra, Recibos, Beneficios, Soporte)
     - Subtítulo descriptivo (Nueva solicitud, Por horas/día, Carga mensual, Descargar PDF, Gimnasio y más, RRHH)
   - Cards con hover effect y sombra sutil
   
   **Sección "Próximos"**:
   - Título de sección
   - Lista vertical de cards de eventos:
     - Fecha a la izquierda (ej: "02 Sep")
     - Título del evento (ej: "Capacitación Incendios")
     - Detalles (ej: "Salón 3 · 10:00")
     - Icono de flecha a la derecha
   
   **Sección "Comunicados"** (opcional):
   - Título de sección
   - Lista de comunicados con:
     - Título del comunicado
     - Fecha de vigencia o plazo
   
   **Floating Action Button (FAB)**:
   - Botón circular púrpura/azul en esquina inferior derecha
   - Icono "+" blanco
   - Acción rápida (ej: nueva solicitud)

3. **Página de Solicitud de Certificados**:
   - Formulario simple: Tipo de certificado (antigüedad, renta, vigencia)
   - Campo opcional: Propósito
   - Botón "Solicitar"
   - Validación y confirmación

4. **Página de Solicitud de Vacaciones**:
   - Selector de fechas (inicio y fin)
   - Cálculo automático de días hábiles
   - Validación de días disponibles
   - Campo de notas (opcional)
   - Botón "Solicitar"

5. **Página de Solicitud de Permisos**:
   - Selector de tipo de permiso
   - Selector de fechas (inicio y fin)
   - Campo de motivo (obligatorio)
   - Selector de horas (si aplica)
   - Campo de notas (opcional)
   - Botón "Solicitar"

6. **Página de Mis Solicitudes**:
   - Tabs: Certificados, Vacaciones, Permisos
   - Lista de solicitudes con estado (pendiente, aprobada, rechazada)
   - Filtros por estado
   - Acciones: Ver detalles, Descargar PDF (si está aprobado y emitido)

7. **Página de Detalle de Solicitud**:
   - Información completa de la solicitud
   - Estado actual con badge visual
   - Botón de descarga (si está aprobado y emitido)
   - Historial de cambios (opcional)

8. **Componentes Reutilizables**:
   - `components/employee/StatusBadge.tsx` - Badge de estado
   - `components/employee/RequestCard.tsx` - Card de solicitud
   - `components/employee/VacationBalance.tsx` - Card completo de saldo de vacaciones con indicador circular
   - `components/employee/CircularProgress.tsx` - Indicador circular de progreso (para días de vacaciones)
   - `components/employee/SummaryTags.tsx` - Tags de resumen (Días disp., Aprobadas, Pendientes)
   - `components/employee/QuickActionCard.tsx` - Card de acción rápida (Vacaciones, Permisos, etc.)
   - `components/employee/EventCard.tsx` - Card de evento próximo
   - `components/employee/CommunicationCard.tsx` - Card de comunicado
   - `components/employee/BottomNavigation.tsx` - Navegación inferior
   - `components/employee/FloatingActionButton.tsx` - FAB con icono "+"

#### ⚠️ IMPORTANTE - Estructura de Rutas:
- **`/employees`** (plural) = Portal ADMINISTRATIVO (ya existe)
  - Gestión de trabajadores por admin/owner
  - Lista, creación, edición de trabajadores
  - NO se modifica
  
- **`/employee`** (singular) = Portal del TRABAJADOR (nuevo)
  - Portal self-service para trabajadores
  - Dashboard, solicitudes, descargas
  - Acceso solo para usuarios vinculados a `employees.user_id`

#### Archivos a crear:
- `app/employee/page.tsx` - Dashboard principal del trabajador
- `app/employee/layout.tsx` - Layout específico para trabajadores (diferente del admin)
- `app/employee/certificates/request/page.tsx` - Solicitar certificado
- `app/employee/vacations/request/page.tsx` - Solicitar vacaciones
- `app/employee/permissions/request/page.tsx` - Solicitar permiso
- `app/employee/requests/page.tsx` - Mis solicitudes (tabs: certificados, vacaciones, permisos)
- `app/employee/requests/[type]/[id]/page.tsx` - Detalle de solicitud
- `components/employee/StatusBadge.tsx`
- `components/employee/RequestCard.tsx`
- `components/employee/VacationBalance.tsx`
- `components/employee/CircularProgress.tsx`
- `components/employee/SummaryTags.tsx`
- `components/employee/QuickActionCard.tsx`
- `components/employee/EventCard.tsx`
- `components/employee/CommunicationCard.tsx`
- `components/employee/BottomNavigation.tsx`
- `components/employee/FloatingActionButton.tsx`
- `styles/employee-portal.css` - Estilos específicos del portal (colores púrpura/azul, diseño móvil-first)

---

### Etapa 1.5: Integración con Sistema de Aprobación Admin

**Objetivo**: Actualizar interfaces admin para mostrar y aprobar solicitudes de trabajadores.

#### Tareas:
1. **Actualizar página de Certificados** (`app/certificates/page.tsx`):
   - Agregar filtro por estado (incluyendo "Solicitado")
   - Agregar columna "Solicitado por" (si aplica)
   - Botones de aprobación/rechazo en filas con estado "requested"
   - Modal de rechazo con campo de motivo

2. **Actualizar página de Vacaciones** (`app/vacations/page.tsx`):
   - Agregar filtro por estado (incluyendo "Solicitada")
   - Agregar columna "Solicitado por" (si aplica)
   - Botones de aprobación/rechazo en filas con estado "solicitada"
   - Modal de rechazo con campo de motivo

3. **Actualizar página de Permisos** (`app/permissions/page.tsx`):
   - Agregar filtro por estado (incluyendo "Requested")
   - Agregar columna "Solicitado por" (si aplica)
   - Botones de aprobación/rechazo en filas con estado "requested"
   - Modal de rechazo con campo de motivo

4. **Notificaciones** (opcional):
   - Notificar a trabajador cuando su solicitud es aprobada/rechazada
   - Notificar a admin cuando hay nuevas solicitudes

#### Archivos a modificar:
- `app/certificates/page.tsx`
- `app/vacations/page.tsx`
- `app/permissions/page.tsx`

---

## 📊 PARTE 2: SISTEMA DE FIRMA DIGITAL

### Etapa 2.1: Base de Datos para Firma Digital

**Objetivo**: Crear estructura de base de datos para almacenar firmas digitales y metadatos de documentos firmados.

#### Tareas:
1. **Tabla `digital_signatures`**:
   ```sql
   CREATE TABLE digital_signatures (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     signature_image_url TEXT NOT NULL, -- URL en Storage
     signer_name VARCHAR(255) NOT NULL,
     signer_position VARCHAR(255) NOT NULL,
     signer_rut VARCHAR(20) NOT NULL,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(company_id, user_id) -- Una firma por usuario por empresa
   );
   ```

2. **Agregar campos de aprobación a `certificates`**:
   ```sql
   ALTER TABLE certificates
   ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
   ADD COLUMN approved_by UUID REFERENCES auth.users(id),
   ADD COLUMN signature_id UUID REFERENCES digital_signatures(id),
   ADD COLUMN signed_pdf_url TEXT,
   ADD COLUMN pdf_hash VARCHAR(64), -- SHA-256
   ADD COLUMN verification_code VARCHAR(50) UNIQUE,
   ADD COLUMN verification_url TEXT,
   ADD COLUMN qr_code_data JSONB; -- Datos del QR code
   ```

3. **Agregar campos de aprobación a `vacations`**:
   ```sql
   ALTER TABLE vacations
   ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
   ADD COLUMN approved_by UUID REFERENCES auth.users(id),
   ADD COLUMN signature_id UUID REFERENCES digital_signatures(id),
   ADD COLUMN signed_pdf_url TEXT,
   ADD COLUMN pdf_hash VARCHAR(64),
   ADD COLUMN verification_code VARCHAR(50) UNIQUE,
   ADD COLUMN verification_url TEXT,
   ADD COLUMN qr_code_data JSONB;
   ```

4. **Agregar campos de aprobación a `permissions`**:
   ```sql
   ALTER TABLE permissions
   ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
   ADD COLUMN approved_by UUID REFERENCES auth.users(id),
   ADD COLUMN signature_id UUID REFERENCES digital_signatures(id),
   ADD COLUMN signed_pdf_url TEXT,
   ADD COLUMN pdf_hash VARCHAR(64),
   ADD COLUMN verification_code VARCHAR(50) UNIQUE,
   ADD COLUMN verification_url TEXT,
   ADD COLUMN qr_code_data JSONB;
   ```

5. **RLS Policies**:
   - Solo admin/owner pueden crear/editar/eliminar firmas digitales
   - Usuarios pueden ver firmas de su empresa

#### Archivos a crear:
- `supabase/migrations/040_create_digital_signatures.sql`
- `supabase/migrations/041_add_approval_fields_certificates.sql`
- `supabase/migrations/042_add_approval_fields_vacations.sql`
- `supabase/migrations/043_add_approval_fields_permissions.sql`

---

### Etapa 2.2: Servicios de Firma Digital

**Objetivo**: Crear servicios backend para firmar documentos y generar códigos de verificación.

#### Tareas:
1. **Servicio Genérico de Firma** (`lib/services/documentSigner.ts`):
   - Función para insertar firma digital en PDF
   - Función para generar QR code
   - Función para calcular hash SHA-256
   - Función para generar código de verificación único
   - Función para guardar PDF firmado en Storage

2. **Servicio de Verificación** (`lib/services/pdfIntegrityVerifier.ts`):
   - Función para calcular hash SHA-256 de un PDF
   - Función para generar QR code con URL de verificación
   - Función para verificar documento por código
   - Función para verificar integridad de PDF (comparar hash)

3. **Servicios Específicos**:
   - `lib/services/certificateSigner.ts` - Firma de certificados
   - `lib/services/vacationSigner.ts` - Firma de vacaciones
   - `lib/services/permissionSigner.ts` - Firma de permisos

#### Dependencias a instalar:
```bash
npm install qrcode @types/qrcode crypto-js @types/crypto-js pdf-lib
```

#### Archivos a crear:
- `lib/services/documentSigner.ts`
- `lib/services/pdfIntegrityVerifier.ts`
- `lib/services/certificateSigner.ts`
- `lib/services/vacationSigner.ts`
- `lib/services/permissionSigner.ts`

---

### Etapa 2.3: APIs de Aprobación y Firma

**Objetivo**: Crear endpoints para aprobar y firmar documentos automáticamente.

#### Tareas:
1. **API de Aprobación de Certificados**:
   - `POST /api/certificates/[id]/approve`
   - Validar permisos (admin/owner)
   - Validar que existe firma digital activa
   - Generar PDF firmado
   - Calcular hash y generar código de verificación
   - Guardar PDF en Storage
   - Actualizar registro en BD

2. **API de Aprobación de Vacaciones**:
   - `POST /api/vacations/[id]/approve`
   - Similar a certificados

3. **API de Aprobación de Permisos**:
   - `POST /api/permissions/[id]/approve`
   - Similar a certificados

4. **API de Verificación Pública**:
   - `GET /api/verify/[code]` - Verificar documento por código
   - `GET /api/verify` - Página de búsqueda de verificación

#### Archivos a crear:
- `app/api/certificates/[id]/approve/route.ts`
- `app/api/vacations/[id]/approve/route.ts`
- `app/api/permissions/[id]/approve/route.ts`
- `app/api/verify/route.ts`
- `app/api/verify/[code]/route.ts`

---

### Etapa 2.4: Componentes PDF con Firma Digital

**Objetivo**: Modificar componentes PDF para incluir firma digital y QR code.

#### Tareas:
1. **Actualizar `components/CertificatePDF.tsx`**:
   - Agregar prop `showSignature` (boolean)
   - Agregar prop `signatureData` (objeto con datos de firma)
   - Agregar prop `qrCodeData` (objeto con datos del QR)
   - Renderizar firma digital al final del documento
   - Renderizar QR code en esquina inferior derecha

2. **Actualizar `components/VacationPDF.tsx`**:
   - Similar a CertificatePDF

3. **Actualizar `components/PermissionPDF.tsx`**:
   - Similar a CertificatePDF

#### Archivos a modificar:
- `components/CertificatePDF.tsx`
- `components/VacationPDF.tsx`
- `components/PermissionPDF.tsx`

---

### Etapa 2.5: Gestión de Firmas Digitales (UI Admin)

**Objetivo**: Crear interfaz para que admin/owner suban y gestionen firmas digitales.

#### Tareas:
1. **Página de Gestión de Firmas**:
   - Lista de firmas digitales activas
   - Formulario para subir nueva firma (imagen PNG/JPG)
   - Campos: Nombre del firmante, Cargo, RUT
   - Vista previa de la firma
   - Botón para activar/desactivar firma

2. **Componentes**:
   - `components/signatures/SignatureUpload.tsx` - Componente de subida
   - `components/signatures/SignatureList.tsx` - Lista de firmas

#### Archivos a crear:
- `app/settings/signatures/page.tsx`
- `components/signatures/SignatureUpload.tsx`
- `components/signatures/SignatureList.tsx`

---

### Etapa 2.6: Página de Verificación Pública

**Objetivo**: Crear página pública donde cualquier persona puede verificar un documento.

#### Tareas:
1. **Página de Verificación**:
   - Campo de búsqueda por código de verificación
   - Resultado: Información del documento, fecha de emisión, hash, estado de integridad
   - Opción de escanear QR code (usando cámara del dispositivo)
   - Diseño simple y profesional

#### Archivos a crear:
- `app/verify/page.tsx` - Página principal de verificación
- `app/verify/[code]/page.tsx` - Página de resultado de verificación

---

## 🔄 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

### Fase 1: Portal de Trabajadores (Básico)
1. ✅ Etapa 1.1: Base de Datos y Autenticación
2. ✅ Etapa 1.2: Sistema de Solicitudes y Aprobaciones
3. ✅ Etapa 1.3: APIs de Solicitud y Aprobación
4. ✅ Etapa 1.4: Interfaz del Portal (Dashboard y Solicitudes básicas)
5. ✅ Etapa 1.5: Integración con Sistema de Aprobación Admin

### Fase 2: Firma Digital
6. ✅ Etapa 2.1: Base de Datos para Firma Digital
7. ✅ Etapa 2.2: Servicios de Firma Digital
8. ✅ Etapa 2.3: APIs de Aprobación y Firma
9. ✅ Etapa 2.4: Componentes PDF con Firma Digital
10. ✅ Etapa 2.5: Gestión de Firmas Digitales (UI Admin)
11. ✅ Etapa 2.6: Página de Verificación Pública

### Fase 3: Mejoras y Pulido
12. ✅ Notificaciones (opcional)
13. ✅ Historial de cambios en solicitudes
14. ✅ Comunicados para trabajadores (opcional)

---

## 📝 NOTAS IMPORTANTES

1. **Autenticación de Trabajadores**: Los trabajadores deben tener un usuario en `auth.users` vinculado a su registro en `employees` mediante `user_id`.

2. **Storage de Supabase**: Se necesitará crear buckets:
   - `digital-signatures` - Para almacenar imágenes de firmas (privado)
   - `signed-documents` - Para almacenar PDFs firmados (público para lectura)

3. **Variables de Entorno**: Agregar `NEXT_PUBLIC_APP_URL` para generar URLs de verificación.

4. **Responsive Design**: El portal de trabajadores debe ser 100% responsive, priorizando móvil.

5. **Seguridad**: 
   - Validar siempre que un trabajador solo pueda solicitar documentos para sí mismo
   - Validar permisos de admin/owner en todas las APIs de aprobación
   - Los PDFs firmados deben ser verificables públicamente pero no editables

---

## ✅ CHECKLIST DE VALIDACIÓN

### Portal de Trabajadores:
- [ ] Trabajador puede solicitar certificado
- [ ] Trabajador puede solicitar vacaciones
- [ ] Trabajador puede solicitar permiso
- [ ] Trabajador puede ver estado de sus solicitudes
- [ ] Trabajador puede descargar documentos aprobados
- [ ] Admin puede aprobar/rechazar solicitudes
- [ ] Portal es responsive y funciona bien en móvil

### Firma Digital:
- [ ] Admin puede subir firma digital
- [ ] Al aprobar documento, se genera PDF firmado automáticamente
- [ ] PDF firmado incluye firma digital y QR code
- [ ] Código de verificación funciona correctamente
- [ ] Página pública de verificación funciona
- [ ] Hash SHA-256 se calcula y almacena correctamente
- [ ] Verificación de integridad funciona

---

**Última actualización**: 2025-01-05

