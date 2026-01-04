# Script para actualizar main desde desarrollo y hacer deploy a GitHub
# Uso: npm run deploy:main

Write-Host "Iniciando proceso de deploy a main..." -ForegroundColor Cyan

# 1. Verificar que estamos en rama desarrollo
$CURRENT_BRANCH = git branch --show-current
if ($CURRENT_BRANCH -ne "desarrollo") {
    Write-Host "Error: Debes estar en la rama desarrollo" -ForegroundColor Red
    Write-Host "   Rama actual: $CURRENT_BRANCH" -ForegroundColor Yellow
    Write-Host "   Ejecuta: git checkout desarrollo" -ForegroundColor Yellow
    exit 1
}

Write-Host "Estas en la rama desarrollo" -ForegroundColor Green

# 2. Verificar que no hay cambios sin commitear (solo archivos rastreados)
$STATUS = git status --porcelain --untracked-files=no
if ($STATUS) {
    Write-Host "Advertencia: Hay cambios sin commitear en desarrollo (archivos rastreados)" -ForegroundColor Yellow
    Write-Host "   Los cambios no rastreados se ignoran automaticamente" -ForegroundColor Yellow
    Write-Host "   Cambios detectados:" -ForegroundColor Yellow
    git status --short --untracked-files=no | ForEach-Object { Write-Host "     $_" -ForegroundColor Yellow }
    Write-Host ""
    $RESPONSE = Read-Host "Deseas continuar de todas formas? (s/n)"
    if ($RESPONSE -ne "s" -and $RESPONSE -ne "S") {
        Write-Host "Operacion cancelada" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "No hay cambios sin commitear en archivos rastreados" -ForegroundColor Green
}

# 3. Cambiar a rama main
Write-Host "Cambiando a rama main..." -ForegroundColor Cyan
git checkout main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al cambiar a rama main" -ForegroundColor Red
    exit 1
}

# 4. Actualizar main con el contenido de desarrollo
Write-Host "Actualizando main con el contenido de desarrollo..." -ForegroundColor Cyan
git reset --hard desarrollo
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al actualizar main" -ForegroundColor Red
    git checkout desarrollo
    exit 1
}
Write-Host "Main actualizada correctamente" -ForegroundColor Green

# 5. Hacer build del proyecto
Write-Host "Ejecutando build del proyecto..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en el build. Revisa los errores antes de continuar" -ForegroundColor Red
    Write-Host "Volviendo a rama desarrollo..." -ForegroundColor Yellow
    git checkout desarrollo
    exit 1
}
Write-Host "Build completado exitosamente" -ForegroundColor Green

# 6. Push a GitHub (solo main)
Write-Host "Subiendo cambios a GitHub (rama main)..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al subir cambios a GitHub" -ForegroundColor Red
    Write-Host "Volviendo a rama desarrollo..." -ForegroundColor Yellow
    git checkout desarrollo
    exit 1
}
Write-Host "Cambios subidos a GitHub exitosamente" -ForegroundColor Green

# 7. Volver a rama desarrollo
Write-Host "Volviendo a rama desarrollo..." -ForegroundColor Cyan
git checkout desarrollo
if ($LASTEXITCODE -ne 0) {
    Write-Host "Advertencia: No se pudo volver a desarrollo automaticamente" -ForegroundColor Yellow
    Write-Host "   Ejecuta manualmente: git checkout desarrollo" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Deploy completado exitosamente!" -ForegroundColor Green
Write-Host "   - Main actualizada con desarrollo" -ForegroundColor White
Write-Host "   - Build verificado correctamente" -ForegroundColor White
Write-Host "   - Cambios subidos a GitHub" -ForegroundColor White
Write-Host "   - Estas de vuelta en rama desarrollo" -ForegroundColor White
Write-Host ""
Write-Host "Easypanel detectara los cambios automaticamente" -ForegroundColor Cyan
