# Git - Ejemplo Práctico Paso a Paso 🎯

## Escenario: Agregar validación de contratos

### Paso 1: Estás trabajando en desarrollo
```bash
git checkout desarrollo
# Estás aquí trabajando
```

**Equivalente:** Tienes una copia del documento para experimentar

---

### Paso 2: Haces cambios y los guardas (COMMIT)
```bash
git add app/contracts/new/page.tsx
git commit -m "Agregar validación de contratos activos"
```

**Equivalente:** Guardas el documento con nombre "Carta v2 - Agregué validación"

**Qué hace:**
- `git add` = Marcar archivos para guardar
- `commit` = Guardar versión con mensaje

---

### Paso 3: Probar que funciona
```bash
npm run build  # Verificar que compila
npm run dev    # Probar en navegador
```

**Equivalente:** Revisar que la carta se vea bien antes de enviarla

---

### Paso 4: Si funciona → Fusionar a main (MERGE)
```bash
git checkout main        # Ir a la versión original
git merge desarrollo    # Copiar cambios de desarrollo
```

**Equivalente:** 
- Abres la carta original
- Copias los cambios que te gustaron de la copia
- La original ahora tiene los cambios buenos

**Qué hace:**
- `checkout main` = Cambiar a la rama principal
- `merge` = Copiar cambios de desarrollo a main

---

### Paso 5: Subir a GitHub (PUSH)
```bash
git push origin main
```

**Equivalente:** Subir la carta a Google Drive para que otros la vean

**Qué pasa:**
- Easypanel detecta cambios en GitHub
- Despliega automáticamente la nueva versión

---

## Si Algo Falla

### Opción A: Descartar todo
```bash
git checkout main
git branch -D desarrollo  # Borrar la copia mala
```

**Equivalente:** Borrar la copia que tenía errores, la original sigue intacta

---

### Opción B: Arreglar en desarrollo
```bash
# Seguir trabajando en desarrollo hasta que funcione
git add .
git commit -m "Arreglar error X"
# Probar de nuevo...
```

---

## Resumen Visual

```
┌─────────────────┐
│   desarrollo    │ ← Trabajas aquí
│  (tu copia)     │
└────────┬────────┘
         │ merge (si funciona)
         ▼
┌─────────────────┐
│      main       │ ← Versión oficial
│  (producción)   │
└────────┬────────┘
         │ push
         ▼
┌─────────────────┐
│    GitHub       │ ← Easypanel lo ve
│  (nube)         │
└─────────────────┘
```

## Comandos que Usarás Siempre

| Situación | Comando |
|-----------|---------|
| Guardar cambios | `git add .` + `git commit -m "mensaje"` |
| Cambiar a main | `git checkout main` |
| Copiar cambios buenos | `git merge desarrollo` |
| Subir a internet | `git push origin main` |
| Borrar copia mala | `git branch -D desarrollo` |


