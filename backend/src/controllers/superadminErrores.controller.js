// =============================================
// SuperAdmin: visor de logs y reporte de errores.
// - Logs en vivo (buffer en memoria) y archivo de pm2 (ultimos KB).
// - Reporte .md con errores de pantalla + logs de error del servidor.
// - Subida del reporte a GitHub (rama de reportes) via API REST, para que
//   la IA lo lea con `git fetch origin reportes-errores` sin tocar produccion.
// =============================================
const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { ErrorFrontend, Negocio, Usuario } = require('../models');
const logBuffer = require('../services/logBuffer');

const PM2_APP = process.env.PM2_APP_NAME || 'burgerpos';

// ── Fechas en horario de Argentina ────────────────────────
const TZ_AR = 'America/Argentina/Buenos_Aires';
function partesFechaAr(d = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_AR, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  return Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
}
function fechaArchivoAr(d = new Date()) {
  const p = partesFechaAr(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}-${p.minute}-${p.second}`;
}
function fechaLegibleAr(d = new Date()) {
  const p = partesFechaAr(d);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} (hora Argentina)`;
}

// Lee los ultimos `maxBytes` de un archivo sin cargarlo entero
function leerColaArchivo(archivo, maxBytes) {
  const stat = fs.statSync(archivo);
  const inicio = Math.max(0, stat.size - maxBytes);
  const fd = fs.openSync(archivo, 'r');
  const buf = Buffer.alloc(Math.min(maxBytes, stat.size));
  fs.readSync(fd, buf, 0, buf.length, inicio);
  fs.closeSync(fd);
  let texto = buf.toString('utf8');
  if (inicio > 0) texto = texto.slice(texto.indexOf('\n') + 1);
  return { texto, bytesTotales: stat.size };
}

function rutaLogPm2(tipo) {
  const dirLogs = process.env.PM2_LOG_DIR || path.join(os.homedir(), '.pm2', 'logs');
  return path.join(dirLogs, `${PM2_APP}-${tipo}.log`);
}

// ── Visor de logs ─────────────────────────────────────────

// GET /api/superadmin/logs/en-vivo?desde=ID (polling incremental)
exports.logsEnVivo = (req, res) => {
  const desde = parseInt(req.query.desde) || 0;
  res.json(logBuffer.obtenerDesde(desde));
};

// GET /api/superadmin/logs/archivo?tipo=out|error (ultimos 64KB del log de pm2)
exports.logsArchivo = (req, res) => {
  try {
    const tipo = req.query.tipo === 'error' ? 'error' : 'out';
    const archivo = rutaLogPm2(tipo);

    if (!fs.existsSync(archivo)) {
      return res.json({ disponible: false, mensaje: `No se encontró el archivo de log (${archivo}). Este visor funciona solo en el servidor con pm2.` });
    }

    const { texto, bytesTotales } = leerColaArchivo(archivo, 64 * 1024);
    res.json({ disponible: true, archivo: path.basename(archivo), bytes_totales: bytesTotales, contenido: texto });
  } catch (error) {
    console.error('Error leyendo log:', error);
    res.status(500).json({ error: 'Error al leer el archivo de log' });
  }
};

// ── Errores de pantalla (frontend) ────────────────────────

// GET /api/superadmin/errores-frontend
exports.listarErroresFrontend = async (req, res) => {
  try {
    const errores = await ErrorFrontend.findAll({
      include: [
        { model: Negocio, as: 'negocio', attributes: ['id', 'nombre'] },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    res.json(errores);
  } catch (error) {
    console.error('Error obteniendo errores frontend:', error);
    res.status(500).json({ error: 'Error al obtener errores' });
  }
};

// ── Reporte de errores ────────────────────────────────────

// Arma el Markdown del reporte: errores de pantalla + logs del server.
async function construirReporteErrores() {
  const ahora = fechaLegibleAr();

  // 1) Errores de pantalla (frontend)
  const erroresFront = await ErrorFrontend.findAll({
    include: [
      { model: Negocio, as: 'negocio', attributes: ['id', 'nombre'] },
      { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  // 2) Ultimos logs de ERROR del servidor (archivo de pm2, ultimos 32KB)
  let logsServer = '(no disponible)';
  let logPath = null;
  let logServerConContenido = false;
  try {
    const archivo = rutaLogPm2('error');
    if (fs.existsSync(archivo)) {
      logPath = archivo;
      const { texto } = leerColaArchivo(archivo, 32 * 1024);
      logServerConContenido = texto.trim().length > 0;
      logsServer = texto.trim() || '(sin errores recientes en el log)';
    }
  } catch (e) {
    logsServer = `(error al leer el log: ${e.message})`;
  }

  // 3) Logs de error en memoria (por si pm2 no esta, p. ej. en local)
  let logsMemoria = '';
  try {
    const { lineas } = logBuffer.obtenerDesde(0);
    const enMemoria = (lineas || []).filter(l => l.nivel === 'error');
    if (enMemoria.length) {
      logsMemoria = enMemoria.slice(-40).map(l => `[${l.fecha}] ${l.mensaje}`).join('\n');
    }
  } catch { /* ignore */ }

  let md = `# 🐞 Reporte de errores — BurgerPOS\n\n`;
  md += `Generado: ${ahora}\n\n`;
  md += `> Archivo para que la IA diagnostique. Indicá: "revisá reportes/<este archivo>".\n\n`;
  md += `---\n\n## Errores de pantalla (frontend) — ${erroresFront.length}\n\n`;
  if (erroresFront.length === 0) {
    md += `_Sin errores de pantalla registrados._\n\n`;
  } else {
    for (const e of erroresFront) {
      md += `### #${e.id} · ${fechaLegibleAr(new Date(e.createdAt))}\n`;
      md += `- **Negocio**: ${e.negocio?.nombre || e.negocioId || '-'} · **Usuario**: ${e.usuario?.nombre || e.usuarioId || '-'}\n`;
      md += `- **URL**: ${e.url || '-'}\n`;
      md += `- **Navegador**: ${(e.userAgent || '-').slice(0, 160)}\n`;
      md += `- **Mensaje**: ${e.mensaje || '-'}\n`;
      if (e.stack) md += `\n\`\`\`\n${String(e.stack).slice(0, 2000)}\n\`\`\`\n`;
      md += `\n`;
    }
  }
  md += `---\n\n## Logs de error del servidor (pm2, últimos)\n\n\`\`\`\n${logsServer.slice(-12000)}\n\`\`\`\n`;
  if (logsMemoria) md += `\n## Logs de error en memoria\n\n\`\`\`\n${logsMemoria.slice(-8000)}\n\`\`\`\n`;

  const idsFront = erroresFront.map(e => e.id);
  const hayErrores = idsFront.length > 0 || logServerConContenido || logsMemoria.length > 0;
  return { md, idsFront, logPath, hayErrores };
}

// Limpia las fuentes ya incluidas en un reporte subido (para no repetir
// errores viejos en el proximo). Se llama SOLO tras subir a git con exito.
async function limpiarFuentesReporte({ idsFront, logPath }) {
  if (idsFront && idsFront.length) {
    try {
      await ErrorFrontend.destroy({ where: { id: idsFront } });
    } catch (e) { console.error('No se pudieron borrar errores_frontend:', e.message); }
  }
  if (logPath) {
    try { fs.truncateSync(logPath, 0); }
    catch (e) { console.error('No se pudo truncar el log de pm2:', e.message); }
  }
  try { logBuffer.limpiar(); } catch { /* ignore */ }
}

// GET /api/superadmin/errores/reporte — descarga el .md
exports.descargarReporte = async (req, res) => {
  try {
    const { md } = await construirReporteErrores();
    const nombre = `errores-${fechaArchivoAr()}.md`;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(md);
  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ error: 'Error al generar el reporte de errores' });
  }
};

// POST /api/superadmin/errores/subir-git — sube el .md a GitHub via API REST
// (no toca el git de produccion). Necesita GITHUB_TOKEN en el .env del server.
exports.subirReporteGit = async (req, res) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || 'alaninn/burgerpos';
    const rama = process.env.GITHUB_REPORTES_BRANCH || 'reportes-errores';
    if (!token) {
      return res.status(400).json({
        error: 'Falta configurar GITHUB_TOKEN en el servidor. Por ahora usá "Descargar".',
        sinToken: true,
      });
    }

    const reporte = await construirReporteErrores();

    // Si no hay errores reales, no subimos nada (no ensuciar la rama de reportes)
    if (!reporte.hayErrores) {
      return res.json({ vacio: true, mensaje: 'No hay errores para enviar 🎉 No se subió nada.' });
    }

    const nombre = `reportes/errores-${fechaArchivoAr()}.md`;
    const api = `https://api.github.com/repos/${repo}`;
    const headers = { Authorization: `Bearer ${token}`, 'User-Agent': 'burgerpos', Accept: 'application/vnd.github+json' };

    // Asegurar que la rama de reportes exista (si no, crearla desde la default)
    try {
      await axios.get(`${api}/git/ref/heads/${rama}`, { headers });
    } catch (e) {
      if (e.response?.status === 404) {
        const repoInfo = await axios.get(api, { headers });
        const base = repoInfo.data.default_branch || 'main';
        const baseRef = await axios.get(`${api}/git/ref/heads/${base}`, { headers });
        await axios.post(`${api}/git/refs`, { ref: `refs/heads/${rama}`, sha: baseRef.data.object.sha }, { headers });
      } else { throw e; }
    }

    // Subir el archivo (nombre unico → no necesita sha de archivo previo)
    const contenidoB64 = Buffer.from(reporte.md, 'utf8').toString('base64');
    const r = await axios.put(`${api}/contents/${encodeURIComponent(nombre).replace(/%2F/g, '/')}`, {
      message: `Reporte de errores ${fechaLegibleAr()}`,
      content: contenidoB64,
      branch: rama,
    }, { headers });

    // Subido OK → limpiar las fuentes para no repetir estos errores
    await limpiarFuentesReporte(reporte);

    res.json({
      mensaje: 'Reporte subido a GitHub',
      archivo: nombre,
      rama,
      url: r.data.content?.html_url || null,
      limpiado: { errores_pantalla: reporte.idsFront.length, log_servidor: !!reporte.logPath },
    });
  } catch (error) {
    console.error('Error subiendo reporte a git:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.message || 'Error al subir el reporte a GitHub' });
  }
};
