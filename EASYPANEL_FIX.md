# 🚀 Solución Rápida para Easypanel - Failed to Pull Changes

## Pasos Inmediatos

### 1. Verificar que master está actualizado en GitHub

Ejecuta localmente:
```bash
git checkout master
git push origin master
```

### 2. Configurar en Easypanel

#### Si el repositorio es PRIVADO:

**Opción A: Usar Personal Access Token (Recomendado)**

1. Crear token en GitHub:
   - https://github.com/settings/tokens/new
   - Nombre: "Easypanel Deploy"
   - Permisos: Marca `repo` (Full control of private repositories)
   - Click "Generate token"
   - **COPIA EL TOKEN** (solo se muestra una vez)

2. En Easypanel:
   - Ve a la configuración de tu app/servicio
   - Busca "Git Repository" o "Source Code"
   - URL del repositorio: `https://github.com/selffene-cyber/rrhh.piwisuite.git`
   - **Username**: Tu usuario de GitHub (o cualquier texto)
   - **Password/Token**: Pega el token que copiaste
   - Rama: `master`

#### Si el repositorio es PÚBLICO:

1. En Easypanel:
   - URL: `https://github.com/selffene-cyber/rrhh.piwisuite.git`
   - Rama: `master`
   - No necesitas credenciales

### 3. Limpiar el entorno en Easypanel (si hay cambios locales)

Si Easypanel tiene cambios locales que causan conflictos:

**Opción 1: Resetear el repositorio en Easypanel**
- En la configuración del servicio, busca "Reset Repository" o similar
- Esto limpiará cambios locales

**Opción 2: Configurar para hacer force pull**
- Algunos paneles tienen opción "Force Pull" o "Reset and Pull"
- Esto descarta cambios locales y trae los de GitHub

### 4. Verificar la configuración

En Easypanel, asegúrate de:

```
Repository URL: https://github.com/selffene-cyber/rrhh.piwisuite.git
Branch: master
Working Directory: (dejar vacío o usar la raíz del proyecto)
```

### 5. Hacer el repositorio público (solución temporal)

Si necesitas una solución rápida y no te importa que sea público:

1. Ve a: https://github.com/selffene-cyber/rrhh.piwisuite/settings
2. Scroll hasta "Danger Zone"
3. Click "Change visibility" → "Make public"

**Luego en Easypanel:**
- No necesitas credenciales
- Solo configura la URL y rama `master`

## Verificación

Después de configurar, intenta hacer deploy nuevamente. Si sigue fallando:

1. Revisa los logs completos en Easypanel
2. Verifica que el token tenga permisos `repo`
3. Asegúrate de que la rama `master` existe en GitHub

## Comando para verificar master en GitHub

```bash
git ls-remote https://github.com/selffene-cyber/rrhh.piwisuite.git master
```

Debería mostrar un hash de commit. Si no muestra nada, la rama no existe.


