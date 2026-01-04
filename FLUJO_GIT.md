# Flujo de Trabajo Git - Proyecto RRHH

## Configuración Actual

- **Rama de Producción**: `main` (despliega en Easypanel)
- **Rama de Desarrollo**: `desarrollo` (trabajo local)

## Comandos Rápidos

### Trabajar en Desarrollo
```bash
# Cambiar a rama de desarrollo
git checkout desarrollo

# Hacer cambios y commits
git add .
git commit -m "Descripción de cambios"

# Probar que todo funciona
npm run build
npm run dev
```

### Cuando Todo Funciona - Subir a Producción
```bash
# 1. Cambiar a main
git checkout main

# 2. Fusionar cambios de desarrollo
git merge desarrollo

# 3. Subir a GitHub (Easypanel detecta y despliega)
git push origin main
```

### Si Algo Falla en Desarrollo
```bash
# Opción A: Descartar cambios y volver a main
git checkout main
git branch -D desarrollo  # Borra rama local (no afecta nada)

# Opción B: Arreglar en desarrollo
# (Seguir trabajando hasta que funcione)
```

### Crear Nueva Rama de Desarrollo
```bash
# Si borraste la rama, crear nueva
git checkout -b desarrollo
```

## Reglas Importantes

1. ✅ **Nunca trabajar directamente en `main`** (excepto emergencias)
2. ✅ **Siempre probar con `npm run build`** antes de fusionar a main
3. ✅ **Solo hacer `push` a main cuando estés seguro**
4. ✅ **Borrar rama local es seguro** - no afecta GitHub ni producción

## Estado Actual

- Estás en rama: `desarrollo`
- Cambios pendientes: Servicios de validación y menú de contratos
- Listo para: Probar y luego fusionar a main


