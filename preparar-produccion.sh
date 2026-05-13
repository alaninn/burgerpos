#!/bin/bash

# Script para preparar el proyecto para producción

echo "🚀 Preparando BurgerPOS para Producción en DonWeb"
echo "=================================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encuentra package.json. Ejecuta este script desde la raíz del proyecto.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📋 Paso 1: Verificando archivos de configuración...${NC}"

# 2. Verificar archivos .env
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  No existe backend/.env${NC}"
    echo "   Creando desde .env.production.example..."
    cp backend/.env.production.example backend/.env
    echo -e "${RED}   ⚠️  IMPORTANTE: Edita backend/.env con tus credenciales de producción${NC}"
else
    echo -e "${GREEN}✓ backend/.env existe${NC}"
fi

if [ ! -f "frontend/.env.production" ]; then
    echo -e "${YELLOW}⚠️  No existe frontend/.env.production${NC}"
    echo "   Creando desde .env.production.example..."
    cp frontend/.env.production.example frontend/.env.production
    echo -e "${RED}   ⚠️  IMPORTANTE: Edita frontend/.env.production con tu URL de producción${NC}"
else
    echo -e "${GREEN}✓ frontend/.env.production existe${NC}"
fi

echo -e "\n${YELLOW}📦 Paso 2: Instalando dependencias del backend...${NC}"
cd backend
npm install --production
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencias del backend instaladas${NC}"
else
    echo -e "${RED}❌ Error instalando dependencias del backend${NC}"
    exit 1
fi

echo -e "\n${YELLOW}🏗️  Paso 3: Construyendo frontend...${NC}"
cd ../frontend
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencias del frontend instaladas${NC}"
else
    echo -e "${RED}❌ Error instalando dependencias del frontend${NC}"
    exit 1
fi

npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend construido exitosamente${NC}"
    echo -e "   📁 Archivos en: frontend/dist/"
else
    echo -e "${RED}❌ Error construyendo el frontend${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📋 Paso 4: Creando archivo de información...${NC}"
cd ..
cat > DESPLIEGUE_INFO.txt << EOF
INFORMACIÓN DE DESPLIEGUE
========================

Fecha de build: $(date)
Branch: $(git branch --show-current)
Commit: $(git rev-parse --short HEAD)

ARCHIVOS IMPORTANTES:
---------------------
✓ backend/ - Código del servidor Node.js
✓ backend/.env - Variables de entorno (CONFIGURAR ANTES DE SUBIR)
✓ frontend/dist/ - Frontend compilado (SUBIR AL SERVIDOR WEB)

PRÓXIMOS PASOS:
---------------
1. Editar backend/.env con credenciales de producción
2. Crear base de datos PostgreSQL en DonWeb
3. Subir backend/ al servidor
4. Subir frontend/dist/ al directorio web público
5. Ejecutar migraciones: cd backend && npm run db:migrate
6. Configurar PM2 o Node.js App en cPanel
7. Configurar proxy inverso (ver DESPLIEGUE_DONWEB.md)
8. Configurar SSL/HTTPS

DOCUMENTACIÓN COMPLETA:
-----------------------
Ver: DESPLIEGUE_DONWEB.md

EOF

echo -e "${GREEN}✓ Información creada en DESPLIEGUE_INFO.txt${NC}"

echo -e "\n${YELLOW}📦 Paso 5: Creando paquete comprimido...${NC}"
mkdir -p dist-produccion
cp -r backend dist-produccion/
cp -r frontend/dist dist-produccion/frontend-build
cp DESPLIEGUE_DONWEB.md dist-produccion/
cp DESPLIEGUE_INFO.txt dist-produccion/
cp README.md dist-produccion/ 2>/dev/null || true

tar -czf burgerpos-produccion-$(date +%Y%m%d-%H%M%S).tar.gz dist-produccion/
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Paquete creado: burgerpos-produccion-*.tar.gz${NC}"
    rm -rf dist-produccion/
else
    echo -e "${RED}❌ Error creando paquete comprimido${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Preparación completada exitosamente!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}⚠️  IMPORTANTE - Antes de subir a DonWeb:${NC}"
echo -e "   1. Edita backend/.env con tus credenciales reales"
echo -e "   2. Edita frontend/.env.production con tu URL de producción"
echo -e "   3. Revisa DESPLIEGUE_DONWEB.md para instrucciones completas"
echo -e "\n${YELLOW}📦 Archivo para subir:${NC} burgerpos-produccion-*.tar.gz"
echo -e "${YELLOW}📖 Documentación:${NC} DESPLIEGUE_DONWEB.md"
echo ""
