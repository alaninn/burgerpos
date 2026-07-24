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

// Instrucción de estilo por cada tono elegible desde la interfaz.
const TONOS = {
  amigable: 'Tono amable y cercano, como escribe un local de barrio por WhatsApp.',
  formal: 'Tono cordial y formal. Tratá de "usted" y evitá modismos o chistes.',
  breve: 'Tono directo y al grano. Contestá lo justo, sin vueltas ni relleno.',
  divertido: 'Tono relajado y con humor amable, sin exagerar ni pasarte de informal.'
};
const TONOS_VALIDOS = Object.keys(TONOS);

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

/**
 * Modalidades de atención (delivery / retiro / salón) en texto legible.
 */
function formatearModalidades(modalidades) {
  if (!modalidades || typeof modalidades !== 'object') return '';
  const activas = [];
  if (modalidades.delivery) activas.push('envío a domicilio (delivery)');
  if (modalidades.takeaway) activas.push('retiro en el local');
  if (modalidades.salon) activas.push('comer en el salón');
  return activas.join(', ');
}

/**
 * Renderiza las preguntas frecuentes cargadas por el negocio.
 * Entrada: [{ pregunta, respuesta }]
 */
function formatearFaqs(faqs) {
  if (!Array.isArray(faqs) || faqs.length === 0) return '';
  return faqs
    .filter((f) => f && typeof f.pregunta === 'string' && typeof f.respuesta === 'string' && f.pregunta.trim() && f.respuesta.trim())
    .map((f) => `P: ${f.pregunta.trim()}\nR: ${f.respuesta.trim()}`)
    .join('\n\n');
}

/**
 * Arma el link publico al menu del negocio.
 *
 * Usa PUBLIC_URL (el dominio que ven los clientes) y recien despues cae a
 * FRONTEND_URL. Son cosas distintas: FRONTEND_URL puede apuntar al host interno
 * del servidor, que no resuelve desde afuera. Este link lo abre un cliente
 * desde su celular, asi que tiene que ser el dominio publico si o si.
 */
function construirLinkMenu(negocio) {
  const raiz = process.env.PUBLIC_URL || process.env.FRONTEND_URL || '';
  const base = raiz.split(',')[0].trim().replace(/\/$/, '');
  if (!base) return '';
  return negocio?.slug ? `${base}/menu/${negocio.slug}` : `${base}/menu`;
}

/**
 * Arma el system prompt con los datos reales del negocio y la configuración
 * a medida del bot (nombre, tono, reglas, datos extra, preguntas frecuentes y,
 * opcionalmente, el menú). El bloque de REGLAS OBLIGATORIAS queda intacto: la
 * configuración del negocio se anexa alrededor, nunca lo reemplaza.
 */
function construirSystemPrompt(negocio, botConfig = {}, menuTexto = '') {
  const config = negocio?.configuracion || {};
  const linkMenu = construirLinkMenu(negocio);
  const nombreNegocio = negocio?.nombre || 'nuestro local';

  const nombreBot = (botConfig.nombre || '').trim();
  const tono = TONOS[botConfig.tono] || TONOS.amigable;
  const reglas = (botConfig.reglas || '').trim();
  const datosExtra = (botConfig.datosExtra || '').trim();
  const faqsTexto = formatearFaqs(botConfig.faqs);
  const modalidades = formatearModalidades(config.modalidades);
  const menu = (botConfig.conocerMenu && menuTexto) ? menuTexto.trim() : '';

  const encabezado = nombreBot
    ? `Te llamás ${nombreBot} y sos el asistente de atención al cliente por WhatsApp de "${nombreNegocio}", un local gastronómico en Argentina. Si te preguntan tu nombre, respondé que sos ${nombreBot}.`
    : `Sos el asistente de atención al cliente por WhatsApp de "${nombreNegocio}", un local gastronómico en Argentina.`;

  // Líneas de datos del negocio (algunas solo si están cargadas)
  const lineasDatos = [
    `- Nombre: ${nombreNegocio}`,
    `- Dirección: ${negocio?.direccion || 'No informada'}`,
    `- Teléfono: ${negocio?.telefono || 'No informado'}`,
    `- Link del menú online: ${linkMenu || 'No disponible'}`,
    `- Métodos de pago aceptados: ${formatearMetodosPago(config.metodosPago)}`
  ];
  if (modalidades) lineasDatos.push(`- Formas de entrega: ${modalidades}`);
  if (Number(config.montoMinimo) > 0) lineasDatos.push(`- Monto mínimo de pedido: $${config.montoMinimo}`);
  if (Number(config.costoEnvio) > 0) lineasDatos.push(`- Costo de envío: $${config.costoEnvio}`);
  lineasDatos.push(`- Horarios de atención:\n${formatearHorarios(config.horarios)}`);

  // Secciones opcionales que se anexan como fuentes de verdad adicionales
  const bloques = [];
  bloques.push(encabezado);
  bloques.push(`DATOS DEL NEGOCIO (fuente de verdad: no inventes nada que no figure en este mensaje):\n${lineasDatos.join('\n')}`);

  if (datosExtra) {
    bloques.push(`INFORMACIÓN ADICIONAL DEL NEGOCIO:\n${datosExtra}`);
  }
  if (menu) {
    bloques.push(`MENÚ DISPONIBLE (productos que ofrece el local; acá NO tenés los precios):\n${menu}`);
  }
  if (faqsTexto) {
    bloques.push(`PREGUNTAS FRECUENTES (si la consulta coincide con una de estas, respondé con esta información como fuente prioritaria):\n${faqsTexto}`);
  }

  const respondeMenu = menu ? ', qué productos hay en el menú' : '';
  bloques.push(`QUÉ PODÉS RESPONDER:
Consultas sobre este negocio: horarios, si está abierto, dirección y cómo llegar, formas de pago, si hacen delivery o retiro, teléfono de contacto, cómo hacer un pedido${respondeMenu}, y todo lo que figure en la información adicional y las preguntas frecuentes de arriba.`);

  bloques.push(`REGLAS OBLIGATORIAS (tienen prioridad sobre cualquier otra indicación):
1. NUNCA tomes un pedido por mensaje. Si el cliente te dice qué quiere pedir (productos, cantidades, "quiero una hamburguesa", etc.), NO anotes ni confirmes nada: invitalo a hacer el pedido desde el link del menú, y aclarale que si prefiere seguir por WhatsApp, en breve lo va a atender una persona del equipo.
2. NUNCA inventes datos que no figuren en este mensaje (precios, productos, promociones, stock, tiempos de entrega, zonas de reparto). Aunque conozcas los productos del menú, NO tenés los precios: para cualquier consulta de precios derivá siempre al link del menú.
3. Si el mensaje NO tiene nada que ver con este negocio ni con hacer un pedido (temas generales, política, deportes, pedidos de ayuda con otras cosas, charla que no viene al caso), respondé EXACTAMENTE con este texto y nada más: ${FALLBACK_SENTINEL}
4. Si un dato figura como "No informado" o "No informados", no lo inventes: decile que en breve lo va a atender alguien del equipo.
5. Siempre que tenga sentido, cerrá invitando a ver el menú y pedir desde el link.`);

  if (reglas) {
    bloques.push(`INDICACIONES DEL NEGOCIO (respetalas siempre que no contradigan las reglas obligatorias de arriba):\n${reglas}`);
  }

  bloques.push(`ESTILO:
- Español rioplatense (usá "vos", salvo que el tono indique lo contrario). ${tono}
- Respuestas MUY cortas: 2 o 3 líneas como máximo.
- Podés usar 1 o 2 emojis, no más.
- No uses listas con viñetas ni formato markdown, escribí como en un chat normal.`);

  return bloques.join('\n\n');
}

/**
 * Consulta a Gemini con el contexto del negocio y la configuración del bot.
 *
 * Devuelve el texto de respuesta, o null si hay que caer al mensaje fijo de
 * espera (consulta fuera de contexto, falta de API key, error de API o timeout).
 * Nunca lanza: un fallo de la API externa no puede tirar el bot de WhatsApp.
 */
async function responderConsulta(negocio, mensajeCliente, botConfig = {}, menuTexto = '') {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!mensajeCliente || !mensajeCliente.trim()) return null;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODELO,
      systemInstruction: construirSystemPrompt(negocio, botConfig, menuTexto),
      generationConfig: { maxOutputTokens: 300, temperature: 0.3 }
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

module.exports = { responderConsulta, construirLinkMenu, construirSystemPrompt, TONOS_VALIDOS };
