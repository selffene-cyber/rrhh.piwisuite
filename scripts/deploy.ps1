# Script PowerShell para hacer deploy: commit, merge y push a master
# Uso: npm run deploy:msg -- "mensaje del commit"
# O:   npm run deploy (usa mensaje por defecto)

# Obtener mensaje del commit desde argumentos
$CommitMessage = "Actualizacion desde desarrollo"

# Si hay argumentos pasados, unirlos como mensaje
if ($args.Count -gt 0) {
    $CommitMessage = $args -join " "
}

Write-Host "Iniciando deploy..." -ForegroundColor Cyan
Write-Host "   Mensaje: $CommitMessage" -ForegroundColor Gray

# Cambiar al directorio del proyecto (donde está el script)
# El script está en scripts/deploy.ps1, así que el repo está un nivel arriba
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptPath

# Cambiar al directorio del proyecto
Set-Location $repoRoot

# Verificar que estamos en un repositorio Git válido
# Buscar .git en el directorio actual o en directorios padre
$currentDir = $repoRoot
$foundGit = $false

while ($currentDir -ne $null -and $currentDir -ne "") {
    $gitPath = Join-Path $currentDir ".git"
    if (Test-Path $gitPath) {
        Set-Location $currentDir
        $foundGit = $true
        Write-Host "   Repositorio: $currentDir" -ForegroundColor Gray
        break
    }
    $parent = Split-Path -Parent $currentDir
    if ($parent -eq $currentDir) {
        break
    }
    $currentDir = $parent
}

if (-not $foundGit) {
    Write-Host "Error: No se encontro un repositorio Git en el directorio del proyecto" -ForegroundColor Red
    Write-Host "   Directorio buscado: $repoRoot" -ForegroundColor Yellow
    exit 1
}

# 1. Verificar que estamos en rama desarrollo
$currentBranch = git branch --show-current
if ($currentBranch -ne "desarrollo") {
    Write-Host "Error: Debes estar en la rama 'desarrollo'" -ForegroundColor Red
    Write-Host "   Rama actual: $currentBranch" -ForegroundColor Yellow
    Write-Host "   Ejecuta: git checkout desarrollo" -ForegroundColor Yellow
    exit 1
}

# 2. Verificar que hay cambios para commitear
# Usar --untracked-files=no para ignorar archivos no rastreados fuera del repo
$status = git status --porcelain --untracked-files=no
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No hay cambios para commitear" -ForegroundColor Yellow
} else {
    Write-Host "Haciendo commit..." -ForegroundColor Green
    # Agregar solo archivos modificados y rastreados
    git add -u
    # Verificar que hay algo staged
    $staged = git diff --cached --name-only
    if ([string]::IsNullOrWhiteSpace($staged)) {
        Write-Host "No hay cambios relevantes para commitear" -ForegroundColor Yellow
    } else {
        git commit -m $CommitMessage
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error al hacer commit" -ForegroundColor Red
            exit 1
        }
    }
}

# 3. Obtener los últimos cambios de master desde GitHub
Write-Host "Obteniendo ultimos cambios de master desde GitHub..." -ForegroundColor Cyan
git fetch origin master
if ($LASTEXITCODE -ne 0) {
    Write-Host "Advertencia: No se pudo obtener cambios de origin/master" -ForegroundColor Yellow
}

# 4. Cambiar a master (crear si no existe localmente)
Write-Host "Cambiando a rama master..." -ForegroundColor Cyan
$masterExists = git show-ref --verify --quiet refs/heads/master
if ($LASTEXITCODE -ne 0) {
    # Master no existe localmente, crearla desde origin/master si existe
    $originMasterExists = git show-ref --verify --quiet refs/remotes/origin/master
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Creando rama master local desde origin/master..." -ForegroundColor Gray
        git checkout -b master origin/master
    } else {
        # Si no existe ni local ni remoto, crear desde main o desarrollo
        Write-Host "   Creando rama master desde desarrollo..." -ForegroundColor Gray
        git checkout -b master
    }
} else {
    git checkout master
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al cambiar a master" -ForegroundColor Red
    exit 1
}

# 5. Fusionar desarrollo en master
Write-Host "Fusionando desarrollo en master..." -ForegroundColor Cyan
git merge desarrollo --no-edit
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al fusionar. Resuelve los conflictos manualmente." -ForegroundColor Red
    Write-Host "   Ejecuta: git merge --abort para cancelar" -ForegroundColor Yellow
    exit 1
}

# 6. Push a GitHub (master)
Write-Host "Subiendo a GitHub (rama master)..." -ForegroundColor Cyan
git push origin master
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al subir a GitHub" -ForegroundColor Red
    Write-Host "   Verifica tu conexion y permisos" -ForegroundColor Yellow
    exit 1
}

# 7. Volver a desarrollo
Write-Host "Volviendo a rama desarrollo..." -ForegroundColor Cyan
git checkout desarrollo

Write-Host ""
Write-Host "Deploy completado exitosamente!" -ForegroundColor Green
Write-Host "   La rama master en GitHub ha sido actualizada" -ForegroundColor Green
Write-Host "   Easypanel deberia detectar los cambios y desplegar automaticamente" -ForegroundColor Green
Write-Host "   Repositorio: https://github.com/selffene-cyber/rrhh.piwisuite.git" -ForegroundColor Gray
