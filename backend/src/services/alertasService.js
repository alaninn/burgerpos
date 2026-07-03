// =============================================
// SERVICIO: Alertas automaticas para el superadmin
// Corre cada hora y detecta: vencimientos proximos (<5 dias), vencimientos
// pasados, y negocios inactivos (>7 dias sin pedidos). No duplica alertas
// del mismo tipo/negocio en el mismo dia.
// =============================================

const { Op } = require('sequelize');
const { Negocio, Pedido, Alerta } = require('../models');

async function existeAlertaHoy(tipo, negocioId) {
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const existente = await Alerta.findOne({
    where: { tipo, negocioId, createdAt: { [Op.gte]: inicioHoy } }
  });
  return !!existente;
}

async function generarAlertas() {
  const ahora = new Date();
  const en5dias = new Date(ahora.getTime() + 5 * 24 * 60 * 60 * 1000);
  const hace7dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
  let creadas = 0;

  const negocios = await Negocio.findAll({
    where: { activo: true },
    attributes: ['id', 'nombre', 'vencimiento']
  });

  for (const n of negocios) {
    // 1) Vencimiento ya pasado (critica)
    if (n.vencimiento && new Date(n.vencimiento) < ahora) {
      if (!(await existeAlertaHoy('vencimiento_pasado', n.id))) {
        await Alerta.create({
          tipo: 'vencimiento_pasado',
          titulo: `${n.nombre}: plan vencido`,
          descripcion: `El plan venció el ${new Date(n.vencimiento).toLocaleDateString('es-AR')}. Registrá el pago o suspendé el negocio.`,
          severidad: 'critica',
          negocioId: n.id
        });
        creadas++;
      }
      continue; // si ya vencio, no tiene sentido la alerta de "proximo a vencer"
    }

    // 2) Vencimiento proximo (<5 dias) (alta)
    if (n.vencimiento && new Date(n.vencimiento) <= en5dias) {
      if (!(await existeAlertaHoy('vencimiento_proximo', n.id))) {
        const dias = Math.ceil((new Date(n.vencimiento) - ahora) / (1000 * 60 * 60 * 24));
        await Alerta.create({
          tipo: 'vencimiento_proximo',
          titulo: `${n.nombre}: vence en ${dias} día${dias === 1 ? '' : 's'}`,
          descripcion: `El plan vence el ${new Date(n.vencimiento).toLocaleDateString('es-AR')}. Contactá al negocio para renovar.`,
          severidad: 'alta',
          negocioId: n.id
        });
        creadas++;
      }
    }

    // 3) Inactividad (>7 dias sin pedidos) (media)
    const ultimoPedido = await Pedido.findOne({
      where: { negocioId: n.id },
      order: [['createdAt', 'DESC']],
      attributes: ['createdAt']
    });
    if (ultimoPedido && new Date(ultimoPedido.createdAt) < hace7dias) {
      if (!(await existeAlertaHoy('inactividad', n.id))) {
        const dias = Math.floor((ahora - new Date(ultimoPedido.createdAt)) / (1000 * 60 * 60 * 24));
        await Alerta.create({
          tipo: 'inactividad',
          titulo: `${n.nombre}: sin pedidos hace ${dias} días`,
          descripcion: 'El negocio no registra pedidos hace más de una semana. Puede necesitar soporte o estar por abandonar.',
          severidad: 'media',
          negocioId: n.id
        });
        creadas++;
      }
    }
  }

  if (creadas > 0) console.log(`Alertas generadas: ${creadas}`);
  return creadas;
}

/** Corre al arranque y despues cada hora */
function iniciarAlertasAutomaticas() {
  const correr = () => generarAlertas().catch(e => console.error('Error generando alertas:', e.message));
  setTimeout(correr, 30 * 1000);            // 30s despues del arranque
  setInterval(correr, 60 * 60 * 1000);      // cada hora
  console.log('Alertas automáticas programadas (cada hora)');
}

module.exports = { generarAlertas, iniciarAlertasAutomaticas };
