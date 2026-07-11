'use strict';

// El modal de compra avanzada ofrece "mercadopago" como metodo de pago, pero
// el enum de compras.metodoPago no lo tenia (a diferencia de gastos.metodoPago
// que si) - marcar una compra pagada por MercadoPago fallaba al guardar.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_compras_metodoPago" ADD VALUE IF NOT EXISTS 'mercadopago'`
    );
  },

  async down() {
    // Postgres no permite quitar un valor de un enum sin recrear el tipo;
    // no se revierte (no rompe nada dejar el valor disponible).
  }
};
