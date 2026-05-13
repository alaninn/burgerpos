# ✅ OAuth de MercadoPago - CONFIGURADO

## 🎉 Estado: Sistema OAuth Configurado y Listo

Las credenciales OAuth de MercadoPago están **guardadas cifradas** en la base de datos.

---

## 📋 Credenciales Configuradas

### OAuth (Producción):
- ✅ **Client ID:** `4859738576577948`
- ✅ **Client Secret:** `gV2gsblad1XvNyeMSC2t1kzVqaFQeQPY` (cifrado)
- ✅ **Redirect URI:** `http://gestionq24.ddns.net:3001/api/mercadopago/oauth/callback`

---

## 🔐 Configuración en MercadoPago (IMPORTANTE)

**⚠️ PASO CRÍTICO: Debes configurar la Redirect URI en MercadoPago**

1. Ir a: https://www.mercadopago.com.ar/developers/panel/app
2. Seleccionar tu aplicación (Client ID: 4859738576577948)
3. Ir a la sección **OAuth**
4. En **Redirect URIs**, agregar estas 2 URIs:

```
http://gestionq24.ddns.net:3001/api/mercadopago/oauth/callback
http://localhost:3001/api/mercadopago/oauth/callback
```

5. Guardar cambios

**Sin este paso, el flujo OAuth NO funcionará.**

---

## 🧪 Probar el Sistema (Paso a Paso)

### Pre-requisitos:

1. **Backend corriendo:**
   ```bash
   cd backend
   npm start
   ```

2. **Frontend corriendo:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **PostgreSQL corriendo** (base de datos burgerpos)

---

### Paso 1: Verificar Endpoints OAuth

**Test 1: Health Check**
```bash
curl http://localhost:3001/api/health
# Debe retornar: {"status":"ok"}
```

**Test 2: Verificar configuración (requiere token de superadmin)**
```bash
curl http://localhost:3001/api/platform-config/mercadopago \
  -H "Authorization: Bearer <TOKEN_SUPERADMIN>"
# Debe retornar: Client ID y Redirect URI
```

---

### Paso 2: Probar Flujo OAuth Completo

**2.1. Login como Admin de un Negocio**
- Ir a: http://localhost:3000
- Login con usuario admin de algún negocio

**2.2. Ir a Configuraciones**
- Menú lateral → **Configuraciones**
- Scroll hasta **Métodos de Pago**

**2.3. Activar MercadoPago**
- Toggle **MercadoPago** a ✓ Activo

**2.4. Vincular Cuenta**
- Click en botón **"Vincular cuenta de MercadoPago"**
- Se abre popup con login de MercadoPago
- Ingresar con cuenta de MercadoPago
- Autorizar la aplicación
- Popup se cierra automáticamente

**2.5. Verificar Vinculación**
- Debe aparecer: **"✅ Cuenta vinculada correctamente"**
- Debe mostrar:
  - Usuario de MercadoPago
  - Public Key
  - Botón "Desvincular"

---

### Paso 3: Probar Pago Real

**3.1. Crear Pedido como Cliente**
- Ir al menú público: `http://localhost:3000/menu/<slug-del-negocio>`
- Agregar productos al carrito
- Click en **"Finalizar Compra"**

**3.2. Seleccionar MercadoPago**
- En métodos de pago, seleccionar **MercadoPago**
- Click en **"Pagar ahora"**

**3.3. Completar Pago**
- Redirige a checkout de MercadoPago
- Completar pago con:
  - **Tarjeta de prueba:** 5031 7557 3453 0604
  - **Vencimiento:** 11/25
  - **CVV:** 123
  - **Nombre:** APRO (para aprobar)

**3.4. Verificar Resultado**
- Vuelve a BurgerPOS
- Debe mostrar: **"✅ Pago exitoso"**
- El pedido debe aparecer en Panel de Pedidos como **"Cobrado"**

---

## 🌐 Testing desde NoIP (Acceso Externo)

### Pre-requisitos NoIP:

Seguir la guía: **CONFIGURACION_NOIP.md**

1. **Port Forwarding en Router:**
   - Puerto 3000 → IP local (frontend)
   - Puerto 3001 → IP local (backend)

2. **Firewall de Windows:**
   ```powershell
   # Ejecutar como Administrador:
   New-NetFirewallRule -DisplayName "BurgerPOS Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
   New-NetFirewallRule -DisplayName "BurgerPOS Backend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
   ```

3. **NoIP DUC corriendo y actualizado**

### Testing desde Internet:

**Desde otro dispositivo (datos móviles o red diferente):**

```bash
# Test backend
curl http://gestionq24.ddns.net:3001/api/health

# Abrir frontend
http://gestionq24.ddns.net:3000
```

Repetir el flujo OAuth desde acceso externo (pasos 2 y 3).

---

## 🔍 Verificar Base de Datos

**Ver configuración OAuth:**
```sql
SELECT key, descripcion, "createdAt" 
FROM platform_config 
WHERE key LIKE 'mp_%';
```

**Ver credenciales de negocios:**
```sql
SELECT 
  n.nombre,
  mc.activo,
  mc."publicKey",
  mc."userId",
  mc."expiresAt",
  mc."createdAt"
FROM mercadopago_credentials mc
JOIN negocios n ON n.id = mc."negocioId";
```

**NOTA:** Los campos `accessToken` y `refreshToken` están **cifrados** (AES-256-GCM).

---

## 🚨 Troubleshooting

### Error: "Redirect URI mismatch"
**Causa:** La Redirect URI no está configurada en MercadoPago
**Solución:** 
- Ir al panel de MercadoPago → OAuth → Redirect URIs
- Agregar: `http://gestionq24.ddns.net:3001/api/mercadopago/oauth/callback`

### Error: "Invalid client_id"
**Causa:** Client ID incorrecto
**Solución:** Verificar que sea `4859738576577948`

### Error: "Invalid client_secret"
**Causa:** Client Secret incorrecto
**Solución:** Verificar que sea `gV2gsblad1XvNyeMSC2t1kzVqaFQeQPY`

### Error: "Cannot connect to backend"
**Causa:** Backend no está corriendo o firewall bloqueando
**Solución:**
1. Verificar backend: `curl http://localhost:3001/api/health`
2. Verificar firewall (ver CONFIGURACION_NOIP.md)
3. Verificar port forwarding en router

### Popup OAuth no se abre
**Causa:** Navegador bloqueó popup
**Solución:**
- Permitir popups para localhost:3000
- Intentar con Ctrl+Click en el botón

### Token expirado
**Causa:** El access_token venció
**Solución:** El sistema **refresca automáticamente** el token. Si falla:
1. Verificar que `refreshToken` esté en BD
2. Ver logs del backend para errores
3. Desvincular y volver a vincular cuenta

---

## ✅ Checklist Final

Antes de considerar el sistema 100% funcional:

### Backend:
- [x] Migraciones ejecutadas (platform_config, mercadopago_credentials)
- [x] Credenciales OAuth guardadas cifradas
- [x] Backend corriendo en puerto 3001
- [ ] Endpoints OAuth accesibles (GET /authorize, GET /callback, GET /status)

### Frontend:
- [ ] Frontend corriendo en puerto 3000
- [ ] Componente MercadoPagoOAuthSection visible en Configuraciones
- [ ] oauth-callback.html accesible en /oauth-callback.html

### MercadoPago:
- [ ] Redirect URIs configuradas en panel de MercadoPago
- [ ] Aplicación OAuth en modo PRODUCCIÓN (no sandbox)

### NoIP (Opcional - para acceso externo):
- [ ] Port forwarding configurado (3000, 3001)
- [ ] Firewall de Windows configurado
- [ ] NoIP DUC corriendo
- [ ] Acceso desde internet funciona

### Testing:
- [ ] Negocio puede vincular cuenta de MercadoPago
- [ ] Popup OAuth abre y cierra correctamente
- [ ] Estado "✅ Vinculado" aparece después de autorizar
- [ ] Cliente puede crear pedido y pagar con MercadoPago
- [ ] Pago se procesa y pedido actualiza a "Cobrado"
- [ ] Webhook de MercadoPago funciona

---

## 📝 Próximos Pasos

1. **Configurar Redirect URIs en MercadoPago** (CRÍTICO)
2. Iniciar backend y frontend
3. Probar flujo OAuth local
4. Configurar NoIP para acceso externo (opcional)
5. Probar flujo OAuth desde internet
6. Probar pago real con tarjeta de prueba

---

## 🎯 URLs Finales

### Local:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- API Health: http://localhost:3001/api/health

### NoIP (Externo):
- Frontend: http://gestionq24.ddns.net:3000
- Backend: http://gestionq24.ddns.net:3001
- API Health: http://gestionq24.ddns.net:3001/api/health
- OAuth Callback: http://gestionq24.ddns.net:3001/api/mercadopago/oauth/callback

---

## 🔐 Seguridad

✅ **Implementado:**
- AES-256-GCM para cifrado de tokens
- HMAC-SHA256 para state parameter (CSRF protection)
- Tokens nunca expuestos en respuestas API
- Refresh automático de tokens
- OAuth 2.0 estándar

⚠️ **Para Producción:**
- Cambiar ENCRYPTION_KEY a nueva clave aleatoria
- Cambiar JWT_SECRET
- Usar HTTPS (Let's Encrypt)
- No exponer puerto PostgreSQL (5432) al internet
- Habilitar rate limiting en endpoints críticos

---

## 🎉 Sistema Listo

El sistema OAuth de MercadoPago está **100% configurado** a nivel de backend.

**Falta solo:**
1. Configurar Redirect URIs en MercadoPago
2. Probar el flujo completo

Una vez hecho esto, los negocios podrán vincular sus cuentas con **1 solo clic** y **cero configuración técnica**. 🚀
