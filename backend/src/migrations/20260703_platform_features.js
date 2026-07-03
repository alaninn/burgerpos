'use strict';

// Tablas de plataforma portadas de gestionQ24: planes editables, historial
// de cobros, alertas automaticas y tickets de soporte.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1) Planes editables desde el panel de superadmin
    await queryInterface.createTable('planes_config', {
      plan:      { type: Sequelize.STRING(30), primaryKey: true },
      nombre:    { type: Sequelize.STRING(50), allowNull: false },
      precio:    { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      limites:   { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      accesos:   { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      modulos:   { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    // Seed con los valores actuales de config/planes.js
    const MODULOS_PREMIUM = ['menu', 'panelPedidos', 'cajas', 'pedidos', 'repartidores', 'reportes', 'gestion', 'clientes', 'descuentos', 'monitorCocina', 'facturacion'];
    const MODULOS_ESTANDAR = ['menu', 'panelPedidos', 'cajas', 'pedidos', 'repartidores', 'reportes', 'clientes'];
    await queryInterface.bulkInsert('planes_config', [
      {
        plan: 'estandar', nombre: 'Estándar', precio: 15000,
        limites: JSON.stringify({ productos: 30, categorias: 8, operadores: 2, repartidores: 3 }),
        accesos: JSON.stringify({ monitorCocina: false, fiscal: false, reportesAvanzados: false, descuentos: false, stock: false }),
        modulos: JSON.stringify(MODULOS_ESTANDAR),
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        plan: 'premium', nombre: 'Premium', precio: 35000,
        limites: JSON.stringify({ productos: -1, categorias: -1, operadores: -1, repartidores: -1 }),
        accesos: JSON.stringify({ monitorCocina: true, fiscal: true, reportesAvanzados: true, descuentos: true, stock: true }),
        modulos: JSON.stringify(MODULOS_PREMIUM),
        createdAt: new Date(), updatedAt: new Date()
      }
    ]);

    // 2) Historial de pagos/renovaciones de los negocios a la plataforma
    await queryInterface.createTable('pagos_historial', {
      id:            { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      negocioId:     { type: Sequelize.UUID, allowNull: false },
      dias:          { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      monto:         { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      metodoPago:    { type: Sequelize.STRING(50), allowNull: true },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      tipo:          { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'renovacion' },
      createdAt:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('pagos_historial', ['negocioId']);
    await queryInterface.addIndex('pagos_historial', ['createdAt']);

    // 3) Alertas automaticas (vencimientos, inactividad)
    await queryInterface.createTable('alertas', {
      id:          { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      tipo:        { type: Sequelize.STRING(50), allowNull: false },
      titulo:      { type: Sequelize.STRING(200), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      severidad:   { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'media' },
      negocioId:   { type: Sequelize.UUID, allowNull: true },
      resuelta:    { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('alertas', ['resuelta', 'createdAt']);

    // 4) Tickets de soporte
    await queryInterface.createTable('tickets_soporte', {
      id:              { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      negocioId:       { type: Sequelize.UUID, allowNull: false },
      usuarioId:       { type: Sequelize.UUID, allowNull: true },
      asunto:          { type: Sequelize.STRING(200), allowNull: false },
      mensaje:         { type: Sequelize.TEXT, allowNull: false },
      estado:          { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'abierto' },
      respuesta:       { type: Sequelize.TEXT, allowNull: true },
      fechaResolucion: { type: Sequelize.DATE, allowNull: true },
      createdAt:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('tickets_soporte', ['negocioId']);
    await queryInterface.addIndex('tickets_soporte', ['estado']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tickets_soporte');
    await queryInterface.dropTable('alertas');
    await queryInterface.dropTable('pagos_historial');
    await queryInterface.dropTable('planes_config');
  }
};
