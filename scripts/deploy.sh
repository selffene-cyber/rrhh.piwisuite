#!/bin/bash
# Script para hacer deploy: commit, merge y push a main
# Uso: npm run deploy "mensaje del commit"

set -e  # Salir si hay error

COMMIT_MESSAGE=${1:-"Actualización desde desarrollo"}

echo "🚀 Iniciando deploy..."

# 1. Verificar que estamos en rama desarrollo
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "desarrollo" ]; then
  echo "❌ Error: Debes estar en la rama 'desarrollo'"
  echo "   Rama actual: $CURRENT_BRANCH"
  echo "   Ejecuta: git checkout desarrollo"
  exit 1
fi

# 2. Verificar que hay cambios para commitear
if [ -z "$(git status --porcelain)" ]; then
  echo "⚠️  No hay cambios para commitear"
else
  echo "📝 Haciendo commit..."
  git add .
  git commit -m "$COMMIT_MESSAGE"
fi

# 3. Cambiar a master
echo "🔄 Cambiando a rama master..."
git checkout master

# 4. Fusionar desarrollo en master
echo "🔀 Fusionando desarrollo en master..."
git merge desarrollo --no-edit

# 5. Push a GitHub
echo "📤 Subiendo a GitHub..."
git push origin master

# 6. Volver a desarrollo
echo "🔙 Volviendo a rama desarrollo..."
git checkout desarrollo

echo "✅ Deploy completado exitosamente!"
echo "   Easypanel debería detectar los cambios y desplegar automáticamente"

