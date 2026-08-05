const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://ayezaadmin:jylthwnVMsyqZpnG@cluster0.ubf8mkk.mongodb.net/ayezacosmetics?appName=Cluster0');
  const Product = mongoose.connection.collection('products');
  const prod = await Product.findOne({ name: /Ayeza Beauty Cream/i });
  console.log('Product BasePrice:', prod.basePrice);
  console.log('Product Discount:', prod.discount);
  
  const Order = mongoose.connection.collection('orders');
  const order = await Order.findOne({ orderNumber: 'AYZ-1785961576416-0001' });
  console.log('Order Items:', order.items);
  console.log('Order productDiscount:', order.productDiscount);
  console.log('Order subtotal:', order.subtotal);
  
  process.exit(0);
}

check().catch(console.error);
