# 🚀 Guía Rápida - Primeras Pruebas ARCA

## ✅ Pre-requisitos

Antes de empezar, verifica que tengas:

1. **Credenciales AFIP de Homologación**
   - CUIT de prueba
   - Clave Fiscal de homologación
   - [Solicitar aquí](https://www.afip.gob.ar/ws/WSAA/Regadm_homologacion.aspx)

2. **Servidores corriendo**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

3. **Base de datos actualizada**
   ```bash
   cd backend
   npm run db:migrate
   ```

---

## 🎯 Opción 1: Vinculación AUTOMÁTICA (Recomendado)

### Paso 1: Acceder al módulo
```
http://localhost:3000/admin/facturacion
```

### Paso 2: Ir al tab "⚡ Vincular Automático"

### Paso 3: Completar formulario

```
CUIT: 20-12345678-9          (tu CUIT de homologación)
Clave Fiscal: ************    (tu clave de AFIP)
Punto de Venta: 1
Razón Social: Mi Negocio SRL
Régimen Fiscal: Responsable Inscripto

Entorno de Conexión:
⦿ 🧪 Homologación (Pruebas)  ← SELECCIONAR ESTE
○ 🚀 Producción (Real)
```

**Importante:** Selecciona el radio button de **Homologación** (naranja). Está seleccionado por defecto.

### Paso 4: Click "🚀 Vincular Automáticamente"

**Observarás en tiempo real:**
```
⏳ Iniciando automatización...
✅ Certificados generados
✅ Navegador iniciado
✅ Login en AFIP
✅ Acceso a gestión de certificados
✅ CSR subido
✅ Certificado generado en ARCA
✅ Certificado descargado
✅ Test de conexión WSAA
🎉 ¡Vinculación completada!
```

**Tiempo estimado:** 2-3 minutos

### Paso 5: Test de Conexión

Después de vincular exitosamente:

1. Aparecerá un botón **"✅ Test Conexión"** junto al botón de vincular
2. Click en "Test Conexión"
3. Espera 2-3 segundos

**Resultado esperado:**
```
✅ Conexión Exitosa
Conexión exitosa con WSAA
Token: PD94bWwgdmVyc2lvbj0iMS4wIi...
Expira: 5/5/2026, 18:30:00
```

**Si falla:**
```
❌ Error de Conexión
[Descripción del error]
```

### ✅ Resultado Final
Si todo salió bien:
- ✅ Mensaje "🎉 ¡Vinculación completada!"
- ✅ Test de conexión muestra "Conexión Exitosa"
- ✅ Sistema te redirige al tab "🔐 Certificados"
- ✅ Verás tu certificado activo listado
- ✅ Listo para emitir facturas

---

## 🛠️ Opción 2: Vinculación MANUAL

### Paso 1: Generar certificados

1. Tab "⚙️ Configuración"
2. Ingresar CUIT
3. Click "Generar Certificados"
4. Descargar .key y .csr

### Paso 2: Subir CSR a ARCA

1. Ir a https://www.afip.gob.ar/ws/WSAA/Regadm_homologacion.aspx
2. Login con CUIT y Clave Fiscal
3. "Administrador de Relaciones de Clave Fiscal"
4. Nuevo certificado → WSFEv1
5. Copiar contenido del .csr
6. Pegar en formulario ARCA
7. Aprobar
8. Descargar .crt

### Paso 3: Subir .crt al sistema

1. Tab "🔐 Certificados"
2. Click "Subir Certificado"
3. Seleccionar archivo .crt descargado
4. Completar datos:
   - CUIT
   - Régimen Fiscal
5. Click "Guardar"

### Paso 4: Test de conexión

1. Click "Probar Conexión"
2. Debe aparecer: "✅ Conexión exitosa con WSAA"

---

## 📝 Emitir Primera Factura de Prueba

### Paso 1: Ir al tab "📄 Comprobantes"

### Paso 2: Click "Emitir Comprobante"

### Paso 3: Completar datos

**Factura A (para empresas):**
```
Tipo Comprobante: Factura A
Punto de Venta: 1
Tipo Documento: CUIT
Número Doc: 20-34567890-1
Denominación: Cliente Test SA
Concepto: Productos
Fecha Emisión: [Hoy]
Importe Neto: 10000
IVA 21%: 2100
Total: 12100
```

### Paso 4: Click "Emitir Factura"

**Respuesta esperada:**
```json
{
  "exito": true,
  "cae": "12345678901234",
  "caeVencimiento": "2026-05-15",
  "numeroComprobante": 1
}
```

### ✅ Verificación
- Comprobante aparece en historial
- Tiene CAE válido (14 dígitos)
- QR AFIP generado
- PDF descargable

---

## 📱 Validar con App AFIP Móvil

### Paso 1: Descargar app

- Android: "AFIP Móvil" en Play Store
- iOS: "AFIP Móvil" en App Store

### Paso 2: Escanear QR

1. Abrir comprobante emitido (click en la fila)
2. Ver QR en modal
3. Abrir app AFIP → "Validar Comprobante"
4. Escanear QR

### ✅ Resultado esperado
```
✅ Comprobante válido
Emisor: Tu Negocio
CUIT: 20-12345678-9
CAE: 12345678901234
Importe: $12,100.00
```

---

## 🧪 Casos de Prueba Sugeridos

### Test 1: Factura A (Responsable Inscripto → Responsable Inscripto)
```
Tipo: 1 (Factura A)
CUIT Cliente: 20-34567890-1
Neto: $10,000
IVA: $2,100
Total: $12,100
```

### Test 2: Factura B (Responsable Inscripto → Consumidor Final)
```
Tipo: 6 (Factura B)
DNI Cliente: 12345678
Neto: $5,000
IVA: Incluido
Total: $5,000
```

### Test 3: Factura C (Monotributista → Consumidor Final)
```
Tipo: 11 (Factura C)
DNI Cliente: 87654321
Importe: $3,000 (sin discriminar IVA)
```

### Test 4: Nota de Crédito (devolución)
```
Tipo: 3/8/13 (según régimen)
Comprobante Asociado: [Factura original]
Importe: [Parcial o total]
```

---

## 🐛 Solución de Problemas

### Error: "No autorizado"
**Causa:** Usuario no pertenece al negocio  
**Solución:** Verificar que estés logueado con el usuario correcto

### Error: "No se pudo obtener ticket WSAA"
**Causa:** Certificado inválido o expirado  
**Solución:** 
1. Tab "🔐 Certificados"
2. Verificar que certificado esté activo
3. Probar conexión nuevamente

### Error: "CUIT no habilitado para WSFEv1"
**Causa:** CUIT no tiene permiso en AFIP  
**Solución:**
1. Ir a https://www.afip.gob.ar
2. "Administrador de Relaciones"
3. Habilitar WSFEv1 para tu CUIT

### Error: "CAE no recibido"
**Causa:** Datos inválidos o error AFIP  
**Solución:**
1. Verificar todos los campos requeridos
2. CUIT válido (dígito verificador)
3. Importes > 0
4. Revisar logs del backend para detalles

### Error: "Navegador se cierra inmediatamente" (modo automático)
**Causa:** `headless: true` configurado  
**Solución:**
1. Editar `arcaAutomationService.js`
2. Cambiar `headless: false` temporalmente
3. Ver qué paso falla en el navegador visible

---

## 📊 Verificar Estado del Sistema

### Backend - Logs
```bash
cd backend
npm run dev

# Deberías ver:
# ✅ Conexión a BD exitosa
# ✅ Servidor corriendo en puerto 3001
# ✅ Modelos sincronizados
```

### Base de Datos - Tablas
```bash
cd backend
node -e "
const { sequelize } = require('./src/models');
sequelize.query(\"SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%arca%' OR tablename LIKE '%comprobante%')\")
  .then(([results]) => {
    console.log('Tablas ARCA:');
    results.forEach(r => console.log(' -', r.tablename));
    process.exit(0);
  });
"
```

**Deberías ver:**
```
Tablas ARCA:
 - arca_credentials
 - comprobantes_electronicos
 - tickets_acceso_wsaa
```

### Frontend - Componente
```
http://localhost:3000/admin/facturacion
```

**Deberías ver:**
- 5 Tabs (⚡ Vincular | 📚 Tutorial | ⚙️ Config | 🔐 Certs | 📄 Comps)
- Sin errores en consola del navegador
- Interfaz responsiva

---

## ✅ Checklist Pre-Producción

Antes de migrar a producción, verifica:

### Homologación Completa
- [ ] Al menos 3 facturas A emitidas exitosamente
- [ ] Al menos 3 facturas B emitidas exitosamente
- [ ] Al menos 3 facturas C emitidas exitosamente
- [ ] QR validado con app AFIP móvil (mínimo 3 comprobantes)
- [ ] Nota de crédito emitida y validada
- [ ] Historial de comprobantes carga correctamente
- [ ] PDFs generados correctamente
- [ ] Búsqueda y filtros funcionan

### Seguridad
- [ ] `ENCRYPTION_KEY` configurada (64 caracteres hex)
- [ ] Directorio `uploads/certificados` con permisos 700
- [ ] No hay certificados reales en repositorio Git
- [ ] `.env` en `.gitignore`
- [ ] Middleware de autenticación funciona
- [ ] Aislamiento entre negocios verificado

### Performance
- [ ] Emisión de comprobante < 5 segundos
- [ ] Carga de historial < 2 segundos
- [ ] Tickets WSAA se renuevan automáticamente
- [ ] Sin memory leaks (verificar con `top` tras 100 emisiones)

### Backup
- [ ] Backup de BD configurado (diario)
- [ ] Backup de certificados configurado (semanal)
- [ ] Procedimiento de rollback documentado

---

## 🎯 Próximos Pasos

### Una vez validado en homologación:

1. **Obtener certificados de producción**
   - Ir a https://www.afip.gob.ar/ws/WSAA/Regadm.aspx (SIN _homologacion)
   - Generar certificado real
   - Vincular en el sistema (desmarcar "Modo Homologación")

2. **Emitir factura real de prueba**
   - Monto bajo ($1)
   - Cliente de prueba interno
   - Validar QR
   - Si es exitosa, continuar

3. **Capacitar usuarios**
   - Tutorial en video
   - Manual de usuario
   - FAQ de casos comunes

4. **Monitorear primeras 24hs**
   - Logs en tiempo real
   - Alertas configuradas
   - Soporte activo

---

## 📞 Contacto y Soporte

**Documentación adicional:**
- `VINCULACION_AUTOMATICA_ARCA.md` - Detalles técnicos vinculación automática
- `ESTADO_ARCA_COMPLETO.md` - Estado completo de implementación
- Plan en `.claude/plans/bien-ahora-hay-que-dynamic-wall.md`

**Logs útiles:**
```bash
# Backend
cd backend
npm run dev

# Ver logs ARCA
grep "ARCA" logs/*.log

# Ver logs WSAA
grep "WSAA" logs/*.log
```

**Script de verificación:**
```bash
cd backend
node src/scripts/verificar-arca.js
```

---

## 🎉 ¡Listo para Empezar!

**Tiempo estimado primera prueba completa:** 10-15 minutos

**Flujo recomendado:**
1. Vincular automáticamente (3 min)
2. Emitir Factura A de prueba (2 min)
3. Validar QR con app móvil (1 min)
4. Revisar historial (1 min)

**¡Éxito!** 🚀

---

**Última actualización:** 2026-05-05  
**Versión:** 1.0  
**Estado:** ✅ Listo para testing
