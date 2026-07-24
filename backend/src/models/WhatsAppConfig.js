module.exports = (sequelize, DataTypes) => {
  const WhatsAppConfig = sequelize.define('WhatsAppConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    negocioId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },
    sessionData: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    status: {
      type: DataTypes.ENUM('disconnected', 'connecting', 'connected', 'error'),
      defaultValue: 'disconnected',
      allowNull: false
    },
    qrCode: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lastActivity: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    config: {
      type: DataTypes.JSONB,
      defaultValue: {
        templates: {
          delivery: {
            nuevo_a_preparacion: '¡Hola! Tu pedido fue realizado y se encuentra en preparación.\nTe avisaremos por este medio cuando esté en camino!\nLas promociones y descuentos son validas solo en Efectivo.',
            preparacion_a_listo: 'Tu pedido ya está listo para ser entregado.\nen minutos sale hacia tu domicilio por favor estar atentos.',
            listo_a_en_camino: 'Tu pedido va en camino! Por favor este atento que el repartidor esta llegando.',
            cualquier_a_cancelado: 'Tu pedido ha sido cancelado.'
          },
          takeaway: {
            nuevo_a_preparacion: '¡Hola! Tu pedido fue realizado y se encuentra en preparación.\nTe avisaremos por este medio cuando esté Listo!\nLas promociones y descuentos son validas solo en Efectivo.',
            preparacion_a_listo: 'Tu pedido ya está listo para retirar. Podes venir cuando quieras!',
            cualquier_a_cancelado: 'Tu pedido ha sido cancelado.'
          }
        },
        bot: {
          activo: false,
          saludoInicial: '¡Hola! 👋 Gracias por escribirnos.\n\nMirá nuestro menú y hacé tu pedido acá 👉 {{link_menu}}\n\n_{{nombre_negocio}}_',
          enEspera: 'En breve te va a responder alguien de nuestro equipo. ¡Gracias por tu paciencia! 🙌'
        }
      }
    }
  }, {
    tableName: 'whatsapp_configs',
    timestamps: true
  });

  return WhatsAppConfig;
};
