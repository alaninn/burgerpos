'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Crear tabla proveedores
      await queryInterface.createTable('proveedores', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        negocioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'negocios',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        nombre: {
          type: Sequelize.STRING,
          allowNull: false
        },
        contacto: {
          type: Sequelize.STRING,
          allowNull: true
        },
        telefono: {
          type: Sequelize.STRING,
          allowNull: true
        },
        email: {
          type: Sequelize.STRING,
          allowNull: true
        },
        direccion: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        notas: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        activo: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      // Índices para proveedores
      await queryInterface.addIndex('proveedores', ['negocioId'], { transaction });

      // 2. Crear tabla compras
      await queryInterface.createTable('compras', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        negocioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'negocios',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        proveedorId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'proveedores',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        numeroFactura: {
          type: Sequelize.STRING,
          allowNull: true
        },
        fecha: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        total: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        estado: {
          type: Sequelize.ENUM('borrador', 'confirmada', 'cancelada'),
          allowNull: false,
          defaultValue: 'confirmada'
        },
        pagado: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        fechaPago: {
          type: Sequelize.DATEONLY,
          allowNull: true
        },
        metodoPago: {
          type: Sequelize.ENUM('efectivo', 'transferencia', 'tarjeta'),
          allowNull: true
        },
        notas: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      // Índices para compras
      await queryInterface.addIndex('compras', ['negocioId'], { transaction });
      await queryInterface.addIndex('compras', ['proveedorId'], { transaction });
      await queryInterface.addIndex('compras', ['fecha'], { transaction });
      await queryInterface.addIndex('compras', ['estado'], { transaction });
      await queryInterface.addIndex('compras', ['pagado'], { transaction });

      // 3. Crear tabla compra_items
      await queryInterface.createTable('compra_items', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        compraId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'compras',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        productoId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'productos',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        descripcion: {
          type: Sequelize.STRING,
          allowNull: false
        },
        cantidadCompra: {
          type: Sequelize.DECIMAL(10, 3),
          allowNull: false
        },
        unidadCompra: {
          type: Sequelize.ENUM('caja', 'kg', 'gramos', 'unidad', 'litro', 'ml'),
          allowNull: false,
          defaultValue: 'unidad'
        },
        precioUnitario: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        subtotal: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        actualizaStock: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      // Índices para compra_items
      await queryInterface.addIndex('compra_items', ['compraId'], { transaction });
      await queryInterface.addIndex('compra_items', ['productoId'], { transaction });

      // 4. Crear tabla gastos
      await queryInterface.createTable('gastos', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        negocioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'negocios',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        proveedorId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'proveedores',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        compraId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'compras',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        fecha: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        descripcion: {
          type: Sequelize.STRING,
          allowNull: false
        },
        monto: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        categoria: {
          type: Sequelize.ENUM('proveedores', 'servicios', 'salarios', 'alquiler', 'servicios_publicos', 'otro'),
          allowNull: false,
          defaultValue: 'otro'
        },
        metodoPago: {
          type: Sequelize.ENUM('efectivo', 'transferencia', 'tarjeta'),
          allowNull: false,
          defaultValue: 'efectivo'
        },
        notas: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      // Índices para gastos
      await queryInterface.addIndex('gastos', ['negocioId'], { transaction });
      await queryInterface.addIndex('gastos', ['fecha'], { transaction });
      await queryInterface.addIndex('gastos', ['categoria'], { transaction });
      await queryInterface.addIndex('gastos', ['proveedorId'], { transaction });
      await queryInterface.addIndex('gastos', ['compraId'], { transaction });

      // 5. Agregar columnas a tabla productos para gestión de compras
      await queryInterface.addColumn('productos', 'unidadCompra', {
        type: Sequelize.STRING,
        defaultValue: 'unidad',
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('productos', 'unidadVenta', {
        type: Sequelize.STRING,
        defaultValue: 'unidad',
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('productos', 'factorConversion', {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 1,
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('productos', 'pesoUnitario', {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('productos', 'cantidadPorCaja', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('productos', 'ultimaCompraFecha', {
        type: Sequelize.DATEONLY,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('productos', 'ultimoCompraPrecio', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('productos', 'proveedorId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'proveedores',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, { transaction });

      await transaction.commit();
      console.log('✓ Migración del módulo de Gestión completada exitosamente');
    } catch (error) {
      await transaction.rollback();
      console.error('✗ Error en migración del módulo de Gestión:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Eliminar columnas agregadas a productos
      await queryInterface.removeColumn('productos', 'proveedorId', { transaction });
      await queryInterface.removeColumn('productos', 'ultimoCompraPrecio', { transaction });
      await queryInterface.removeColumn('productos', 'ultimaCompraFecha', { transaction });
      await queryInterface.removeColumn('productos', 'cantidadPorCaja', { transaction });
      await queryInterface.removeColumn('productos', 'pesoUnitario', { transaction });
      await queryInterface.removeColumn('productos', 'factorConversion', { transaction });
      await queryInterface.removeColumn('productos', 'unidadVenta', { transaction });
      await queryInterface.removeColumn('productos', 'unidadCompra', { transaction });

      // Eliminar tablas en orden inverso (por dependencias)
      await queryInterface.dropTable('gastos', { transaction });
      await queryInterface.dropTable('compra_items', { transaction });
      await queryInterface.dropTable('compras', { transaction });
      await queryInterface.dropTable('proveedores', { transaction });

      await transaction.commit();
      console.log('✓ Reversión de migración del módulo de Gestión completada');
    } catch (error) {
      await transaction.rollback();
      console.error('✗ Error al revertir migración del módulo de Gestión:', error);
      throw error;
    }
  }
};
