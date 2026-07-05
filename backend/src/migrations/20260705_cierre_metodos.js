'use strict';

// Cierre de caja estilo gestionQ24: al cerrar se declaran los totales por
// metodo virtual (tarjeta, mercado pago, transferencia) para cuadrarlos contra
// lo que registro el sistema. Se guarda tambien el total de mercado pago del
// sistema. Migracion idempotente.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const cajas = await queryInterface.describeTable('cajas');
    const col = (nombre) => ({ type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    if (!cajas.totalMercadopago)        await queryInterface.addColumn('cajas', 'totalMercadopago', col());
    if (!cajas.tarjetaDeclarada)        await queryInterface.addColumn('cajas', 'tarjetaDeclarada', col());
    if (!cajas.mercadopagoDeclarada)    await queryInterface.addColumn('cajas', 'mercadopagoDeclarada', col());
    if (!cajas.transferenciaDeclarada)  await queryInterface.addColumn('cajas', 'transferenciaDeclarada', col());
  },
  down: async (queryInterface) => {
    for (const c of ['totalMercadopago', 'tarjetaDeclarada', 'mercadopagoDeclarada', 'transferenciaDeclarada']) {
      try { await queryInterface.removeColumn('cajas', c); } catch (e) {}
    }
  }
};
