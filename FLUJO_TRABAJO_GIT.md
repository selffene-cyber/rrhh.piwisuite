# Flujo de Trabajo Git - RRHH Piwi Suite

## 📋 Resumen

Este proyecto utiliza un flujo de trabajo con dos ramas principales:
- **`desarrollo`**: Rama de trabajo diario (TÚ TRABAJAS AQUÍ)
- **`main`**: Rama de producción (se actualiza solo para deploy)

## 🔄 Ramas Configuradas

### Rama `desarrollo`
- Es tu rama de trabajo principal
- Aquí haces todos tus cambios y commits
- Puedes experimentar libremente
- Sincronizada con GitHub

### Rama `main`
- Solo para producción
- Se actualiza desde `desarrollo` usando comandos npm
- Conectada a Easypanel para deploy automático
- NO hacer cambios directos aquí

## 🚀 Comandos Disponibles

### 1. **Desarrollo normal**

```bash
# Trabajar en desarrollo (siempre usa esta rama)
git checkout desarrollo

# Hacer cambios y commit
git add .
git commit -m "Tu mensaje descriptivo"
git push origin desarrollo
```

### 2. **Sincronizar main (solo local)**

```bash
npm run sync:main
```

**¿Qué hace?**
- Verifica que estés en rama `desarrollo`
- Te pregunta si quieres commitear cambios pendientes
- Cambia a `main` y la actualiza con `desarrollo`
- Vuelve a `desarrollo` automáticamente
- **NO** hace push a GitHub

**Cuándo usarlo:**
- Para ver cómo quedaría `main` sin hacer deploy
- Para verificar antes de hacer el deploy final

### 3. **Deploy a producción (GitHub + Easypanel)**

```bash
npm run deploy:main
```

**¿Qué hace?**
1. Verifica que estés en rama `desarrollo`
2. Detecta cambios sin commitear y te advierte
3. Cambia a `main` y la actualiza con `desarrollo`
4. **Ejecuta el build** (npm run build) para verificar que compile
5. Si el build es exitoso, hace **push a GitHub**
6. Vuelve a `desarrollo` automáticamente

**Cuándo usarlo:**
- Cuando quieras actualizar producción
- Easypanel detectará los cambios automáticamente
- Solo si estás seguro de que todo funciona

## 📝 Flujo de Trabajo Recomendado

### Día a día:

1. **Asegúrate de estar en desarrollo**
   ```bash
   git checkout desarrollo
   ```

2. **Trabaja normalmente**
   ```bash
   # Hacer cambios...
   git add .
   git commit -m "Descripción de cambios"
   git push origin desarrollo
   ```

3. **Cuando quieras actualizar producción**
   ```bash
   npm run deploy:main
   ```

4. **El script automáticamente:**
   - Actualiza `main`
   - Hace build
   - Sube a GitHub
   - Te devuelve a `desarrollo`

## ⚠️ Reglas Importantes

1. **SIEMPRE trabaja en `desarrollo`**
   - Nunca hagas cambios directos en `main`
   - La rama `main` se actualiza solo con los comandos npm

2. **Antes de deploy:**
   - Asegúrate de que el código funcione
   - Prueba localmente con `npm run dev`
   - Commitea todos los cambios importantes

3. **Si el build falla:**
   - El script `deploy:main` NO hará push a GitHub
   - Te devolverá a `desarrollo` automáticamente
   - Corrige los errores y vuelve a intentar

4. **Easypanel:**
   - Está configurado para escuchar cambios en `main`
   - Cada vez que haces `npm run deploy:main`, Easypanel hace deploy automático

## 🎯 Ejemplos Prácticos

### Ejemplo 1: Agregar una nueva funcionalidad

```bash
# 1. Asegúrate de estar en desarrollo
git checkout desarrollo

# 2. Haz tus cambios...

# 3. Guarda los cambios
git add .
git commit -m "feat: Agregar módulo de reportes avanzados"
git push origin desarrollo

# 4. Cuando esté listo para producción
npm run deploy:main
```

### Ejemplo 2: Corregir un bug urgente

```bash
# 1. En desarrollo
git checkout desarrollo

# 2. Corrige el bug...

# 3. Commit rápido
git add .
git commit -m "fix: Corregir error en cálculo de vacaciones"

# 4. Deploy inmediato
npm run deploy:main
```

### Ejemplo 3: Probar antes de deploy

```bash
# 1. Hacer cambios en desarrollo
git add .
git commit -m "Cambios varios"

# 2. Sincronizar main localmente (sin push)
npm run sync:main

# 3. Si todo está bien, hacer deploy real
npm run deploy:main
```

## 🔍 Verificar Estado Actual

```bash
# Ver en qué rama estás
git branch

# Ver estado de cambios
git status

# Ver últimos commits
git log --oneline -n 5

# Ver todas las ramas (locales y remotas)
git branch -a
```

## 📊 Estado Actual del Proyecto

✅ **Configuración completada:**
- ✅ Rama `desarrollo` creada y configurada
- ✅ Rama `main` actualizada con último código funcional
- ✅ Ambas ramas sincronizadas con GitHub
- ✅ Build exitoso (121 páginas generadas)
- ✅ Scripts npm configurados y funcionales

**Estás actualmente en:** `desarrollo` (rama de trabajo)

## 🆘 Solución de Problemas

### "Error: Debes estar en la rama desarrollo"
```bash
git checkout desarrollo
```

### "Hay cambios sin commitear"
```bash
git add .
git commit -m "Descripción de cambios"
```

### "Error en el build"
```bash
# El script te devuelve a desarrollo automáticamente
# Corrige los errores y vuelve a intentar
npm run build  # Para probar el build localmente
```

### Forzar actualización de main (uso avanzado)
```bash
# Solo si sabes lo que haces
git checkout main
git reset --hard desarrollo
git push origin main --force
git checkout desarrollo
```

## 📞 Resumen de Comandos

| Comando | Descripción |
|---------|-------------|
| `git checkout desarrollo` | Cambiar a rama de trabajo |
| `git add .` | Agregar cambios |
| `git commit -m "..."` | Guardar cambios |
| `git push origin desarrollo` | Subir cambios a GitHub |
| `npm run sync:main` | Sincronizar main localmente |
| `npm run deploy:main` | Deploy completo a producción |
| `npm run build` | Probar build localmente |
| `npm run dev` | Ejecutar servidor de desarrollo |

---

**Última actualización:** 15 de Enero de 2026
**Commit actual:** `025d385` - Fix: Corregir errores de TypeScript en build de producción
