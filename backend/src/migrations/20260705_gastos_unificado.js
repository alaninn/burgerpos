'use strict';

// Unifica el modulo de gastos al estilo gestionQ24: el gasto pasa a tener tipo
// (gasto comun / pago a proveedor / compra), origen del dinero (caja/local/otro),
// datos fiscales (Factura A e IVA credito) y vinculo con la caja. Los proveedores
// pasan a llevar cuenta corriente (saldo que nos deben / que les debemos).
// Migracion idempotente: se puede reaplicar sin romper.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const gastos = await queryInterface.describeTable('gastos');

    const addGasto = async (nombre, def) => {
      if (!gastos[nombre]) await queryInterface.addColumn('gastos', nombre, def);
    };

    // Tipo de movimiento: 'variable' (gasto comun) | 'pago_proveedor' | 'compra'
    await addGasto('tipo', { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'variable' });
    // De donde sale la plata: 'caja' (afecta el cierre del turno) | 'local' | 'otro'
    await addGasto('origenDinero', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'local' });
    // Caja/turno del que se descuenta (solo cuando origenDinero = 'caja')
    await addGasto('cajaId', { type: Sequelize.UUID, allowNull: true });
    // Dato fiscal: null = Gasto X (sin comprobante) · 'factura_a' = en blanco (IVA credito)
    await addGasto('tipoComprobante', { type: Sequelize.STRING(20), allowNull: true });
    // Tipo de pago a proveedor: 'a_cuenta' | 'pago_deuda' | 'cobro_deuda'
    await addGasto('tipoPagoProveedor', { type: Sequelize.STRING(20), allowNull: true });
    // Comprobante adjunto (data URL)
    await addGasto('reciboUrl', { type: Sequelize.TEXT, allowNull: true });
    // Numero de boleta/factura del comprobante
    await addGasto('numeroBoleta', { type: Sequelize.STRING, allowNull: true });
    // Fiscal: si el monto ya incluye IVA y cuanto IVA contiene
    await addGasto('ivaIncluido', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await addGasto('porcentajeIva', { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 });
    await addGasto('montoIva', { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    // Total de la factura recibida (cuando se paga parcial y queda deuda)
    await addGasto('totalFactura', { type: Sequelize.DECIMAL(10, 2), allowNull: true });

    // Proveedores: cuenta corriente
    const proveedores = await queryInterface.describeTable('proveedores');
    if (!proveedores.saldoDeuda) {
      // Lo que el proveedor NOS debe (saldo a nuestro favor)
      await queryInterface.addColumn('proveedores', 'saldoDeuda', {
        type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0
      });
    }
    if (!proveedores.saldoAFavor) {
      // Lo que NOSOTROS le debemos al proveedor
      await queryInterface.addColumn('proveedores', 'saldoAFavor', {
        type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0
      });
    }

    // Agregar 'mercadopago' al metodo de pago de gastos y compras.
    // ALTER TYPE ... ADD VALUE no puede correr dentro de una transaccion.
    const agregarValorEnum = async (tipoEnum, valor) => {
      try {
        await queryInterface.sequelize.query(
          `ALTER TYPE "${tipoEnum}" ADD VALUE IF NOT EXISTS '${valor}';`
        );
      } catch (e) {
        // Si el tipo no existe (base recreada), no bloquea la venta.
        console.warn(`No se pudo alterar ${tipoEnum}: ${e.message}`);
      }
    };
    await agregarValorEnum('enum_gastos_metodoPago', 'mercadopago');
    await agregarValorEnum('enum_compras_metodoPago', 'mercadopago');
  },

  down: async (queryInterface) => {
    const cols = ['tipo', 'origenDinero', 'cajaId', 'tipoComprobante', 'tipoPagoProveedor',
      'reciboUrl', 'numeroBoleta', 'ivaIncluido', 'porcentajeIva', 'montoIva', 'totalFactura'];
    for (const c of cols) {
      try { await queryInterface.removeColumn('gastos', c); } catch (e) { /* noop */ }
    }
    try { await queryInterface.removeColumn('proveedores', 'saldoDeuda'); } catch (e) { /* noop */ }
    try { await queryInterface.removeColumn('proveedores', 'saldoAFavor'); } catch (e) { /* noop */ }
    // Los valores agregados a un ENUM no se pueden quitar facilmente; se dejan.
  }
};
