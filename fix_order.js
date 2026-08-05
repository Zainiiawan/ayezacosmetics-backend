const mongoose = require('mongoose');

async function fixOrder() {
  await mongoose.connect('mongodb+srv://ayezaadmin:jylthwnVMsyqZpnG@cluster0.ubf8mkk.mongodb.net/ayezacosmetics?appName=Cluster0');
  const Order = mongoose.connection.collection('orders');
  
  const orderNumber = 'AYZ-1785961576416-0001';
  
  // Update the specific order
  await Order.updateOne(
    { orderNumber },
    {
      $set: {
        'items.0.price': 600,
        'items.0.salePrice': 600,
        'items.0.originalPrice': 800,
        'items.0.productDiscount': 200,
        'items.0.total': 600,
        'items.0.lineTotal': 600,
        subtotal: 600,
        productDiscount: 200,
        total: 800
      }
    }
  );
  
  console.log('Order fixed successfully');
  process.exit(0);
}

fixOrder().catch(console.error);
