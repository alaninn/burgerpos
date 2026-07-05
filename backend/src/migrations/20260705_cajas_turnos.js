'use strict';

// Porta el sistema de cajas/turnos de gestionQ24: cajas fijas con nombre,
// varias cajas abiertas a la vez, operadores que se unen/salen de un turno,
// y vinculo de cada pedido con la caja en la que se cargo (para atribuir las
// ventas por caja). Migracion idempotente.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1) Cajas fijas del local (Mañana, Tarde, etc.)
    await queryInterface.createTable('cajas_definidas', {
      id:        { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      negocioId: { type: Sequelize.UUID, allowNull: false },
      nombre:    { type: Sequelize.STRING, allowNull: false },
      orden:     { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      activa:    { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    }).catch(() => {});
    await queryInterface.addIndex('cajas_definidas', ['negocioId']).catch(() => {});

    // 2) Operadores dentro de una caja abierta (turno_usuarios)
    await queryInterface.createTable('caja_usuarios', {
      id:        { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      cajaId:    { type: Sequelize.UUID, allowNull: false },
      usuarioId: { type: Sequelize.UUID, allowNull: false },
      negocioId: { type: Sequelize.UUID, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    }).catch(() => {});
    await queryInterface.addIndex('caja_usuarios', ['cajaId']).catch(() => {});
    await queryInterface.addIndex('caja_usuarios', ['usuarioId']).catch(() => {});

    // 3) Nuevas columnas de la caja/turno
    const cajas = await queryInterface.describeTable('cajas');
    if (!cajas.nombre) await queryInterface.addColumn('cajas', 'nombre', { type: Sequelize.STRING, allowNull: true });
    if (!cajas.cajaDefinidaId) await queryInterface.addColumn('cajas', 'cajaDefinidaId', { type: Sequelize.UUID, allowNull: true });
    if (!cajas.usuarioCierreId) await queryInterface.addColumn('cajas', 'usuarioCierreId', { type: Sequelize.UUID, allowNull: true });

    // 4) Cada pedido guarda en qué caja se cargó
    const pedidos = await queryInterface.describeTable('pedidos');
    if (!pedidos.cajaId) await queryInterface.addColumn('pedidos', 'cajaId', { type: Sequelize.UUID, allowNull: true });
  },

  down: async (queryInterface) => {
    try { await queryInterface.removeColumn('pedidos', 'cajaId'); } catch (e) {}
    for (const c of ['nombre', 'cajaDefinidaId', 'usuarioCierreId']) {
      try { await queryInterface.removeColumn('cajas', c); } catch (e) {}
    }
    try { await queryInterface.dropTable('caja_usuarios'); } catch (e) {}
    try { await queryInterface.dropTable('cajas_definidas'); } catch (e) {}
  }
};
