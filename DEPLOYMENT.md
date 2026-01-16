# Guía de Despliegue - Sistema de Remuneraciones

## Checklist Pre-Despliegue

### ✅ Base de Datos (Supabase)
- [x] Base de datos configurada y funcionando
- [x] Todas las migraciones SQL ejecutadas
- [x] Usuarios creados (super_admin y usuarios regulares)
- [x] RLS (Row Level Security) configurado correctamente

### 📋 Variables de Entorno Necesarias

Necesitarás configurar estas variables en **Easypanel**:

```env
# Entorno de ejecución
NODE_ENV=production

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# Configuración del Sitio
NEXT_PUBLIC_SITE_URL=https://rrhh.piwisuite.cl
```

**Dónde encontrar estas variables:**
1. Ve a tu proyecto en Supabase
2. Settings → API
3. `NEXT_PUBLIC_SUPABASE_URL` = Project URL
4. `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key
5. `SUPABASE_SERVICE_ROLE_KEY` = service_role key (⚠️ SECRETO, no exponer en cliente)

---

## Pasos de Despliegue

### 1. Subir Código a GitHub

```bash
# Si aún no tienes un repo en GitHub, créalo primero
git init
git add .
git commit -m "Initial commit - Sistema de Remuneraciones"
git branch -M main
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

### 2. Configurar Dominio en Cloudflare

1. Ve a Cloudflare Dashboard
2. Selecciona tu dominio `piwisuite.cl`
3. Ve a **DNS** → **Records**
4. Agrega un nuevo registro:
   - **Type**: A
   - **Name**: rrhh
   - **IPv4 address**: (IP que te dará Easypanel después del deploy)
   - **Proxy status**: ✅ Proxied (naranja)
   - **TTL**: Auto

### 3. Configurar Easypanel

#### 3.1 Crear Nuevo Proyecto
1. En Easypanel, crea un nuevo proyecto llamado "rrhh" o "piwi-rrhh"
2. Selecciona **Next.js** como tipo de aplicación

#### 3.2 Conectar con GitHub
1. Conecta tu repositorio de GitHub
2. Selecciona la rama `main` (o la que uses)
3. Easypanel detectará automáticamente que es Next.js

#### 3.3 Configurar Variables de Entorno
En la sección **Environment Variables** de Easypanel, agrega:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
NEXT_PUBLIC_SITE_URL=https://rrhh.piwisuite.cl
```

⚠️ **IMPORTANTE**: 
- `SUPABASE_SERVICE_ROLE_KEY` es SECRETO, nunca debe estar en el código
- `NEXT_PUBLIC_*` son públicas y se exponen al cliente (está bien)

#### 3.4 Configurar Dominio
1. En la sección **Domains** de Easypanel
2. Agrega: `rrhh.piwisuite.cl`
3. Easypanel te dará una IP o instrucciones para configurar DNS

#### 3.5 Build Settings
Easypanel debería detectar automáticamente:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Node Version**: 18.x o superior

#### 3.6 Deploy
1. Haz clic en **Deploy**
2. Espera a que termine el build
3. Verifica que no haya errores en los logs

---

## Verificación Post-Despliegue

### 1. Verificar que la App Funciona
- [ ] Acceder a `https://rrhh.piwisuite.cl`
- [ ] Verificar que carga la página de login
- [ ] Probar login con credenciales existentes

### 2. Verificar Variables de Entorno
- [ ] Login funciona correctamente
- [ ] Dashboard carga datos
- [ ] Las API routes de admin funcionan (si eres super_admin)

### 3. Verificar SSL/HTTPS
- [ ] El sitio carga con HTTPS (Cloudflare lo maneja automáticamente)
- [ ] No hay errores de certificado

### 4. Verificar Base de Datos
- [ ] Los datos se cargan correctamente
- [ ] Las operaciones CRUD funcionan
- [ ] Los PDFs se generan correctamente

---

## Configuración Adicional en Supabase

### URLs Permitidas para Autenticación
1. Ve a Supabase Dashboard → Authentication → URL Configuration
2. Agrega a **Redirect URLs**:
   - `https://rrhh.piwisuite.cl`
   - `https://rrhh.piwisuite.cl/login`
   - `https://rrhh.piwisuite.cl/**`

### Configuración de Dominio en Easypanel
- **URL Externa**: `https://rrhh.piwisuite.cl/`
- **URL Interna**: `http://piwisuite_rrhhpiwisuite_app:3002/`
- El puerto interno (3002) es manejado automáticamente por Easypanel

### RLS (Row Level Security)
Asegúrate de que todas las políticas RLS estén activas y funcionando correctamente.

---

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Verifica que todas las variables de entorno estén configuradas en Easypanel
- Asegúrate de que los nombres sean exactos (case-sensitive)

### Error: "Unauthorized" o problemas de autenticación
- Verifica que las URLs de redirect estén configuradas en Supabase
- Verifica que `NEXT_PUBLIC_SITE_URL` esté correcta

### Error: "Service role key not found" en operaciones admin
- Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté configurada en Easypanel
- Esta variable solo se usa en el servidor, nunca se expone al cliente

### El sitio no carga o muestra error 502
- Verifica los logs en Easypanel
- Asegúrate de que el build se completó exitosamente
- Verifica que el dominio esté correctamente configurado en Cloudflare

### Problemas con el dominio
- En Cloudflare, verifica que el registro A esté con "Proxied" (naranja)
- Espera unos minutos para que el DNS se propague
- Verifica que Easypanel tenga el dominio configurado

---

## Comandos Útiles

### Build Local (para probar antes de deploy)
```bash
npm run build
npm start
```

### Verificar variables de entorno localmente
```bash
# Crear .env.local con las variables
cp env.example .env.local
# Editar .env.local con tus valores reales
```

---

## Notas Importantes

1. **Seguridad**: Nunca subas `.env.local` o `.env` a GitHub (ya está en `.gitignore`)

2. **Service Role Key**: Esta key tiene acceso total a tu base de datos. Solo úsala en el servidor, nunca en el cliente.

3. **Updates**: Para actualizar la app después del primer deploy:
   - Haz push a GitHub
   - Easypanel debería detectar el cambio y hacer redeploy automático (si está configurado)
   - O haz deploy manual desde Easypanel

4. **Backups**: Asegúrate de tener backups de tu base de datos en Supabase

---

## Soporte

Si encuentras problemas durante el despliegue:
1. Revisa los logs en Easypanel
2. Verifica las variables de entorno
3. Revisa la configuración de Supabase
4. Verifica que el dominio esté correctamente configurado

