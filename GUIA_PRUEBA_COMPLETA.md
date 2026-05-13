# 🧪 Guía Completa: Probar Sistema de Pago MercadoPago

## ⚠️ PROBLEMA ACTUAL

El Access Token de MercadoPago que proporcionaste en las imágenes está **inválido**.

**Error:** `invalid access token`

**Causa probable:**
- Es un token de sandbox/test (no de producción real)
- El token expiró
- Necesita refrescarse con OAuth

## ✅ SOLUCIÓN: Hacer Vinculación OAuth Real

Para que todo funcione, seguí estos pasos:

---

## PASO 1: Configurar Redirect URI en MercadoPago (⏱️ 5 min)

1. Ir a: https://www.mercadopago.com.ar/developers/panel/app

2. Seleccionar tu aplicación (Client ID: `4859738576577948`)

3. Ir a la sección **"OAuth"** o **"Configuración de OAuth"**

4. En **"Redirect URIs"**, agregar estas 2 URIs:

   ```
   http://localhost:3001/api/mercadopago/oauth/callback
   http://gestionq24.ddns.net:3001/api/mercadopago/oauth/callback
   ```

5. **Guardar cambios**

---

## PASO 2: Iniciar los Servicios (⏱️ 2 min)

### Terminal 1 - Backend:
```bash
cd "C:\Users\impresion3d\Desktop\programa gestion qrban 2\burgerpos\backend"
npm start
```

**Esperar ver:**
```
✅ PostgreSQL conectado
🚀 Servidor corriendo en puerto 3001
```

### Terminal 2 - Frontend:
```bash
cd "C:\Users\impresion3d\Desktop\programa gestion qrban 2\burgerpos\frontend"
npm run dev
```

**Esperar ver:**
```
Local:   http://localhost:3000
```

---

## PASO 3: Vincular Cuenta de MercadoPago (⏱️ 3 min)

1. **Abrir navegador** en: http://localhost:3000

2. **Hacer login:**
   - Email: `demo@burgerpos.com`
   - Password: `admin123`

3. **Ir a Configuraciones:**
   - Menú lateral izquierdo → Click en **"Configuraciones"** (ícono ⚙️)

4. **Activar MercadoPago:**
   - Scroll hasta **"Métodos de Pago"**
   - Buscar **"MercadoPago"**
   - Hacer click en el **toggle para activarlo** ✓

5. **Vincular cuenta:**
   - Debajo del toggle de MercadoPago, aparecerá un botón
   - Click en **"Vincular cuenta de MercadoPago"**

6. **Autorizar en el popup:**
   - Se abre una ventana popup de MercadoPago
   - **Ingresar con tu cuenta de MercadoPago**
   - Click en **"Permitir acceso"** o **"Autorizar"**
   - El popup se cierra automáticamente

7. **Verificar vinculación:**
   - Debe aparecer: **"✅ Cuenta vinculada correctamente"**
   - Debe mostrar:
     - Tu usuario de MercadoPago
     - Public Key
     - Botón "Desvincular"

---

## PASO 4: Crear Pedido como Cliente (⏱️ 3 min)

1. **Abrir nueva pestaña** (sin cerrar sesión de admin)

2. **Ir al menú público:**
   ```
   http://localhost:3000/menu/burger-demo
   ```

3. **Agregar productos al carrito:**
   - Click en algunos productos (ej: Clásica, Doble)
   - Click en **"Agregar al carrito"** en cada uno

4. **Ver carrito:**
   - Click en el ícono del carrito (esquina superior derecha)
   - Verificar productos y total

5. **Finalizar compra:**
   - Click en **"Finalizar compra"** o **"Pagar"**

6. **Completar datos:**
   - Nombre: `Juan Pérez`
   - Teléfono: `+5491155667788`
   - Email: `test@cliente.com`
   - Dirección de entrega (si es delivery):
     - Calle: `Av. Corrientes 1234`
     - Ciudad: `CABA`

7. **Seleccionar método de pago:**
   - Seleccionar **"MercadoPago"**
   - Click en **"Pagar ahora"** o **"Confirmar pedido"**

---

## PASO 5: Pagar con MercadoPago (⏱️ 2 min)

1. **Redirige a MercadoPago:**
   - Te redirige automáticamente al checkout de MercadoPago
   - Verás el resumen del pedido

2. **Ingresar datos de tarjeta DE PRUEBA:**

   ```
   Número de tarjeta: 5031 7557 3453 0604
   Vencimiento: 11/25
   CVV: 123
   Nombre: APRO
   DNI: 12345678
   ```

   **IMPORTANTE:** Esta es una tarjeta de prueba que MercadoPago acepta.
   - `APRO` = Pago aprobado
   - `OTHE` = Error genérico
   - `CALL` = Rechazado, llamar para autorizar

3. **Completar el pago:**
   - Click en **"Pagar"**
   - Esperar confirmación

4. **Vuelve a BurgerPOS:**
   - MercadoPago redirige de vuelta a tu sitio
   - Debe aparecer: **"✅ Pago exitoso"**
   - Muestra número de pedido y detalles

---

## PASO 6: Verificar en Panel de Pedidos (⏱️ 1 min)

1. **Volver a la pestaña de admin** (la del paso 3)

2. **Ir al Panel de Pedidos:**
   - Menú lateral → **"Pedidos"** o **"Panel de Pedidos"**

3. **Buscar tu pedido:**
   - Debe aparecer en la columna **"NUEVOS"**
   - Número de pedido visible
   - Cliente: Juan Pérez
   - Total: $XXXX

4. **Verificar estado de pago:**
   - Click en el pedido para ver detalles
   - **Estado de pago:** debe decir **"Cobrado"** o **"Aprobado"**
   - **Método de pago:** MercadoPago
   - **MP Payment ID:** debe tener un número

5. **Verificar webhook (opcional):**
   - En la terminal del backend, deberías ver logs como:
     ```
     📩 Webhook recibido de MercadoPago
     ✅ Pago aprobado: payment_id XXXXX
     ```

---

## PASO 7: Verificar en Base de Datos (Opcional)

Si querés ver los datos directamente en PostgreSQL:

```sql
-- Ver el pedido
SELECT 
  id, 
  "estadoPago", 
  "metodoPago", 
  "mpPaymentId", 
  "mpPreferenceId",
  total,
  "createdAt"
FROM pedidos 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- Ver las credenciales OAuth guardadas
SELECT 
  n.nombre as negocio,
  mc."publicKey",
  mc."userId",
  mc.activo,
  mc."expiresAt"
FROM mercadopago_credentials mc
JOIN negocios n ON n.id = mc."negocioId";
```

---

## 🎯 RESULTADO ESPERADO

Al finalizar estos pasos, deberías tener:

✅ Cuenta de MercadoPago vinculada vía OAuth
✅ Token de acceso válido guardado cifrado en BD
✅ Pedido creado desde el menú público
✅ Pago procesado correctamente en MercadoPago
✅ Pedido actualizado a estado "Cobrado"
✅ Webhook recibido y procesado
✅ Todo el flujo funcionando end-to-end

---

## 🚨 Troubleshooting

### Problema 1: "Redirect URI mismatch" en OAuth

**Causa:** La Redirect URI no está configurada en MercadoPago

**Solución:**
- Ir a https://www.mercadopago.com.ar/developers/panel/app
- Agregar las Redirect URIs mencionadas en PASO 1

### Problema 2: "invalid access token" al pagar

**Causa:** El token OAuth no está vinculado o está expirado

**Solución:**
- Desvincular cuenta (botón "Desvincular" en Configuraciones)
- Volver a vincular (botón "Vincular cuenta")
- Esto genera un nuevo token válido

### Problema 3: Popup OAuth no se abre

**Causa:** Navegador bloqueó popup

**Solución:**
- Permitir popups para localhost:3000 en configuración del navegador
- O mantener Ctrl presionado al hacer click en "Vincular"

### Problema 4: Pago rechazado en MercadoPago

**Causa:** Datos de tarjeta incorrectos o tarjeta no de prueba

**Solución:**
- Usar exactamente: `5031 7557 3453 0604`
- Nombre: `APRO` (importante, genera aprobación)
- No usar tarjetas reales en ambiente de prueba

### Problema 5: Webhook no se recibe

**Causa:** URL del webhook no configurada en MercadoPago

**Solución:**
- Ir a https://www.mercadopago.com.ar/developers/panel/app
- En sección "Webhooks" o "Notificaciones"
- Agregar URL: `http://localhost:3001/api/pagos/webhooks/mercadopago`
- (Nota: esto solo funciona si exponés el puerto públicamente)

---

## 📋 Checklist Final

Antes de dar por terminado:

- [ ] Redirect URIs configuradas en MercadoPago
- [ ] Backend corriendo sin errores
- [ ] Frontend corriendo sin errores
- [ ] Login exitoso en panel admin
- [ ] MercadoPago vinculado (aparece ✅ en Configuraciones)
- [ ] Pedido creado desde menú público
- [ ] Pago procesado en MercadoPago (tarjeta de prueba)
- [ ] Vuelve a página de éxito
- [ ] Pedido aparece en Panel de Pedidos
- [ ] Estado de pago es "Cobrado"

---

## 🎉 ¡Sistema Funcionando!

Una vez que pases todos estos pasos, el sistema estará 100% funcional.

**Los usuarios finales solo necesitarán:**
1. Click en "Vincular cuenta de MercadoPago" (1 vez)
2. Autorizar en popup (1 vez)
3. ¡Listo! Ya pueden recibir pagos

**Zero configuración técnica. Exactamente como Pedisy.** 🚀

---

## 📝 Notas Importantes

### Ambiente de Pruebas vs. Producción

Actualmente estás en **ambiente de pruebas** (sandbox):
- Usás tarjetas de prueba
- Pagos no son reales
- No se cobra dinero real

Para **producción real**:
1. Cambiar aplicación de MercadoPago a modo "Producción"
2. Re-vincular cuenta (generará tokens de producción)
3. Los clientes usarán tarjetas reales
4. Se cobrarán pagos reales

### Seguridad en Producción

Antes de pasar a producción:
- Cambiar `JWT_SECRET` en .env
- Cambiar `ENCRYPTION_KEY` en .env
- Usar HTTPS (Let's Encrypt)
- No exponer puerto PostgreSQL (5432) al internet
- Habilitar rate limiting

---

**Fin de la Guía** 🎉
