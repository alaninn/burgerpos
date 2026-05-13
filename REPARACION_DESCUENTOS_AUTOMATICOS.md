# ✅ Reparación de Descuentos Automáticos

**Fecha:** 2026-05-12  
**Estado:** 🟢 Implementado y listo para pruebas

---

## 📋 Problema Identificado

Los descuentos de categoría **global**, **por modalidad** y **por método de pago** no se estaban reflejando en el editor de pedidos. Solo funcionaban los descuentos de tipo **cupón** y **producto**.

Las categorías afectadas:
- 🌐 **Global** - Descuento que aplica automáticamente a todos los pedidos
- 🛵 **Por modalidad** - Descuento según delivery/takeaway/salón
- 💳 **Por método de pago** - Descuento según efectivo/tarjeta/transferencia

---

## ✅ Solución Implementada

### Backend

#### 1. Nuevo Controller: `obtenerAutomaticos`
**Archivo:** `backend/src/controllers/descuento.controller.js`

```javascript
exports.obtenerAutomaticos = async (req, res) => {
  const { modalidad, metodoPago, subtotal } = req.query;
  // Busca descuentos activos con aplicaAutomatico: true
  // Filtra por categoría (global, modalidad, metodo_pago)
  // Verifica vencimiento, usos máximos y mínimo de compra
  // Calcula el monto de cada descuento
  // Retorna array de descuentos aplicables
}
```

**Funcionalidad:**
- Recibe modalidad, metodoPago y subtotal como query params
- Busca descuentos con `aplicaAutomatico: true`
- Filtra por categoría y validaciones (vencimiento, usos, mínimo)
- Calcula monto según tipo (porcentaje o fijo)
- Retorna descuentos aplicables con su monto calculado

#### 2. Nueva Ruta
**Archivo:** `backend/src/routes/descuento.routes.js`

```javascript
router.get('/automaticos', ctrl.obtenerAutomaticos);
```

**Endpoint:** `GET /api/negocios/:negocioId/descuentos/automaticos?modalidad=delivery&metodoPago=efectivo&subtotal=5000`

---

### Frontend

#### 1. Estado para Descuentos Automáticos
**Archivo:** `frontend/src/pages/admin/EditorPedido.jsx`

```javascript
const [descuentosAutomaticos, setDescuentosAutomaticos] = useState([])
```

#### 2. useEffect para Cargar Descuentos
Carga automáticamente cuando cambian:
- Modalidad (delivery/takeaway/salón)
- Método de pago (efectivo/tarjeta/transferencia)
- Carrito (subtotal)

```javascript
useEffect(() => {
  if (!modalidad || !metodoPago || paso !== 2) return
  const subtotalCalc = carrito.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0)
  
  api.get(`/negocios/${negocioId}/descuentos/automaticos`, {
    params: { modalidad, metodoPago, subtotal: subtotalCalc }
  }).then(({ data }) => {
    setDescuentosAutomaticos(data.descuentos || [])
  })
}, [negocioId, modalidad, metodoPago, carrito, paso])
```

#### 3. Cálculo de Total Actualizado
Ahora incluye descuentos automáticos:

```javascript
const subtotal = carrito.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0)
const descuentoValor = descuentoTipo === 'porcentaje'
  ? Math.round(subtotal * descuento / 100)
  : descuento
const descuentosAutomaticosValor = descuentosAutomaticos.reduce((sum, d) => sum + (d.monto || 0), 0)
const total = Math.max(0, subtotal + envio - descuentoValor - descuentosAutomaticosValor + propina)
```

#### 4. Visualización en UI
Los descuentos automáticos se muestran en el resumen de totales:

```jsx
{descuentosAutomaticos.length > 0 && descuentosAutomaticos.map((desc, idx) => (
  <div key={idx} className="flex justify-between text-xs text-violet-600">
    <span className="flex items-center gap-1">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-600"></span>
      {desc.categoria === 'global' ? 'Descuento global' :
       desc.categoria === 'modalidad' ? 'Descuento modalidad' :
       desc.categoria === 'metodo_pago' ? 'Descuento método pago' : 'Descuento'}
      {desc.tipo === 'porcentaje' ? ` (${desc.valor}%)` : ''}
    </span>
    <span className="font-mono">−${fmt(desc.monto)}</span>
  </div>
))}
```

#### 5. Guardado de Pedido
Los descuentos automáticos se suman al campo `descuento` del pedido:

```javascript
const descuentoTotal = descuentoValor + descuentosAutomaticosValor
const body = {
  // ...
  descuento: descuentoTotal,
  // ...
}
```

---

## 🎯 Flujo de Aplicación de Descuentos

### Paso 1: Admin Crea Descuentos
En `/admin/descuentos`:
- Crear descuento categoría **Global** → Se aplica a todos los pedidos
- Crear descuento categoría **Por modalidad** → Seleccionar delivery/takeaway/salón
- Crear descuento categoría **Por método de pago** → Seleccionar efectivo/tarjeta/transferencia

**Importante:** Estos descuentos tienen `aplicaAutomatico: true`

### Paso 2: Admin Crea Pedido
En `/admin/panel-pedidos` o `/admin/pedidos`:

1. Selecciona **modalidad** (delivery/takeaway/salón)
2. Agrega productos al carrito → Se calcula subtotal
3. Selecciona **método de pago**
4. **Automáticamente** se cargan y aplican descuentos:
   - Descuento global (si existe y está activo)
   - Descuento por modalidad seleccionada (si existe)
   - Descuento por método de pago seleccionado (si existe)

### Paso 3: Visualización
El resumen de totales muestra:
```
Subtotal            $5,000
Envío               $500
Descuento          −$200      (manual, si se agregó)
• Descuento global −$250      (automático - 5%)
• Descuento método −$150      (automático - efectivo)
Total               $4,900
```

### Paso 4: Guardado
El pedido se guarda con:
- `descuento: 600` (suma de manual + automáticos)
- Se conserva el total correcto

---

## 🧪 Cómo Probar

### Test 1: Descuento Global

1. Ir a `/admin/descuentos`
2. Crear descuento:
   - Categoría: **Global**
   - Tipo: Porcentaje
   - Valor: 10
   - Activo: ✓
3. Guardar
4. Ir a crear pedido
5. Agregar productos (ej: subtotal $1000)
6. **✓ Verificar:** En resumen debe aparecer "• Descuento global (10%): −$100"
7. Total debe ser $900 (sin envío)

### Test 2: Descuento por Modalidad

1. Ir a `/admin/descuentos`
2. Crear descuento:
   - Categoría: **Por modalidad**
   - Aplicar en: **Delivery**
   - Tipo: Fijo
   - Valor: 200
3. Guardar
4. Crear pedido con modalidad **Delivery**
5. Agregar productos (subtotal $1000)
6. **✓ Verificar:** "• Descuento modalidad: −$200"
7. Cambiar a **Take Away**
8. **✓ Verificar:** El descuento desaparece

### Test 3: Descuento por Método de Pago

1. Crear descuento:
   - Categoría: **Por método de pago**
   - Aplicar en: **Efectivo**
   - Tipo: Porcentaje
   - Valor: 15
2. Crear pedido
3. Agregar productos (subtotal $1000)
4. Seleccionar método: **Efectivo**
5. **✓ Verificar:** "• Descuento método pago (15%): −$150"
6. Cambiar a **Tarjeta**
7. **✓ Verificar:** El descuento desaparece

### Test 4: Múltiples Descuentos Acumulados

1. Tener activos:
   - Descuento global 10%
   - Descuento delivery $200
   - Descuento efectivo 5%
2. Crear pedido:
   - Modalidad: Delivery
   - Método: Efectivo
   - Subtotal: $2000
3. **✓ Verificar:** Se aplican los 3 descuentos:
   - Global: −$200 (10% de $2000)
   - Modalidad: −$200 (fijo)
   - Método pago: −$100 (5% de $2000)
   - **Total descuentos: $500**

### Test 5: Validación de Mínimo de Compra

1. Crear descuento global:
   - Valor: 20%
   - Mínimo de compra: $1000
2. Crear pedido con subtotal $500
3. **✓ Verificar:** NO se aplica el descuento
4. Agregar más productos hasta llegar a $1000+
5. **✓ Verificar:** Ahora SÍ se aplica el descuento

---

## 📊 Respuesta del Endpoint

### Request
```
GET /api/negocios/123/descuentos/automaticos?modalidad=delivery&metodoPago=efectivo&subtotal=5000
```

### Response
```json
{
  "success": true,
  "descuentos": [
    {
      "id": "uuid-1",
      "categoria": "global",
      "tipo": "porcentaje",
      "valor": 10,
      "descripcion": "Descuento de verano",
      "codigo": "GLOBAL_AUTO",
      "monto": 500
    },
    {
      "id": "uuid-2",
      "categoria": "modalidad",
      "tipo": "fijo",
      "valor": 200,
      "descripcion": "Descuento delivery",
      "codigo": "MODALIDAD_AUTO",
      "monto": 200
    },
    {
      "id": "uuid-3",
      "categoria": "metodo_pago",
      "tipo": "porcentaje",
      "valor": 5,
      "descripcion": "Descuento efectivo",
      "codigo": "METODO_PAGO_AUTO",
      "monto": 250
    }
  ]
}
```

---

## 📁 Archivos Modificados

### Backend (2 archivos)
1. ✅ `backend/src/controllers/descuento.controller.js`
   - Agregado método `obtenerAutomaticos`

2. ✅ `backend/src/routes/descuento.routes.js`
   - Agregada ruta `GET /automaticos`

### Frontend (1 archivo)
3. ✅ `frontend/src/pages/admin/EditorPedido.jsx`
   - Agregado estado `descuentosAutomaticos`
   - Agregado useEffect para cargar descuentos
   - Modificado cálculo de total
   - Agregada visualización en UI
   - Modificado payload de guardado

---

## 🔄 Compatibilidad

### ✓ Compatible con:
- Descuentos de cupón (código manual)
- Descuentos de producto (asignados a productos específicos)
- Descuento manual del admin
- Sistema de propinas
- Costo de envío

### ✓ No interfiere con:
- Facturación ARCA
- Impresión de tickets
- Reportes de ventas
- WhatsApp integración

---

## ⚠️ Notas Importantes

1. **Acumulación:** Los descuentos automáticos se suman entre sí y con el descuento manual
2. **Prioridad:** Global → Modalidad → Método de pago (todos se aplican si cumplen condiciones)
3. **Validaciones:** Se respetan vencimiento, usos máximos y mínimo de compra
4. **Historial:** Los descuentos se guardan en el pedido como un monto total
5. **Tiempo real:** Los descuentos se recalculan automáticamente al cambiar modalidad, método de pago o carrito

---

## 🚀 Estado Final

### Backend: ✅ Implementado
- Endpoint funcional
- Validaciones correctas
- Respuesta optimizada

### Frontend: ✅ Implementado
- Carga automática
- Visualización clara
- Guardado correcto

### Build: ✅ Exitoso
- Sin errores de sintaxis
- Sin errores de compilación
- Listo para pruebas

---

**Desarrollado:** 2026-05-12  
**Tiempo de desarrollo:** ~45 minutos  
**Estado:** LISTO PARA PRUEBAS 🧪
