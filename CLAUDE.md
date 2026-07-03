# CLAUDE.md — instructivo para el agente

> Este archivo lo lee Claude Code automáticamente. Acá está cómo trabajar en el
> proyecto y, sobre todo, **cómo leer los reportes de errores** que el superadmin
> sube desde la app. El contexto general del sistema está en `README.md` y la
> hoja de ruta en `ROADMAP.md`.

---

## 🛠️ El sistema en dos líneas

BurgerPOS (QRBan): sistema de pedidos para hamburgueserías — menú público con QR,
POS, delivery, facturación ARCA, pagos MercadoPago, WhatsApp, módulo de gestión
(stock/recetas/compras/gastos) y panel de superadmin.

- **Stack**: React 18 + Vite (frontend, dev en puerto 3000) · Node + Express +
  Sequelize + PostgreSQL (backend, puerto 3001) · Socket.io.
- **Dev**: `cd backend && npm run dev` y `cd frontend && npm run dev`.
- **Migraciones**: `backend/src/migrations/` (sequelize-cli, config en
  `backend/.sequelizerc`). En el VPS las aplica `actualizar.sh`.
- **Producción**: el backend sirve `frontend/dist` (NODE_ENV=production) en el
  puerto 3004 del VPS, proceso pm2 `burgerpos`.
- `backend/.env` y `backend/.env.production` NO se versionan (tienen secretos).

## 🐞 Reportes de errores (leerlos desde acá)

El panel **Superadmin → Errores** junta los **errores de pantalla** (frontend,
tabla `errores_frontend`) y los **errores del servidor** (log de pm2 + buffer en
memoria), arma un `.md` y lo sube a GitHub (botón **"Subir a GitHub"**) a una
rama aparte para no ensuciar el código:

- **Rama**: `reportes-errores` · **Carpeta**: `reportes/`
- **Nombre**: `reportes/errores-<fecha-ISO>.md` (uno nuevo por cada subida)
- Tras subir con éxito se **limpian las fuentes** (se borran los errores de
  pantalla incluidos, se trunca el log de error de pm2 y se vacía el buffer),
  para que el próximo reporte no repita errores viejos.

### Cómo los leo (sin cambiar de rama ni tocar el working tree)

```bash
git fetch origin reportes-errores
git ls-tree --name-only origin/reportes-errores reportes/
git show origin/reportes-errores:reportes/errores-<fecha>.md

# Atajo: el reporte más reciente
git show origin/reportes-errores:"$(git ls-tree --name-only origin/reportes-errores reportes/ | sort | tail -1)"
```

Cuando Alan diga **"revisá los errores"** / **"fijate el último reporte"**:
hacer el fetch, leer el más reciente y diagnosticar a partir de eso.

### Requisito en el servidor para que la subida funcione

`POST /api/superadmin/errores/subir-git` usa la API REST de GitHub (no toca el
git de producción). Necesita en `backend/.env` del VPS:

```env
GITHUB_TOKEN=...                      # PAT con permiso de contenidos sobre el repo
GITHUB_REPO=alaninn/burgerpos         # opcional (este es el default)
GITHUB_REPORTES_BRANCH=reportes-errores  # opcional (este es el default)
```

Sin `GITHUB_TOKEN`, el botón avisa y queda **"Descargar .md"** como alternativa.

**Backend**: `backend/src/controllers/superadminErrores.controller.js` (reporte,
logs, subida) + `backend/src/routes/salud.routes.js` (recepción de errores del
frontend, sin token). **Frontend**: `frontend/src/pages/superadmin/Errores.jsx`
(panel), `frontend/src/utils/reporteErrores.js` + `components/ErrorBoundary.jsx`
(captura y reporte automático).

## 🔌 Conexión al VPS (producción) y despliegue

Los datos están en **`.vps-credenciales`** (raíz del proyecto, **ignorado por
git** — tiene la contraseña). Es el mismo VPS que almacenq24:

- **Host**: `66.97.35.172` (`vps-5839248-x.dattaweb.com`) · **Puerto SSH**: `5041` · **Usuario**: `root`
- **Ruta del proyecto en el VPS**: `/root/burgerpos/burgerpos`
- **Proceso pm2**: `burgerpos` (logs en `/root/.pm2/logs/burgerpos-{out,error}.log`)

### Cómo me conecto / despliego (Windows + Git Bash)

SSH no acepta la contraseña por stdin; se usa el truco de `SSH_ASKPASS`:

```bash
export VPS_PASS="$(grep '^VPS_PASS=' .vps-credenciales | cut -d= -f2-)"
printf '#!/bin/sh\necho "$VPS_PASS"\n' > /tmp/askpass.sh && chmod +x /tmp/askpass.sh
export SSH_ASKPASS=/tmp/askpass.sh SSH_ASKPASS_REQUIRE=force DISPLAY=:0

ssh -o StrictHostKeyChecking=no -p 5041 root@66.97.35.172 \
  "bash /root/burgerpos/burgerpos/actualizar.sh" < /dev/null
```

### ⚠️ Regla de despliegue

1. Después de reparar algo: **commit + push a `main`**.
2. **SIEMPRE consultar a Alan antes de desplegar al VPS.** Nunca correr
   `actualizar.sh` sin su OK explícito.
3. Tras desplegar, verificar en la salida que pm2 quedó `online` y revisar
   `pm2 logs burgerpos` por errores nuevos.

## ✍️ Estilo (resumen)

- **Versionado**: en cada feature/fix visible, subir `VERSION_ACTUAL` en
  `frontend/src/changelog.js` y agregar la entrada nueva ARRIBA, redactada
  para el usuario. Cambios solo de superadmin → `super: true`.
- Textos de la interfaz: redactados para el usuario, nunca notas de desarrollador.
- Comentarios internos del código: sin emojis, texto técnico plano.
- No crear archivos `.md` sueltos con notas de sesión — este archivo, `README.md`
  y `ROADMAP.md` son la única documentación de la raíz.
- Migraciones idempotentes cuando sea posible; nada puede bloquear la venta.
