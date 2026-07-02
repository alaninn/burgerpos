#!/bin/bash
# =============================================
# Actualiza BurgerPOS en el VPS de forma segura.
# Protege backend/.env (tiene secretos y NO se versiona): lo respalda antes
# del pull y lo restaura despues, asi nunca se pierde ni bloquea la actualizacion.
# Uso en el VPS:  bash /root/burgerpos/burgerpos/actualizar.sh
# =============================================

echo "🔄 Actualizando BurgerPOS..."
cd /root/burgerpos/burgerpos || { echo "❌ No se encontró /root/burgerpos/burgerpos"; exit 1; }

# 1) Respaldar el .env (token de GitHub, contraseñas, etc.)
if [ -f backend/.env ]; then
  cp backend/.env /root/.env-burgerpos-backup
  echo "🔐 .env respaldado"
fi

# 2) Bajar cambios sin que archivos locales bloqueen el pull
echo "📥 Bajando cambios de GitHub..."
git stash 2>/dev/null
git pull origin main
git stash drop 2>/dev/null

# 3) Restaurar el .env desde el respaldo (por si el pull lo movio)
if [ -f /root/.env-burgerpos-backup ]; then
  cp /root/.env-burgerpos-backup backend/.env
  echo "🔐 .env restaurado"
fi

# 4) Backend: dependencias y migraciones
echo "📦 Instalando dependencias del backend..."
cd backend && npm install --omit=dev

echo "🗄️  Aplicando migraciones de base de datos..."
npx sequelize-cli db:migrate || echo "⚠️  Revisar migraciones (puede que ya estén aplicadas)"

# 5) Frontend: dependencias y build
echo "📦 Instalando dependencias del frontend..."
cd ../frontend && npm install
echo "🏗️  Compilando frontend..."
npm run build

# 6) Reiniciar
echo "🔄 Reiniciando servidor..."
pm2 restart burgerpos

echo "✅ Actualización completada"
# --nostream: imprime las ultimas lineas y SALE (sin esto, por SSH quedaba
# colgado para siempre dejando procesos huerfanos)
pm2 logs burgerpos --lines 10 --nostream
