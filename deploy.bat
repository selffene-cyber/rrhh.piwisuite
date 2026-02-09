@echo off
echo ========================================
echo Build y Deploy del Proyecto
echo ========================================
echo.

echo [1/5] Ejecutando build...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: El build fallo. Revisa los errores arriba.
    pause
    exit /b 1
)
echo Build completado exitosamente!
echo.

echo [2/5] Agregando archivos a git...
git add .
if %errorlevel% neq 0 (
    echo ERROR: No se pudieron agregar archivos a git.
    pause
    exit /b 1
)
echo Archivos agregados.
echo.

echo [3/5] Haciendo commit...
git commit -m "feat: Corregir calculo de prestamos con montos autorizados y dias trabajados

- Prestamos ahora muestran montos autorizados completos (sin limite 15%)
- Mejorado calculo de dias efectivos con mensaje mas claro
- Corregido calculo de Otros Descuentos y Liquido a Pagar usando totales esperados
- Actualizado texto legal en PDF sobre descuentos voluntarios
- Corregido calculo de paid_installments basado en pagos reales de liquidaciones emitidas
- Agregada migracion SQL para corregir paid_installments de prestamos existentes
- Actualizado manual completo con todos los cambios"
if %errorlevel% neq 0 (
    echo ERROR: No se pudo hacer commit. Verifica que hay cambios para commitear.
    pause
    exit /b 1
)
echo Commit realizado exitosamente!
echo.

echo [4/5] Haciendo push a GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo ERROR: No se pudo hacer push. Verifica tu conexion y permisos.
    pause
    exit /b 1
)
echo Push realizado exitosamente!
echo.

echo [5/5] Verificando otras ramas...
git branch -r | findstr /C:"origin/develop" >nul
if %errorlevel% equ 0 (
    echo Encontrada rama develop, haciendo push...
    git push origin develop
)
echo.

echo ========================================
echo Proceso completado exitosamente!
echo ========================================
echo.
echo IMPORTANTE: No olvides ejecutar la migracion SQL:
echo supabase/migrations/116_fix_loan_paid_installments.sql
echo en Supabase para corregir los paid_installments de prestamos existentes.
echo.
pause
