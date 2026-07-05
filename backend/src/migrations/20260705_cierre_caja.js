'use strict';

// Sistema de cierre de caja al estilo gestionQ24: al cerrar, el operador
// declara cuánto efectivo retira y cuánto queda para el próximo turno. La
// diferencia se calcula contra el efectivo esperado (saldo inicial + ventas
// en efectivo - gastos de la caja). Migracion idempotente.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const cajas = await queryInterface.describeTable('cajas');
    if (!cajas.efectivoRetirado) {
      await queryInterface.addColumn('cajas', 'efectivoRetirado', {
        type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0
      });
    }
    if (!cajas.dineroSiguiente) {
      await queryInterface.addColumn('cajas', 'dineroSiguiente', {
        type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0
      });
    }
  },
  down: async (queryInterface) => {
    try { await queryInterface.removeColumn('cajas', 'efectivoRetirado'); } catch (e) {}
    try { await queryInterface.removeColumn('cajas', 'dineroSiguiente'); } catch (e) {}
  }
};
