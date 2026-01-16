# Fix: Error "Failed to pull changes" en Easypanel

## 🔴 Problema

```
##########################################
### Pulling data from origin/main
### Fri, 16 Jan 2026 02:48:25 GMT
##########################################

##########################################
### Error
### Fri, 16 Jan 2026 02:48:26 GMT
##########################################

Failed to pull changes
```

## ✅ Solución: Verificar Configuración en Easypanel

### Paso 1: Verificar información del repositorio

**URL del repositorio:**
```
https://github.com/selffene-cyber/rrhh.piwisuite.git
```

**Ramas disponibles:**
- ✅ `main` (commit: 025d385)
- ✅ `desarrollo` (commit: ed04169)

### Paso 2: Configurar Easypanel correctamente

#### Opción A: Repositorio Público (Recomendado)

1. **Ir a GitHub:**
   - Abre: https://github.com/selffene-cyber/rrhh.piwisuite
   - Ve a **Settings** (Configuración)
   - Baja a **Danger Zone**
   - Click en **Change visibility**
   - Selecciona **Make public**

2. **En Easypanel:**
   - Ve a tu aplicación
   - Ve a **Source** o **Git**
   - Configura:
     ```
     Repository URL: https://github.com/selffene-cyber/rrhh.piwisuite.git
     Branch: main
     ```
   - NO necesitas credenciales si es público
   - Click **Save** y luego **Deploy**

#### Opción B: Repositorio Privado con Deploy Key (Más Seguro)

1. **En Easypanel - Obtener SSH Key:**
   - Ve a tu aplicación
   - Ve a **Source** o **Git**
   - Busca **Deploy Key** o **SSH Key**
   - Copia la clave pública SSH que te muestra

2. **En GitHub - Agregar Deploy Key:**
   - Ve a: https://github.com/selffene-cyber/rrhh.piwisuite/settings/keys
   - Click **Add deploy key**
   - Title: `Easypanel Deploy Key`
   - Key: Pega la clave SSH de Easypanel
   - ✅ Marca **Allow write access** (solo si es necesario)
   - Click **Add key**

3. **En Easypanel - Configurar con SSH:**
   - Repository URL: `git@github.com:selffene-cyber/rrhh.piwisuite.git`
   - Branch: `main`
   - Click **Save** y luego **Deploy**

#### Opción C: Personal Access Token (Alternativa)

1. **Crear Token en GitHub:**
   - Ve a: https://github.com/settings/tokens/new
   - Note: `Easypanel Deploy Token`
   - Expiration: `No expiration` o `1 year`
   - Selecciona scopes:
     - ✅ `repo` (Full control of private repositories)
   - Click **Generate token**
   - **COPIA EL TOKEN** (no lo verás de nuevo)

2. **En Easypanel:**
   - Repository URL: `https://github.com/selffene-cyber/rrhh.piwisuite.git`
   - Branch: `main`
   - Username: `tu-usuario-github`
   - Password/Token: Pega el token que copiaste
   - Click **Save** y luego **Deploy**

### Paso 3: Verificar configuración adicional

#### A. Verificar rama correcta

En Easypanel, asegúrate de que esté configurado:
```
Branch: main
```
NO uses `master` ni otra rama.

#### B. Verificar Dockerfile existe

El proyecto tiene Dockerfile en la raíz:
```
c:\Users\JEANS\OneDrive\Escritorio\Proyectos\ultima version rrhh\Dockerfile
```

#### C. Verificar Build Configuration

En Easypanel:
- Build Type: `Dockerfile` o `Docker`
- Dockerfile Path: `./Dockerfile` o `/Dockerfile`

### Paso 4: Forzar nuevo deploy

1. En Easypanel, ve a tu aplicación
2. Ve a **Deployments** o **Deploy**
3. Click en **Redeploy** o **Force Deploy**
4. Espera a que termine el proceso

## 🔍 Diagnóstico Adicional

### Verificar conectividad desde Easypanel

Si tienes acceso a terminal en Easypanel, ejecuta:

```bash
# Verificar si puede alcanzar GitHub
git ls-remote https://github.com/selffene-cyber/rrhh.piwisuite.git

# Debería mostrar:
# 025d3851424ebe52d4567a63c58d5ce797200a83	refs/heads/main
# ed04169ff773c71e38da4a252d5c3e7c1a0ef243	refs/heads/desarrollo
```

### Logs útiles

Busca en los logs de Easypanel mensajes como:
- `Permission denied (publickey)`  → Problema de SSH key
- `Authentication failed` → Token/credenciales incorrectos
- `Repository not found` → URL incorrecta
- `Could not resolve host` → Problema de red

## 📋 Checklist de Verificación

- [ ] Repositorio accesible (público o con Deploy Key/Token)
- [ ] URL correcta: `https://github.com/selffene-cyber/rrhh.piwisuite.git`
- [ ] Rama correcta: `main`
- [ ] Credenciales configuradas (si es privado)
- [ ] Dockerfile existe en la raíz
- [ ] Build Type configurado como Docker/Dockerfile

## 🎯 Solución Rápida (La más simple)

**Si quieres resolver rápido:**

1. **Hacer el repo público:**
   ```
   GitHub → Settings → Danger Zone → Change visibility → Make public
   ```

2. **En Easypanel:**
   - Repository: `https://github.com/selffene-cyber/rrhh.piwisuite.git`
   - Branch: `main`
   - NO pongas credenciales
   - Save → Deploy

3. **Si funciona pero quieres privacidad:**
   - Luego configura Deploy Key (Opción B arriba)
   - Vuelve a hacer el repo privado

## 🆘 Si nada funciona

1. **Elimina y recrea la app en Easypanel:**
   - Guarda todas las variables de entorno primero
   - Borra la app actual
   - Crea nueva app con GitHub desde cero

2. **Verifica que el commit está en GitHub:**
   ```bash
   # En tu máquina local
   git checkout main
   git pull origin main
   git push origin main --force
   ```

3. **Contacta soporte de Easypanel:**
   - Envía el error exacto
   - Menciona que es un repositorio de Next.js
   - Incluye la URL del repo

## ✅ Después de solucionar

Una vez que funcione:

1. **Configura autodeploy:**
   - En Easypanel, habilita "Auto Deploy on Push"
   - Cada push a `main` hará deploy automático

2. **Usa el flujo de trabajo normal:**
   ```bash
   # Trabajar en desarrollo
   git checkout desarrollo
   git add .
   git commit -m "Cambios"
   
   # Deploy a producción
   npm run deploy:main
   ```

3. **Easypanel detectará cambios automáticamente**

---

**Última actualización:** 16 de Enero de 2026  
**Estado repositorio:** ✅ Verificado y funcional  
**Commit actual en main:** `025d385`
