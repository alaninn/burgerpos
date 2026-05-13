# Configuración NoIP (gestionq24.ddns.net)

## ✅ Cambios Realizados

### Backend (.env)
```bash
BACKEND_URL=http://gestionq24.ddns.net:3001
FRONTEND_URL=http://localhost:3000,http://gestionq24.ddns.net:3000
```

---

## 🔧 Configuración Necesaria

### 1. **Router - Port Forwarding**

Debes abrir estos puertos en tu router:

| Puerto | Protocolo | Destino | Servicio |
|--------|-----------|---------|----------|
| 3000 | TCP | IP de tu PC | Frontend (React) |
| 3001 | TCP | IP de tu PC | Backend (Node.js) |
| 5432 | TCP | IP de tu PC | PostgreSQL (opcional) |

**Pasos:**
1. Ingresar al router (usualmente 192.168.0.1 o 192.168.1.1)
2. Buscar sección "Port Forwarding" o "NAT"
3. Agregar reglas:
   - Puerto Externo: 3000 → IP Interna: [TU_IP_LOCAL]:3000
   - Puerto Externo: 3001 → IP Interna: [TU_IP_LOCAL]:3001

### 2. **Firewall de Windows**

Abrir puertos en el Firewall:

```powershell
# Ejecutar como Administrador en PowerShell:

# Frontend (Puerto 3000)
New-NetFirewallRule -DisplayName "BurgerPOS Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Backend (Puerto 3001)
New-NetFirewallRule -DisplayName "BurgerPOS Backend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

### 3. **NoIP - Configuración**

Verificar que el cliente NoIP esté corriendo:
- Programa: NoIP DUC (Dynamic Update Client)
- Hostname: gestionq24.ddns.net
- IP: Debe actualizarse automáticamente

---

## 🧪 Verificar Acceso

### Desde DENTRO de tu red:
```bash
# Frontend
http://localhost:3000

# Backend
http://localhost:3001/api/health
```

### Desde FUERA de tu red (Internet):
```bash
# Frontend
http://gestionq24.ddns.net:3000

# Backend
http://gestionq24.ddns.net:3001/api/health
```

---

## ⚠️ Posibles Problemas

### Problema 1: "ERR_CONNECTION_REFUSED"
**Causa:** Puerto no abierto en router o firewall
**Solución:** Verificar port forwarding y reglas de firewall

### Problema 2: "ERR_CONNECTION_TIMED_OUT"
**Causa:** NoIP no actualizado o IP pública cambió
**Solución:** 
- Verificar cliente NoIP DUC esté corriendo
- Verificar en https://www.noip.com que la IP esté actualizada

### Problema 3: "CORS Error"
**Causa:** Backend no permite origen desde NoIP
**Solución:** Ya configurado en FRONTEND_URL

### Problema 4: Backend no responde desde NoIP
**Causa:** BACKEND_URL apunta a localhost
**Solución:** ✅ Ya cambiado a http://gestionq24.ddns.net:3001

---

## 🚀 Comandos para Iniciar

### Terminal 1 - Backend:
```bash
cd backend
npm start
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

---

## 🔍 Testing

### 1. Test Local (mismo PC)
```bash
curl http://localhost:3001/api/health
# Debe devolver: {"status":"ok"}
```

### 2. Test Desde Internet (usar otro dispositivo o datos móviles)
```bash
curl http://gestionq24.ddns.net:3001/api/health
# Debe devolver: {"status":"ok"}
```

### 3. Test Frontend
```bash
# Abrir navegador en otro dispositivo:
http://gestionq24.ddns.net:3000
```

---

## 📱 Obtener IP Interna de tu PC

```powershell
# Windows - PowerShell
ipconfig | findstr "IPv4"

# Ejemplo de resultado:
# IPv4 Address: 192.168.0.105
```

Usar esa IP (ej: 192.168.0.105) en la configuración de Port Forwarding del router.

---

## ✅ Checklist

- [ ] Port Forwarding configurado en router (3000 y 3001)
- [ ] Firewall de Windows permite puertos 3000 y 3001
- [ ] Cliente NoIP DUC corriendo y actualizado
- [ ] BACKEND_URL cambiado a gestionq24.ddns.net:3001
- [ ] FRONTEND_URL incluye gestionq24.ddns.net:3000
- [ ] Backend corriendo (npm start)
- [ ] Frontend corriendo (npm run dev)
- [ ] Test desde internet funciona

---

## 🌐 URLs Finales

### Acceso Local:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Acceso Internet (NoIP):
- Frontend: http://gestionq24.ddns.net:3000
- Backend: http://gestionq24.ddns.net:3001
- API Health: http://gestionq24.ddns.net:3001/api/health

---

## 🔐 Seguridad

⚠️ **Importante:**
- Cambiar contraseña de PostgreSQL (actualmente: 21129021)
- No exponer puerto 5432 al internet (solo local)
- Considerar HTTPS para producción (Let's Encrypt)
- Cambiar JWT_SECRET para producción
