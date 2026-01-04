# Plan de Limpieza del Repositorio Git

## Problemas Identificados

1. ✅ **Archivos .next rastreados**: Los archivos `.next` estaban siendo rastreados por Git aunque deberían estar ignorados
2. ⚠️ **Archivos grandes en el historial**: Hay archivos grandes (>.next/cache y node_modules) en el historial de Git que exceden el límite de 100MB de GitHub
3. ⚠️ **Ramas remotas innecesarias**: Existen varias ramas remotas que no son necesarias

## Soluciones Aplicadas

### 1. Eliminación de archivos .next del índice
- ✅ Commit realizado eliminando todos los archivos `.next` del repositorio
- ✅ `.gitignore` actualizado para excluir `.next/` y `.next/cache/**`

### 2. Limpieza del historial de Git (PENDIENTE)

**Opción A: Usar git filter-repo (Recomendado)**
```bash
# Instalar git-filter-repo primero
pip install git-filter-repo

# Eliminar archivos grandes del historial
git filter-repo --path .next --invert-paths
git filter-repo --path node_modules/@next/swc-win32-x64-msvc --invert-paths
```

**Opción B: Crear nueva rama limpia (Más simple, pero pierde historial)**
```bash
# Crear una nueva rama sin historial problemático
git checkout --orphan main-clean
git add .
git commit -m "Initial commit - repositorio limpio"
git branch -D main
git branch -m main
git push -f origin main
```

**Opción C: Usar BFG Repo-Cleaner**
```bash
# Descargar BFG Repo-Cleaner
# Eliminar archivos grandes
java -jar bfg.jar --delete-folders .next
java -jar bfg.jar --delete-folders node_modules/@next/swc-win32-x64-msvc
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### 3. Limpieza de ramas

Las siguientes ramas remotas ya no existen o fueron eliminadas:
- ALERT-TOOLTIPS
- ModuloFiniquitos
- TenatUser-MultiRH
- develop-upgrade
- gemini-asistente
- master

**Ramas a mantener:**
- `main` (rama principal)
- `desarrollo` (rama de desarrollo)

## Estado Actual

- ✅ Commit de eliminación de .next realizado
- ✅ .gitignore actualizado
- ⚠️ Push bloqueado por archivos grandes en el historial
- ⚠️ Necesita limpieza del historial antes de poder hacer push

## Próximos Pasos

1. Ejecutar limpieza del historial usando una de las opciones anteriores
2. Hacer push forzado de la rama main limpia
3. Crear/actualizar rama desarrollo en el remoto
4. Verificar que solo existan las ramas main y desarrollo

