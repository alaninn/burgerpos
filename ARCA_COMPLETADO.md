# ✅ ARCA - Facturación Electrónica COMPLETADA

## Estado: Sistema ARCA 100% Implementado

Fecha: 2026-05-04
Status: ✅ **LISTO PARA USAR**

---

## 📋 Componentes Implementados

### Backend

#### Modelos (100%)
- ✅ `ARCACredential.js` - Credenciales y certificados por negocio
- ✅ `ComprobanteElectronico.js` - Facturas emitidas
- ✅ `TicketAccesoWSAA.js` - Tickets de autenticación AFIP

#### Servicios (100%)
- ✅ `arcaService.js` (24KB) - Emisión de comprobantes, generación de certificados
- ✅ `wsaaService.js` (11KB) - Autenticación con WSAA de AFIP
- ✅ `pdfService.js` (6KB) - Generación de PDFs térmicos con QR AFIP

#### Controllers (100%)
- ✅ `arca.controller.js` (8KB) - Gestión de certificados y comprobantes
- ✅ `pedidoFactura.controller.js` (6KB) - Facturación desde pedidos

#### Routes (100%)
- ✅ `arca.routes.js` - /api/negocios/:negocioId/arca/*
- ✅ `pedidoFactura.routes.js` - /api/negocios/:negocioId/pedidos/:pedidoId/*

#### Base de Datos (100%)
- ✅ Tabla `arca_credentials` creada
- ✅ Tabla `comprobantes_electronicos` creada  
- ✅ Tabla `tickets_acceso_wsaa` creada
- ✅ Columna `comprobanteElectronicoId` en `pedidos`

### Frontend

#### Páginas (100%)
- ✅ `FacturacionElectronica.jsx` (53KB) - Gestión completa de ARCA
  - Tab Tutorial
  - Tab Configuración
  - Tab Certificados
  - Tab Comprobantes

#### Componentes (100%)
- ✅ `ModalFacturaDesdePedido.jsx` - Modal para facturar pedidos
- ✅ `ComprobanteElectronicoModal.jsx` - Vista de comprobante emitido

#### Integración (100%)
- ✅ Ruta `/admin/facturacion` en App.jsx
- ✅ Link "Facturación ARCA" en sidebar admin
- ✅ Botón "Factura electrónica" en detalle de pedidos

---

## 🔧 Endpoints Disponibles

### Gestión de Certificados
```
POST   /api/negocios/:negocioId/arca/generar-certificados
GET    /api/negocios/:negocioId/arca/descargar/:tipo/:filename
POST   /api/negocios/:negocioId/arca/subir-certificado
GET    /api/negocios/:negocioId/arca/certificados
POST   /api/negocios/:negocioId/arca/test-conexion
```

### Emisión de Comprobantes
```
POST   /api/negocios/:negocioId/arca/emitir
GET    /api/negocios/:negocioId/arca/comprobantes
GET    /api/negocios/:negocioId/arca/comprobantes/:id/pdf
```

### Facturación desde Pedidos
```
POST   /api/negocios/:negocioId/pedidos/:pedidoId/emitir-factura
GET    /api/negocios/:negocioId/pedidos/:pedidoId/comprobante
POST   /api/negocios/:negocioId/pedidos/:pedidoId/anular-comprobante
```

---

## 🧪 Cómo Probar

### 1. Configurar Certificados ARCA

**Opción A: Homologación (Recomendado para testing)**

1. Ir a: http://localhost:3000/admin/facturacion
2. Ingresar CUIT de prueba: `20123456789`
3. Click "Generar Certificados"
4. Descargar `.key` y `.csr`
5. Ir a: https://www.afip.gob.ar/ws/WSAA/Regadm_homologacion.aspx
6. Subir `.csr` y generar certificado
7. Descargar `.crt` de ARCA
8. Volver a BurgerPOS y subir el `.crt`
9. Click "Test Conexión" - debe aparecer ✅ "Conexión exitosa"

**Opción B: Producción (Solo para negocios reales)**

Mismo flujo pero usando:
- CUIT real del negocio
- https://www.afip.gob.ar/ws/WSAA/Regadm.aspx

### 2. Emitir Primera Factura

**Desde la página de Facturación:**

1. Ir a tab "Emitir Comprobante"
2. Seleccionar tipo (Factura A/B/C)
3. Ingresar datos del cliente
4. Completar montos
5. Click "Emitir"
6. Ver CAE generado
7. Descargar PDF con QR AFIP

**Desde un Pedido:**

1. Ir a `/admin/pedidos` o `/admin/panel-pedidos`
2. Abrir detalle de un pedido
3. Click "Factura electrónica"
4. Modal se abre con datos pre-cargados
5. Seleccionar tipo de comprobante
6. Click "Emitir Comprobante"
7. El pedido ahora muestra badge "Factura A/B/C"
8. Click "Ver Factura" para ver el comprobante

### 3. Verificar QR AFIP

1. Descargar PDF del comprobante
2. Escanear QR con app oficial de AFIP:
   - Android: https://play.google.com/store/apps/details?id=ar.gob.afip.veraz
   - iOS: https://apps.apple.com/ar/app/afip/id1464943098
3. Debe mostrar datos del comprobante validados

### 4. Anular Comprobante

1. Ir al detalle de un pedido con factura
2. Click "Anular Factura"
3. Sistema emite automáticamente Nota de Crédito
4. Comprobante original queda marcado como "anulado"

---

## 📊 Tipos de Comprobante Soportados

| Código | Tipo | Letra | Uso |
|--------|------|-------|-----|
| 1 | Factura A | A | Responsables Inscriptos |
| 6 | Factura B | B | Monotributistas, Consumidor Final |
| 11 | Factura C | C | Consumidor Final extranjero |
| 3 | Nota de Crédito A | A | Anula Factura A |
| 8 | Nota de Crédito B | B | Anula Factura B |
| 13 | Nota de Crédito C | C | Anula Factura C |

---

## 🔐 Seguridad Implementada

- ✅ Certificados encriptados con `encryptionService`
- ✅ Paths de archivos encriptados en BD
- ✅ Validación `perteneceAlNegocio` en todos los endpoints
- ✅ Tickets WSAA cacheados (válidos ~10 minutos)
- ✅ XML de solicitud/respuesta guardado para auditoría

---

## ⚠️ Importante

1. **Certificados vencen:** ~2 años
   - Configurar alerta 30 días antes (pendiente)
   
2. **Homologación vs Producción:**
   - URLs diferentes de WSAA
   - Certificados diferentes
   - Puntos de venta diferentes

3. **IVA:**
   - Factura A: discrimina IVA (21%)
   - Factura B/C: no discrimina IVA

4. **CAE:**
   - Código de Autorización Electrónico
   - Único por comprobante
   - Vence 10 días después de emisión

---

## 📝 Archivos Críticos

### Backend
```
src/
├── models/
│   ├── ARCACredential.js
│   ├── ComprobanteElectronico.js
│   └── TicketAccesoWSAA.js
├── services/
│   ├── arcaService.js
│   ├── wsaaService.js
│   └── pdfService.js
├── controllers/
│   ├── arca.controller.js
│   └── pedidoFactura.controller.js
└── routes/
    ├── arca.routes.js
    └── pedidoFactura.routes.js
```

### Frontend
```
src/
├── pages/admin/
│   └── FacturacionElectronica.jsx
└── components/
    ├── ModalFacturaDesdePedido.jsx
    └── ComprobanteElectronicoModal.jsx
```

---

## ✅ Checklist de Funcionalidad

- [x] Modelos creados
- [x] Migraciones ejecutadas
- [x] Servicios implementados
- [x] Controllers completos
- [x] Rutas registradas
- [x] Frontend integrado
- [x] Generación de certificados
- [x] Test de conexión WSAA
- [x] Emisión de Facturas A/B/C
- [x] Facturación desde pedidos
- [x] Generación de PDF térmico
- [x] QR AFIP oficial
- [x] Notas de Crédito (anulación)
- [x] Encriptación de certificados
- [x] Cache de tickets WSAA
- [x] Frontend sin errores de sintaxis

---

## 🚀 Próximos Pasos Opcionales

1. **Alertas de vencimiento:**
   - Cron job que envía email 30 días antes
   
2. **Impresión directa:**
   - Integración con impresora térmica USB
   
3. **Reportes de facturación:**
   - Libro IVA digital
   - Resumen mensual
   
4. **Validación de CUIT:**
   - API de AFIP para validar CUIT antes de facturar

---

**Estado Final:** ✅ **100% FUNCIONAL Y LISTO PARA USAR**

