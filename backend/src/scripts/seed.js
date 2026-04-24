require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Usuario, Negocio, Categoria, Producto, ProductoVariante, GrupoAdicional, Adicional } = require('../models');

async function seed() {
  try {
    await sequelize.sync({ force: true });
    console.log('✅ Tablas creadas');

    const hash = await bcrypt.hash('admin123', 10);

    // ── Superadmin ────────────────────────────────────────────
    await Usuario.create({
      nombre: 'Super Admin',
      email: 'admin@burgerpos.com',
      password: hash,
      rol: 'superadmin'
    });
    console.log('✅ Super admin: admin@burgerpos.com / admin123');

    // ── Negocio de prueba ─────────────────────────────────────
    const negocio = await Negocio.create({
      nombre: 'Burger Demo',
      slug: 'burger-demo',
      telefono: '+54 9 11 0000-0000',
      direccion: 'Av. Corrientes 1234, CABA',
      ciudad: 'Buenos Aires',
      plan: 'premium',
      activo: true,
      configuracion: {
        modalidades: { delivery: true, takeaway: true, salon: true },
        metodosPago: { efectivo: true, transferencia: true, tarjeta: false },
        horarios: [],
        montoMinimo: 0,
        costoEnvio: 500,
        aceptaPropinas: true,
        recibirPedidos: true,
        whatsapp: '+5491100000000',
        colorPrimario: '#7C3AED'
      }
    });

    // ── Admin del negocio ─────────────────────────────────────
    await Usuario.create({
      nombre: 'Admin Demo',
      email: 'demo@burgerpos.com',
      password: hash,
      rol: 'admin',
      negocioId: negocio.id
    });
    console.log('✅ Admin negocio: demo@burgerpos.com / admin123');

    // ── Operador del negocio ──────────────────────────────────
    await Usuario.create({
      nombre: 'Operador Demo',
      email: 'operador@burgerpos.com',
      password: hash,
      rol: 'operador',
      negocioId: negocio.id
    });
    console.log('✅ Operador: operador@burgerpos.com / admin123');

    // ── Categorías ────────────────────────────────────────────
    const [catBurgers, catPollo, catBebidas, catAcomps] = await Promise.all([
      Categoria.create({ negocioId: negocio.id, nombre: 'Hamburguesas', descripcion: 'Nuestras burgers artesanales', orden: 1, activo: true }),
      Categoria.create({ negocioId: negocio.id, nombre: 'Pollo', descripcion: 'Opciones de pollo', orden: 2, activo: true }),
      Categoria.create({ negocioId: negocio.id, nombre: 'Bebidas', descripcion: 'Bebidas frías y calientes', orden: 3, activo: true }),
      Categoria.create({ negocioId: negocio.id, nombre: 'Acompañamientos', descripcion: 'Para completar tu pedido', orden: 4, activo: true }),
    ]);
    console.log('✅ 4 categorías creadas');

    // ── Productos ─────────────────────────────────────────────
    await Promise.all([
      // Hamburguesas
      Producto.create({ negocioId: negocio.id, categoriaId: catBurgers.id, nombre: 'Clásica', descripcion: 'Carne, lechuga, tomate, cebolla, mostaza y ketchup', precioVenta: 3500, precioCosto: 1400, activo: true, orden: 1 }),
      Producto.create({ negocioId: negocio.id, categoriaId: catBurgers.id, nombre: 'Doble', descripcion: 'Doble carne, doble queso, bacon y BBQ', precioVenta: 5200, precioCosto: 2100, activo: true, orden: 2 }),
      Producto.create({ negocioId: negocio.id, categoriaId: catBurgers.id, nombre: 'Crispy', descripcion: 'Carne crocante, mayo sriracha, repollo y pepinos', precioVenta: 4800, precioCosto: 1900, activo: true, orden: 3 }),
      Producto.create({ negocioId: negocio.id, categoriaId: catBurgers.id, nombre: 'BBQ Bacon', descripcion: 'Bacon crocante, queso cheddar, cebolla caramelizada y BBQ', precioVenta: 5500, precioCosto: 2200, activo: true, orden: 4 }),
      Producto.create({ negocioId: negocio.id, categoriaId: catBurgers.id, nombre: 'Veggie', descripcion: 'Medallón de lentejas, palta, tomate y alioli', precioVenta: 4200, precioCosto: 1700, activo: true, orden: 5 }),

      // Pollo
      Producto.create({ negocioId: negocio.id, categoriaId: catPollo.id, nombre: 'Sándwich Pollo', descripcion: 'Pollo a la plancha, lechuga, tomate y mayo', precioVenta: 3800, precioCosto: 1500, activo: true, orden: 1 }),
      Producto.create({ negocioId: negocio.id, categoriaId: catPollo.id, nombre: 'Pollo Crispy', descripcion: 'Pollo rebozado, cole slaw y salsa picante', precioVenta: 4300, precioCosto: 1750, activo: true, orden: 2 }),

      // Bebidas
      Producto.create({ negocioId: negocio.id, categoriaId: catBebidas.id, nombre: 'Coca Cola', descripcion: 'Lata 354ml', precioVenta: 800, precioCosto: 400, activo: true, orden: 1 }),
      Producto.create({ negocioId: negocio.id, categoriaId: catBebidas.id, nombre: 'Agua mineral', descripcion: '500ml con o sin gas', precioVenta: 600, precioCosto: 250, activo: true, orden: 2 }),
      Producto.create({ negocioId: negocio.id, categoriaId: catBebidas.id, nombre: 'Jugo natural', descripcion: 'Naranja o pomelo exprimido', precioVenta: 1200, precioCosto: 500, activo: true, orden: 3 }),

      // Acompañamientos
      Producto.create({ negocioId: negocio.id, categoriaId: catAcomps.id, nombre: 'Papas fritas', descripcion: 'Porción generosa de papas fritas', precioVenta: 1500, precioCosto: 600, activo: true, orden: 1 }),
      Producto.create({ negocioId: negocio.id, categoriaId: catAcomps.id, nombre: 'Papas con cheddar', descripcion: 'Papas fritas bañadas en salsa cheddar', precioVenta: 1900, precioCosto: 800, activo: true, orden: 2 }),
      Producto.create({ negocioId: negocio.id, categoriaId: catAcomps.id, nombre: 'Ensalada mixta', descripcion: 'Lechuga, tomate, zanahoria y aderezo', precioVenta: 1200, precioCosto: 500, activo: true, orden: 3 }),
    ]);
    console.log('✅ 13 productos creados');

    // ── Variantes de ejemplo ──────────────────────────────────
    const clasica = await Producto.findOne({ where: { negocioId: negocio.id, nombre: 'Clásica' } });
    const doble   = await Producto.findOne({ where: { negocioId: negocio.id, nombre: 'Doble' } });
    await ProductoVariante.bulkCreate([
      { productoId: clasica.id, negocioId: negocio.id, nombre: 'Simple',  precioVenta: 3500, precioCosto: 1400, visible: true, activo: true, orden: 0 },
      { productoId: clasica.id, negocioId: negocio.id, nombre: 'Doble',   precioVenta: 4800, precioCosto: 1900, visible: true, activo: true, orden: 1 },
      { productoId: clasica.id, negocioId: negocio.id, nombre: 'Triple',  precioVenta: 6000, precioCosto: 2400, visible: true, activo: true, orden: 2 },
      { productoId: doble.id,   negocioId: negocio.id, nombre: 'Normal',  precioVenta: 5200, precioCosto: 2100, visible: true, activo: true, orden: 0 },
      { productoId: doble.id,   negocioId: negocio.id, nombre: 'XL',      precioVenta: 6500, precioCosto: 2600, visible: true, activo: true, orden: 1 },
    ]);
    console.log('✅ Variantes de ejemplo creadas');

    // ── Grupos de adicionales ─────────────────────────────────
    const grupoSalsas = await GrupoAdicional.create({
      negocioId: negocio.id, titulo: 'Salsas', obligatorio: false,
      minSeleccion: 0, maxSeleccion: 3, activo: true, orden: 0
    });
    await Adicional.bulkCreate([
      { grupoAdicionalId: grupoSalsas.id, negocioId: negocio.id, nombre: 'Ketchup',    precioVenta: 0,   precioCosto: 0,   visible: true, activo: true, orden: 0 },
      { grupoAdicionalId: grupoSalsas.id, negocioId: negocio.id, nombre: 'Mostaza',    precioVenta: 0,   precioCosto: 0,   visible: true, activo: true, orden: 1 },
      { grupoAdicionalId: grupoSalsas.id, negocioId: negocio.id, nombre: 'BBQ',        precioVenta: 0,   precioCosto: 0,   visible: true, activo: true, orden: 2 },
      { grupoAdicionalId: grupoSalsas.id, negocioId: negocio.id, nombre: 'Sriracha',   precioVenta: 200, precioCosto: 80,  visible: true, activo: true, orden: 3 },
      { grupoAdicionalId: grupoSalsas.id, negocioId: negocio.id, nombre: 'Alioli',     precioVenta: 200, precioCosto: 80,  visible: true, activo: true, orden: 4 },
    ]);

    const grupoExtras = await GrupoAdicional.create({
      negocioId: negocio.id, titulo: 'Ingredientes extras', obligatorio: false,
      minSeleccion: 0, maxSeleccion: 4, activo: true, orden: 1
    });
    await Adicional.bulkCreate([
      { grupoAdicionalId: grupoExtras.id, negocioId: negocio.id, nombre: 'Queso cheddar extra', precioVenta: 400, precioCosto: 150, visible: true, activo: true, orden: 0 },
      { grupoAdicionalId: grupoExtras.id, negocioId: negocio.id, nombre: 'Bacon extra',          precioVenta: 600, precioCosto: 250, visible: true, activo: true, orden: 1 },
      { grupoAdicionalId: grupoExtras.id, negocioId: negocio.id, nombre: 'Huevo frito',          precioVenta: 300, precioCosto: 100, visible: true, activo: true, orden: 2 },
      { grupoAdicionalId: grupoExtras.id, negocioId: negocio.id, nombre: 'Palta',                precioVenta: 500, precioCosto: 200, visible: true, activo: true, orden: 3 },
    ]);
    console.log('✅ Grupos de adicionales de ejemplo creados');

    console.log('');
    console.log('🚀 Seed completado!');
    console.log('');
    console.log('─────────────────────────────────────────');
    console.log('   Superadmin : admin@burgerpos.com / admin123');
    console.log('   Admin demo : demo@burgerpos.com / admin123');
    console.log('   Operador   : operador@burgerpos.com / admin123');
    console.log('   Menú QR    : /menu/burger-demo');
    console.log('─────────────────────────────────────────');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  }
}

seed();
