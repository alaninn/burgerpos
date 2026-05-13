const axios = require('axios');

const accessToken = 'APP_USR-260321286540560-042818-a090088f49c26b5fe6a5e5d8f4ce66f9-3362673939';

const preferenceData = {
  items: [
    {
      title: 'Hamburguesa Test',
      quantity: 1,
      unit_price: 3500,
      currency_id: 'ARS'
    }
  ],
  back_urls: {
    success: 'http://localhost:3000/menu/burger-demo/pago-exitoso',
    failure: 'http://localhost:3000/menu/burger-demo/pago-fallido',
    pending: 'http://localhost:3000/menu/burger-demo/pago-pendiente'
  },
  // auto_return: 'approved',  // Comentado para testing
  external_reference: 'test-123'
};

console.log('\n🔍 Probando API de MercadoPago directamente...\n');
console.log('Datos:', JSON.stringify(preferenceData, null, 2));

axios.post('https://api.mercadopago.com/checkout/preferences', preferenceData, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('\n✅ Preferencia creada exitosamente!\n');
  console.log('Preference ID:', response.data.id);
  console.log('Init Point:', response.data.init_point);
  console.log('\n🎉 CREDENCIALES Y API FUNCIONAN PERFECTAMENTE!\n');
  process.exit(0);
})
.catch(error => {
  console.log('\n❌ Error creando preferencia:\n');
  console.log('Status:', error.response?.status);
  console.log('Error:', error.response?.data);
  process.exit(1);
});
