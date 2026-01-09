# Script para sincronizar main con desarrollo (solo local, sin push)
# Uso: npm run sync:main

Write-Host "Iniciando sincronizacion de main con desarrollo..." -ForegroundColor Cyan

# 1. Verificar que estamos en rama desarrollo
$CURRENT_BRANCH = git branch --show-current
if ($CURRENT_BRANCH -ne "desarrollo") {
    Write-Host "Error: Debes estar en la rama desarrollo" -ForegroundColor Red
    Write-Host "   Rama actual: $CURRENT_BRANCH" -ForegroundColor Yellow
    Write-Host "   Ejecuta: git checkout desarrollo" -ForegroundColor Yellow
    exit 1
}

Write-Host "Estas en la rama desarrollo" -ForegroundColor Green

# 2. Verificar si hay cambios sin commitear
$STATUS = git status --porcelain
if ($STATUS) {
    Write-Host "Hay cambios sin commitear en desarrollo" -ForegroundColor Yellow
    $RESPONSE = Read-Host "Deseas hacer commit de estos cambios? (s/n)"
    if ($RESPONSE -eq "s" -or $RESPONSE -eq "S") {
        Write-Host "Agregando cambios..." -ForegroundColor Cyan
        git add .
        
        $COMMIT_MESSAGE = Read-Host "Ingresa el mensaje del commit (o Enter para mensaje por defecto)"
        if ([string]::IsNullOrWhiteSpace($COMMIT_MESSAGE)) {
            $COMMIT_MESSAGE = "Actualizacion desde desarrollo"
        }
        
        Write-Host "Haciendo commit..." -ForegroundColor Cyan
        git commit -m $COMMIT_MESSAGE
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error al hacer commit" -ForegroundColor Red
            exit 1
        }
        Write-Host "Commit realizado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "No se hizo commit. Continuando con la sincronizacion..." -ForegroundColor Yellow
    }
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

# 5. Volver a rama desarrollo
Write-Host "Volviendo a rama desarrollo..." -ForegroundColor Cyan
git checkout desarrollo
if ($LASTEXITCODE -ne 0) {
    Write-Host "Advertencia: No se pudo volver a desarrollo automaticamente" -ForegroundColor Yellow
    Write-Host "   Ejecuta manualmente: git checkout desarrollo" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Sincronizacion completada exitosamente!" -ForegroundColor Green
Write-Host "   - Main actualizada con desarrollo (solo local)" -ForegroundColor White
Write-Host "   - Estas de vuelta en rama desarrollo" -ForegroundColor White
Write-Host ""
Write-Host "Para hacer deploy a GitHub, ejecuta: npm run deploy:main" -ForegroundColor Cyan










