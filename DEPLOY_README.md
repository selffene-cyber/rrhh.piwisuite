# 🚀 Comando de Deploy Automatizado

## Uso Rápido

### Opción 1: Con mensaje personalizado
```bash
npm run deploy:msg -- "Agregué validación de contratos"
```

**Nota:** Usa `--` para pasar el mensaje como argumento.

### Opción 2: Con mensaje por defecto
```bash
npm run deploy
```
Usa el mensaje: "Actualización desde desarrollo"

## ¿Qué hace el script?

1. ✅ Verifica que estés en rama `desarrollo`
2. ✅ Hace commit de todos los cambios (si hay)
3. ✅ Obtiene los últimos cambios de `master` desde GitHub
4. ✅ Cambia a rama `master` (la crea si no existe)
5. ✅ Fusiona `desarrollo` en `master`
6. ✅ Sube cambios a GitHub (`push origin master`)
7. ✅ Vuelve a rama `desarrollo`

## Ejemplo Completo

```bash
# 1. Trabajar en desarrollo
git checkout desarrollo

# 2. Hacer cambios en el código...

# 3. Deploy automático con mensaje
npm run deploy:msg -- "Agregué validación de contratos activos"

# O sin mensaje (usa el por defecto)
npm run deploy
```

## Requisitos

- ✅ Debes estar en la rama `desarrollo`
- ✅ Debes tener permisos para hacer push a GitHub
- ✅ El repositorio remoto debe estar configurado

## Validaciones de Seguridad

El script incluye:
- ✅ Solo funciona desde rama `desarrollo`
- ✅ Se detiene si hay errores en cualquier paso
- ✅ No hace push forzado
- ✅ Vuelve a desarrollo al finalizar

## Si hay errores

- **Conflictos de merge**: El script se detiene, resuelve manualmente
- **Error de push**: Verifica tu conexión y permisos de GitHub
- **No estás en desarrollo**: El script te indica que cambies de rama

## Repositorio

- GitHub: https://github.com/selffene-cyber/rrhh.piwisuite.git
- Rama de producción: `master`
- Easypanel despliega automáticamente cuando detecta cambios en `master`
