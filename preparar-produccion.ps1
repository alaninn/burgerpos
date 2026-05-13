# Script PowerShell para preparar el proyecto para producción

Write-Host "🚀 Preparando BurgerPOS para Producción en DonWeb" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Verificar que estamos en el directorio correcto
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: No se encuentra package.json. Ejecuta este script desde la raíz del proyecto." -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Paso 1: Verificando archivos de configuración..." -ForegroundColor Yellow

# 2. Verificar archivos .env
if (!(Test-Path "backend\.env")) {
    Write-Host "⚠️  No existe backend\.env" -ForegroundColor Yellow
    Write-Host "   Creando desde .env.production.example..."
    Copy-Item "backend\.env.production.example" "backend\.env"
    Write-Host "   ⚠️  IMPORTANTE: Edita backend\.env con tus credenciales de producción" -ForegroundColor Red
} else {
    Write-Host "✓ backend\.env existe" -ForegroundColor Green
}

if (!(Test-Path "frontend\.env.production")) {
    Write-Host "⚠️  No existe frontend\.env.production" -ForegroundColor Yellow
    Write-Host "   Creando desde .env.production.example..."
    Copy-Item "frontend\.env.production.example" "frontend\.env.production"
    Write-Host "   ⚠️  IMPORTANTE: Edita frontend\.env.production con tu URL de producción" -ForegroundColor Red
} else {
    Write-Host "✓ frontend\.env.production existe" -ForegroundColor Green
}

Write-Host "`n📦 Paso 2: Instalando dependencias del backend..." -ForegroundColor Yellow
Set-Location backend
npm install --production
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencias del backend instaladas" -ForegroundColor Green
} else {
    Write-Host "❌ Error instalando dependencias del backend" -ForegroundColor Red
    exit 1
}

Write-Host "`n🏗️  Paso 3: Construyendo frontend..." -ForegroundColor Yellow
Set-Location ..\frontend
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencias del frontend instaladas" -ForegroundColor Green
} else {
    Write-Host "❌ Error instalando dependencias del frontend" -ForegroundColor Red
    exit 1
}

npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend construido exitosamente" -ForegroundColor Green
    Write-Host "   📁 Archivos en: frontend\dist\"
} else {
    Write-Host "❌ Error construyendo el frontend" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Paso 4: Creando archivo de información..." -ForegroundColor Yellow
Set-Location ..

$fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$branch = git branch --show-current
$commit = git rev-parse --short HEAD

$info = @"
INFORMACIÓN DE DESPLIEGUE
========================

Fecha de build: $fecha
Branch: $branch
Commit: $commit

ARCHIVOS IMPORTANTES:
---------------------
✓ backend\ - Código del servidor Node.js
✓ backend\.env - Variables de entorno (CONFIGURAR ANTES DE SUBIR)
✓ frontend\dist\ - Frontend compilado (SUBIR AL SERVIDOR WEB)

PRÓXIMOS PASOS:
---------------
1. Editar backend\.env con credenciales de producción
2. Crear base de datos PostgreSQL en DonWeb
3. Subir backend\ al servidor
4. Subir frontend\dist\ al directorio web público
5. Ejecutar migraciones: cd backend && npm run db:migrate
6. Configurar PM2 o Node.js App en cPanel
7. Configurar proxy inverso (ver DESPLIEGUE_DONWEB.md)
8. Configurar SSL/HTTPS

DOCUMENTACIÓN COMPLETA:
-----------------------
Ver: DESPLIEGUE_DONWEB.md

"@

$info | Out-File -FilePath "DESPLIEGUE_INFO.txt" -Encoding UTF8

Write-Host "✓ Información creada en DESPLIEGUE_INFO.txt" -ForegroundColor Green

Write-Host "`n📦 Paso 5: Creando paquete comprimido..." -ForegroundColor Yellow
if (Test-Path "dist-produccion") {
    Remove-Item -Recurse -Force "dist-produccion"
}
New-Item -ItemType Directory -Path "dist-produccion" | Out-Null
Copy-Item -Recurse "backend" "dist-produccion\"
Copy-Item -Recurse "frontend\dist" "dist-produccion\frontend-build"
Copy-Item "DESPLIEGUE_DONWEB.md" "dist-produccion\"
Copy-Item "DESPLIEGUE_INFO.txt" "dist-produccion\"
if (Test-Path "README.md") {
    Copy-Item "README.md" "dist-produccion\"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipFile = "burgerpos-produccion-$timestamp.zip"

Compress-Archive -Path "dist-produccion\*" -DestinationPath $zipFile -Force
if ($?) {
    Write-Host "✓ Paquete creado: $zipFile" -ForegroundColor Green
    Remove-Item -Recurse -Force "dist-produccion"
} else {
    Write-Host "❌ Error creando paquete comprimido" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ Preparación completada exitosamente!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`n⚠️  IMPORTANTE - Antes de subir a DonWeb:" -ForegroundColor Yellow
Write-Host "   1. Edita backend\.env con tus credenciales reales"
Write-Host "   2. Edita frontend\.env.production con tu URL de producción"
Write-Host "   3. Revisa DESPLIEGUE_DONWEB.md para instrucciones completas"
Write-Host "`n📦 Archivo para subir: $zipFile" -ForegroundColor Yellow
Write-Host "📖 Documentación: DESPLIEGUE_DONWEB.md" -ForegroundColor Yellow
Write-Host ""
