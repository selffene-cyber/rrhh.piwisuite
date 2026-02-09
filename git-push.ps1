# Script para hacer commit y push
Write-Host "Agregando archivos..." -ForegroundColor Yellow
git add .

Write-Host "Haciendo commit..." -ForegroundColor Yellow
git commit -m "feat: Corregir calculo de prestamos con montos autorizados y dias trabajados

- Prestamos ahora muestran montos autorizados completos (sin limite 15%)
- Mejorado calculo de dias efectivos con mensaje mas claro
- Corregido calculo de Otros Descuentos y Liquido a Pagar usando totales esperados
- Actualizado texto legal en PDF sobre descuentos voluntarios
- Corregido calculo de paid_installments basado en pagos reales de liquidaciones emitidas
- Agregada migracion SQL para corregir paid_installments de prestamos existentes
- Actualizado manual completo con todos los cambios"

Write-Host "Haciendo push a GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "¡Listo! Push completado." -ForegroundColor Green
