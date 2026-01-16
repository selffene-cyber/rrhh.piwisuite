# 🔧 Solución de Problemas - Easypanel Deploy

## Error: "Failed to pull changes" desde origin/master

Este error generalmente ocurre por:
1. **Problemas de autenticación** (repositorio privado sin credenciales)
2. **Cambios locales en Easypanel** que entran en conflicto
3. **Configuración incorrecta** de la URL o rama

### Diagnóstico Rápido

Verifica estos puntos en Easypanel:
- ✅ URL del repositorio es correcta
- ✅ Rama configurada es `master` (no `main`)
- ✅ Si el repo es privado, hay credenciales configuradas
- ✅ No hay cambios locales pendientes en el entorno de Easypanel

## Soluciones

### 1. Verificar que el repositorio sea accesible

El repositorio debe ser:
- **Público**: Accesible sin autenticación
- **Privado**: Requiere configuración de credenciales en Easypanel

**Repositorio actual:** https://github.com/selffene-cyber/rrhh.piwisuite.git

### 2. Configurar autenticación en Easypanel

Si el repositorio es **privado**, necesitas:

#### Opción A: Personal Access Token (PAT) de GitHub

1. Crear un token en GitHub:
   - Ve a: https://github.com/settings/tokens
   - Click en "Generate new token (classic)"
   - Selecciona permisos: `repo` (acceso completo a repositorios)
   - Copia el token generado

2. Configurar en Easypanel:
   - En la configuración del servicio/app
   - Busca "Git Repository" o "Source"
   - Usa la URL: `https://[TOKEN]@github.com/selffene-cyber/rrhh.piwisuite.git`
   - O configura el token en la sección de credenciales

#### Opción B: SSH Key

1. Generar clave SSH (si no tienes):
   ```bash
   ssh-keygen -t ed25519 -C "easypanel-deploy"
   ```

2. Agregar clave pública a GitHub:
   - Ve a: https://github.com/settings/keys
   - Click en "New SSH key"
   - Pega la clave pública (`~/.ssh/id_ed25519.pub`)

3. Configurar en Easypanel:
   - Usa la URL SSH: `git@github.com:selffene-cyber/rrhh.piwisuite.git`
   - Agrega la clave privada en la configuración de SSH

### 3. Verificar configuración en Easypanel

Asegúrate de que:

- ✅ **URL del repositorio** sea correcta:
  - HTTPS: `https://github.com/selffene-cyber/rrhh.piwisuite.git`
  - SSH: `git@github.com:selffene-cyber/rrhh.piwisuite.git`

- ✅ **Rama** esté configurada como: `master`

- ✅ **Directorio de trabajo** (si aplica) esté correcto

- ✅ **Credenciales** estén configuradas si el repo es privado

### 4. Verificar que la rama master existe

Ejecuta localmente:
```bash
git ls-remote origin master
```

Debería mostrar un hash de commit. Si no muestra nada, la rama no existe en GitHub.

### 5. Hacer el repositorio público (solución rápida)

Si no necesitas que sea privado:

1. Ve a: https://github.com/selffene-cyber/rrhh.piwisuite/settings
2. Scroll hasta "Danger Zone"
3. Click en "Change visibility" → "Make public"

**Nota:** Esto hará el código visible públicamente.

### 6. Verificar logs en Easypanel

Revisa los logs completos del deploy en Easypanel para ver el error específico:
- Puede mostrar si es un problema de autenticación
- Puede mostrar si la rama no existe
- Puede mostrar problemas de red

## Comandos útiles para verificar

```bash
# Verificar que master existe en GitHub
git ls-remote origin master

# Verificar ramas remotas
git branch -r

# Verificar configuración del remoto
git remote -v

# Forzar actualización de referencias
git fetch origin --prune
```

## Solución rápida: Actualizar master manualmente

Si necesitas actualizar master ahora mismo:

```bash
# Desde desarrollo
git checkout master
git merge desarrollo
git push origin master
```

O usa el script:
```bash
npm run deploy:msg -- "Actualizacion manual"
```

## Contacto

Si el problema persiste:
1. Revisa los logs completos en Easypanel
2. Verifica la configuración de GitHub (permisos, tokens)
3. Verifica la configuración en Easypanel (URL, credenciales, rama)

