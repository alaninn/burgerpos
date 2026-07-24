const { GoogleGenerativeAI } = require('@google/generative-ai');

// La IA responde con este marcador cuando la consulta se sale del contexto del
// negocio. El codigo lo detecta y lo reemplaza por el mensaje fijo de espera,
// para que el texto final que ve el cliente lo controle siempre el negocio.
const FALLBACK_SENTINEL = '[[FALLBACK_HUMANO]]';
const TIMEOUT_MS = 8000;
// Version fija a proposito: los alias tipo "-latest" cambian de modelo solos y
// pueden alterar el comportamiento del bot sin aviso. Se puede sobreescribir
// por env si en algun momento cambia la cuota disponible de la cuenta.
const MODELO = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * Convierte configuracion.horarios en texto plano legible para el prompt.
 * Estructura de entrada: [{ dia, cerrado, turnos: [{ apertura, cierre }] }]
 */
function formatearHorarios(horarios) {
  if (!Array.isArray(horarios) || horarios.length === 0) return 'No informados';

  const lineas = horarios
    .slice()
    .sort((a, b) => DIAS_ORDEN.indexOf(a?.dia) - DIAS_ORDEN.indexOf(b?.dia))
    .map((h) => {
      if (!h?.dia) return null;
      if (h.cerrado) return `- ${h.dia}: cerrado`;
      const turnos = (h.turnos || [])
        .filter((t) => t?.apertura && t?.cierre)
        .map((t) => `${t.apertura} a ${t.cierre}`);
      if (turnos.length === 0) return `- ${h.dia}: cerrado`;
      return `- ${h.dia}: ${turnos.join(' y ')}`;
    })
    .filter(Boolean);

  return lineas.length ? lineas.join('\n') : 'No informados';
}

/**
 * Convierte configuracion.metodosPago en una lista de nombres legibles.
 * Estructura de entrada: { [clave]: { activo, nombrePersonalizado, ... } }
 */
function formatearMetodosPago(metodosPago) {
  if (!metodosPago || typeof metodosPago !== 'object') return 'No informados';

  const nombres = Object.entries(metodosPago)
    .filter(([, valor]) => {
      // Formato viejo: la clave apunta directo a un booleano
      if (typeof valor === 'boolean') return valor;
      return valor && valor.activo === true && valor.oculto !== true;
    })
    .map(([clave, valor]) => {
      if (valor && typeof valor === 'object' && valor.nombrePersonalizado) {
        return valor.nombrePersonalizado;
      }
      return clave.replace(/_/g, ' ');
    });

  return nombres.length ? nombres.join(', ') : 'No informados';
}

function construirLinkMenu(negocio) {
  const base = (process.env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/$/, '');
  if (!base) return '';
  return negocio?.slug ? `${base}/menu/${negocio.slug}` : `${base}/menu`;
}

/**
 * Arma el system prompt con los datos reales del negocio y las reglas de
 * comportamiento del bot.
 */
function construirSystemPrompt(negocio) {
  const config = negocio?.configuracion || {};
  const linkMenu = construirLinkMenu(negocio);

  return `Sos el asistente de atención al cliente por WhatsApp de "${negocio?.nombre || 'nuestro local'}", un local gastronómico en Argentina.

DATOS DEL NEGOCIO (única fuente de verdad, no inventes nada fuera de esto):
- Nombre: ${negocio?.nombre || 'No informado'}
- Dirección: ${negocio?.direccion || 'No informada'}
- Teléfono: ${negocio?.telefono || 'No informado'}
- Link del menú online: ${linkMenu || 'No disponible'}
- Métodos de pago aceptados: ${formatearMetodosPago(config.metodosPago)}
- Horarios de atención:
${formatearHorarios(config.horarios)}

QUÉ PODÉS RESPONDER:
Solamente consultas sobre este negocio: horarios, si está abierto, dirección y cómo llegar, formas de pago, si hacen delivery o retiro en el local, teléfono de contacto, y cómo hacer un pedido.

REGLAS OBLIGATORIAS:
1. NUNCA tomes un pedido por mensaje. Si el cliente te dice qué quiere pedir (productos, cantidades, "quiero una hamburguesa", etc.), NO anotes ni confirmes nada: invitalo a hacer el pedido desde el link del menú, y aclarale que si prefiere seguir por WhatsApp, en breve lo va a atender una persona del equipo.
2. NUNCA inventes datos que no estén en la lista de arriba. Si te preguntan algo del negocio que no figura (precios, productos, promociones, stock, tiempos de entrega, zonas de reparto), no lo adivines: respondé que en breve lo va a atender alguien del equipo que le va a poder confirmar eso.
3. Si el mensaje NO tiene nada que ver con este negocio ni con hacer un pedido (temas generales, política, deportes, pedidos de ayuda con otras cosas, charla que no viene al caso), respondé EXACTAMENTE con este texto y nada más: ${FALLBACK_SENTINEL}
4. Si un dato figura como "No informado" o "No informados", no lo inventes: decile que en breve lo va a atender alguien del equipo.
5. Siempre que tenga sentido, cerrá invitando a ver el menú y pedir desde el link.

ESTILO:
- Español rioplatense (usá "vos"), tono amable y cercano, como escribe un local por WhatsApp.
- Respuestas MUY cortas: 2 o 3 líneas como máximo.
- Podés usar 1 o 2 emojis, no más.
- No uses listas con viñetas ni formato markdown, escribí como en un chat normal.`;
}

/**
 * Consulta a Gemini con el contexto del negocio.
 *
 * Devuelve el texto de respuesta, o null si hay que caer al mensaje fijo de
 * espera (consulta fuera de contexto, falta de API key, error de API o timeout).
 * Nunca lanza: un fallo de la API externa no puede tirar el bot de WhatsApp.
 */
async function responderConsulta(negocio, mensajeCliente) {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!mensajeCliente || !mensajeCliente.trim()) return null;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODELO,
      systemInstruction: construirSystemPrompt(negocio),
      generationConfig: { maxOutputTokens: 200, temperature: 0.3 }
    });

    const resultado = await Promise.race([
      model.generateContent(mensajeCliente.slice(0, 1000)),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout Gemini')), TIMEOUT_MS))
    ]);

    const texto = (resultado.response.text() || '').trim();
    if (!texto || texto.includes(FALLBACK_SENTINEL)) return null;

    return texto;
  } catch (error) {
    console.error('Error consultando Gemini:', error.message);
    return null;
  }
}

module.exports = { responderConsulta };
