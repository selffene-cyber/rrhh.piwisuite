# Guía: Configuración de CRON_SECRET y Vercel Cron

## 📋 Resumen Rápido

**¡Buenas noticias!** El cron job de Vercel **YA ESTÁ CONFIGURADO** y funcionará automáticamente cuando despliegues a Vercel. No necesitas hacer nada adicional.

El `CRON_SECRET` es **OPCIONAL** y solo lo necesitas si quieres:
- Llamar manualmente al endpoint desde fuera de Vercel
- Probar el endpoint localmente o desde otro servicio
- Tener una capa extra de seguridad

---

## ✅ ¿Qué está configurado automáticamente?

### 1. Cron Job en Vercel
El archivo `vercel.json` ya tiene configurado el cron job:

```json
{
  "crons": [
    {
      "path": "/api/compliance/cron",
      "schedule": "0 0 * * *"  // Todos los días a medianoche
    }
  ]
}
```

**Esto significa que:**
- ✅ Vercel ejecutará automáticamente el endpoint `/api/compliance/cron` todos los días a las 00:00 (medianoche)
- ✅ Vercel agregará automáticamente el header `x-vercel-cron` a la solicitud
- ✅ El endpoint detectará este header y permitirá la ejecución
- ✅ **NO necesitas hacer nada más** - funcionará automáticamente al desplegar

---

## 🔐 ¿Cuándo necesitas CRON_SECRET?

Solo necesitas configurar `CRON_SECRET` si quieres:

1. **Probar el endpoint manualmente** desde tu navegador o Postman
2. **Llamar al endpoint desde otro servicio** (no Vercel)
3. **Ejecutar el cron desde un servicio externo** (ej: EasyCron, cron-job.org)

**Si solo usas Vercel Cron, NO necesitas CRON_SECRET.**

---

## 📝 Cómo configurar CRON_SECRET (Paso a Paso)

### Opción 1: En Vercel Dashboard (Recomendado)

1. **Ve a tu proyecto en Vercel**
   - https://vercel.com/dashboard
   - Selecciona tu proyecto

2. **Ve a Settings → Environment Variables**
   - En el menú lateral, haz clic en "Settings"
   - Luego en "Environment Variables"

3. **Agrega la variable**
   - **Key**: `CRON_SECRET`
   - **Value**: Genera un secreto aleatorio (ej: `mi-secreto-super-seguro-12345`)
   - **Environments**: Selecciona "Production", "Preview", y "Development" según necesites
   - Haz clic en "Save"

4. **Redeploy tu aplicación**
   - Ve a "Deployments"
   - Haz clic en los tres puntos (⋯) del último deployment
   - Selecciona "Redeploy"
   - Esto aplicará la nueva variable de entorno

### Opción 2: Desde la CLI de Vercel

```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Login
vercel login

# Agregar variable de entorno
vercel env add CRON_SECRET

# Te pedirá el valor - ingresa tu secreto
# Selecciona los ambientes (Production, Preview, Development)
```

### Opción 3: En archivo .env.local (Solo desarrollo local)

Si quieres probar localmente:

1. Crea o edita `.env.local` en la raíz del proyecto:

```env
CRON_SECRET=mi-secreto-para-desarrollo
```

2. Reinicia tu servidor de desarrollo:

```bash
npm run dev
```

---

## 🧪 Cómo probar el endpoint manualmente

### Sin CRON_SECRET (solo funciona desde Vercel Cron)

Si intentas llamar al endpoint manualmente sin `CRON_SECRET`, recibirás un error 401:

```bash
# Esto NO funcionará (401 Unauthorized)
curl https://tu-app.vercel.app/api/compliance/cron
```

### Con CRON_SECRET configurado

Si configuraste `CRON_SECRET`, puedes llamarlo así:

```bash
# Reemplaza TU_SECRET con el valor que configuraste
curl -H "Authorization: Bearer TU_SECRET" \
  https://tu-app.vercel.app/api/compliance/cron
```

O desde Postman/Thunder Client:
- **URL**: `https://tu-app.vercel.app/api/compliance/cron`
- **Method**: GET
- **Headers**:
  - `Authorization`: `Bearer TU_SECRET`

---

## 🔒 Seguridad: Generar un buen CRON_SECRET

Para generar un secreto seguro, puedes usar:

### Opción 1: Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Opción 2: Online
- https://randomkeygen.com/
- Usa una "CodeIgniter Encryption Keys" (32 caracteres)

### Opción 3: Manual
Cualquier string largo y aleatorio, por ejemplo:
```
mi-super-secreto-cron-2024-xyz123-abc456
```

**Recomendación**: Usa al menos 32 caracteres aleatorios.

---

## ✅ Verificación

### Verificar que el cron funciona automáticamente

1. **Espera a que se ejecute** (medianoche según tu timezone de Vercel)
2. **Ve a Vercel Dashboard → Deployments**
3. **Haz clic en el deployment más reciente**
4. **Ve a "Functions" → `/api/compliance/cron`**
5. **Revisa los logs** - deberías ver:
   ```
   Recalculando estados de cumplimientos...
   Generando notificaciones automáticas...
   ```

### Verificar manualmente (con CRON_SECRET)

```bash
# Reemplaza con tus valores reales
curl -H "Authorization: Bearer TU_CRON_SECRET" \
  https://tu-app.vercel.app/api/compliance/cron
```

Deberías recibir una respuesta JSON:
```json
{
  "success": true,
  "message": "Job de cumplimientos ejecutado correctamente",
  "stats": {
    "compliance_status": {...},
    "unread_notifications": 0
  },
  "timestamp": "2024-01-15T00:00:00.000Z"
}
```

---

## 🎯 Resumen

| Escenario | ¿Necesitas CRON_SECRET? | ¿Qué hacer? |
|-----------|------------------------|-------------|
| **Solo usar Vercel Cron automático** | ❌ NO | Nada - ya está configurado |
| **Probar manualmente desde navegador/Postman** | ✅ SÍ | Configurar en Vercel Dashboard |
| **Llamar desde otro servicio externo** | ✅ SÍ | Configurar en Vercel Dashboard |
| **Desarrollo local** | ✅ SÍ (opcional) | Agregar a `.env.local` |

---

## 🚨 Troubleshooting

### El cron no se ejecuta automáticamente

1. **Verifica que `vercel.json` esté en la raíz del proyecto**
2. **Verifica que el deployment esté en Vercel** (no en otro servicio)
3. **Revisa los logs en Vercel Dashboard → Functions**
4. **Verifica la zona horaria** - Vercel usa UTC por defecto

### Error 401 al llamar manualmente

- Si NO configuraste `CRON_SECRET`: Es normal - solo funciona desde Vercel Cron
- Si SÍ configuraste `CRON_SECRET`: Verifica que el header sea exactamente `Authorization: Bearer TU_SECRET`

### El cron se ejecuta pero hay errores

- Revisa los logs en Vercel Dashboard
- Verifica que las funciones SQL (`recalculate_compliance_status`, `generate_compliance_notifications`) existan en Supabase
- Verifica que las migraciones estén aplicadas

---

## 📚 Referencias

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)






