import re

with open('src/routes/order.routes.ts', 'r') as f:
    content = f.read()

# Import mongoose
content = content.replace("import { Types } from 'mongoose';", "import mongoose, { Types } from 'mongoose';")

# Add applyProductDiscount
discount_logic = """
const applyProductDiscount = (product: any, basePrice: number): number => {
  const discount = product.discount;
  if (!discount || discount.type == null || discount.value == null) return basePrice;

  const now = new Date();
  const { startDate, endDate, type, value } = discount;
  const active = (!startDate || startDate <= now) && (!endDate || endDate >= now);
  if (!active) return basePrice;
  if (!Number.isFinite(basePrice) || !Number.isFinite(Number(value))) return basePrice;

  if (type === 'percentage') return basePrice * (1 - Number(value) / 100);
  if (type === 'fixed') return Math.max(0, basePrice - Number(value));
  return basePrice;
};
"""
content = content.replace("const router = express.Router();", "const router = express.Router();\n" + discount_logic)

# Replace the checkout logic block
old_checkout_logic = """  let finalItems: any[] = [];
  let subtotal = 0;
  let cart: any = null;

  if (itemsFromBody && itemsFromBody.length > 0) {
    // Buy Now or Guest Checkout with direct items
    for (const item of itemsFromBody) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) throw new NotFoundError(`Product ${item.productId} not found`);
      if (product.isComingSoon) throw new BadRequestError(`Product ${product.name} is coming soon and cannot be ordered.`);

      const variant = item.variant
        ? product.variants.find((v: any) => v.sku === item.variant || v.value === item.variant)
        : product.variants.find((v: any) => v.sku === product.sku) ?? null;

      const price = variant ? variant.price : product.basePrice;
      const total = price * item.quantity;
      subtotal += total;

      finalItems.push({
        product: product._id,
        variant: item.variant,
        name: product.name,
        image: variant && variant.images && variant.images.length > 0 ? variant.images[0].url : (product.images[0]?.url || ''),
        price,
        quantity: item.quantity,
        total,
        sku: variant ? variant.sku : product.sku,
      });
    }
  } else {
    // Normal Cart Checkout (must be logged in)
    if (!userId) throw new BadRequestError('Must provide items for guest checkout');
    cart = await Cart.findOne({ user: userId });
    if (!cart || (cart.items ?? []).length === 0) throw new BadRequestError('Cart is empty');
    finalItems = cart.items ?? [];
    subtotal = cart.subtotal ?? 0;
  }

  if (finalItems.length === 0) throw new BadRequestError('No items to checkout');

  // Verify Cart Items (Buy Now items were already verified in the first loop)
  if (!itemsFromBody || itemsFromBody.length === 0) {
    for (const item of finalItems) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) throw new NotFoundError(`Product not found`);
      if (product.isComingSoon) throw new BadRequestError(`Product ${product.name} is coming soon and cannot be ordered.`);
    }
  }"""

new_checkout_logic = """  let finalItems: any[] = [];
  let subtotal = 0;
  let productDiscountTotal = 0;
  let cart: any = null;

  if (itemsFromBody && itemsFromBody.length > 0) {
    // Buy Now or Guest Checkout with direct items
    for (const item of itemsFromBody) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) throw new NotFoundError(`Product ${item.productId} not found`);
      if (product.isComingSoon) throw new BadRequestError(`Product ${product.name} is coming soon and cannot be ordered.`);

      const variant = item.variant
        ? product.variants.find((v: any) => v.sku === item.variant || v.value === item.variant)
        : product.variants.find((v: any) => v.sku === product.sku) ?? null;

      const originalPrice = variant ? variant.price : product.basePrice;
      const salePrice = applyProductDiscount(product, originalPrice);
      const productDiscount = Math.max(0, originalPrice - salePrice);
      const lineTotal = salePrice * item.quantity;
      subtotal += lineTotal;
      productDiscountTotal += (productDiscount * item.quantity);

      finalItems.push({
        product: product._id,
        variant: item.variant,
        name: product.name,
        image: variant && variant.images && variant.images.length > 0 ? variant.images[0].url : (product.images[0]?.url || ''),
        price: salePrice,
        originalPrice,
        salePrice,
        productDiscount,
        quantity: item.quantity,
        total: lineTotal,
        lineTotal,
        sku: variant ? variant.sku : product.sku,
      });
    }
  } else {
    // Normal Cart Checkout (must be logged in)
    if (!userId) throw new BadRequestError('Must provide items for guest checkout');
    cart = await Cart.findOne({ user: userId });
    if (!cart || (cart.items ?? []).length === 0) throw new BadRequestError('Cart is empty');
    
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) throw new NotFoundError(`Product not found`);
      if (product.isComingSoon) throw new BadRequestError(`Product ${product.name} is coming soon and cannot be ordered.`);
      
      const variant = item.variant
        ? product.variants.find((v: any) => v.sku === item.variant || v.value === item.variant)
        : product.variants.find((v: any) => v.sku === product.sku) ?? null;

      const originalPrice = variant ? variant.price : product.basePrice;
      const salePrice = applyProductDiscount(product, originalPrice);
      const productDiscount = Math.max(0, originalPrice - salePrice);
      const lineTotal = salePrice * item.quantity;
      subtotal += lineTotal;
      productDiscountTotal += (productDiscount * item.quantity);

      finalItems.push({
        product: product._id,
        variant: item.variant,
        name: product.name,
        image: item.image || (variant && variant.images && variant.images.length > 0 ? variant.images[0].url : (product.images[0]?.url || '')),
        price: salePrice,
        originalPrice,
        salePrice,
        productDiscount,
        quantity: item.quantity,
        total: lineTotal,
        lineTotal,
        sku: item.sku || (variant ? variant.sku : product.sku),
      });
    }
  }

  if (finalItems.length === 0) throw new BadRequestError('No items to checkout');"""

if old_checkout_logic in content:
    content = content.replace(old_checkout_logic, new_checkout_logic)
else:
    print("Could not find checkout logic")

# Replace Order.create mapping
old_create_items = """    items: finalItems.map((i: any) => ({
      product: new Types.ObjectId(i.product),
      variant: i.variant,
      name: i.name,
      image: i.image,
      price: i.price,
      quantity: i.quantity,
      total: i.total,
      sku: i.sku,
    })),"""

new_create_items = """    items: finalItems.map((i: any) => ({
      product: new Types.ObjectId(i.product),
      variant: i.variant,
      name: i.name,
      image: i.image,
      price: i.price,
      originalPrice: i.originalPrice,
      salePrice: i.salePrice,
      productDiscount: i.productDiscount,
      quantity: i.quantity,
      total: i.total,
      lineTotal: i.lineTotal,
      sku: i.sku,
    })),"""
content = content.replace(old_create_items, new_create_items)

# Add extra fields to Order.create
old_create_fields = """    subtotal,
    shippingCost,
    discount: couponDiscount,
    tax,
    total,"""
new_create_fields = """    subtotal,
    shippingCost,
    productDiscount: productDiscountTotal,
    discount: couponDiscount,
    manualDiscount: 0,
    tax,
    total,"""
content = content.replace(old_create_fields, new_create_fields)

# Insert the Admin Edit Endpoint
admin_edit_code = """
const adminEditSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  shippingAddress: shippingAddressSchema.optional(),
  items: z.array(z.object({
    product: z.string(),
    variant: z.string().optional(),
    quantity: z.number().min(1),
  })).optional(),
  shippingCost: z.number().min(0).optional(),
  manualDiscount: z.number().min(0).optional(),
  manualDiscountReason: z.string().optional(),
});

router.patch(
  '/:orderId/admin-edit',
  adminOnly,
  validate(adminEditSchema),
  async (req: Request, res: Response) => {
    const orderId = req.params.orderId;
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      shippingCost,
      manualDiscount,
      manualDiscountReason,
    } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new NotFoundError('Order');

      const oldValues = order.toObject();

      let hasChanges = false;
      const changes: any = {};

      if (customerName !== undefined && customerName !== order.customerName) { order.customerName = customerName; changes.customerName = customerName; hasChanges = true; }
      if (customerEmail !== undefined && customerEmail !== order.customerEmail) { order.customerEmail = customerEmail; changes.customerEmail = customerEmail; hasChanges = true; }
      if (customerPhone !== undefined && customerPhone !== order.customerPhone) { order.customerPhone = customerPhone; changes.customerPhone = customerPhone; hasChanges = true; }
      
      if (shippingAddress) {
        order.shippingAddress = { ...order.shippingAddress, ...shippingAddress };
        changes.shippingAddress = shippingAddress;
        hasChanges = true;
      }

      if (items) {
        // Need to sync stock for removed/added items
        const oldItems = order.items;
        
        // Return stock for all old items
        for (const oldItem of oldItems) {
          const product = await Product.findById(oldItem.product).session(session);
          if (product) {
            if (oldItem.variant) {
              const variant = product.variants.find((v: any) => v.sku === oldItem.variant || v.value === oldItem.variant || v.sku === oldItem.sku);
              if (variant) variant.stock = (variant.stock ?? 0) + oldItem.quantity;
            }
            product.stock = (product.stock ?? 0) + oldItem.quantity;
            product.soldCount = Math.max(0, (product.soldCount ?? 0) - oldItem.quantity);
            await product.save({ session });
          }
        }

        // Build new items and deduct stock
        let newSubtotal = 0;
        let newProductDiscountTotal = 0;
        const newOrderItems = [];

        for (const inputItem of items) {
          const product = await Product.findById(inputItem.product).session(session);
          if (!product || !product.isActive) throw new BadRequestError(`Product ${inputItem.product} is invalid`);

          const variant = inputItem.variant
            ? product.variants.find((v: any) => v.sku === inputItem.variant || v.value === inputItem.variant)
            : product.variants.find((v: any) => v.sku === product.sku) ?? null;

          const originalPrice = variant ? variant.price : product.basePrice;
          const salePrice = applyProductDiscount(product, originalPrice);
          const productDiscount = Math.max(0, originalPrice - salePrice);
          const lineTotal = salePrice * inputItem.quantity;

          newSubtotal += lineTotal;
          newProductDiscountTotal += (productDiscount * inputItem.quantity);

          newOrderItems.push({
            product: product._id,
            variant: inputItem.variant,
            name: product.name,
            image: variant && variant.images && variant.images.length > 0 ? variant.images[0].url : (product.images[0]?.url || ''),
            price: salePrice,
            originalPrice,
            salePrice,
            productDiscount,
            quantity: inputItem.quantity,
            total: lineTotal,
            lineTotal,
            sku: variant ? variant.sku : product.sku,
          });

          // Deduct stock
          if (variant) {
            if (variant.stock < inputItem.quantity) throw new BadRequestError(`Insufficient stock for ${product.name}`);
            variant.stock -= inputItem.quantity;
          }
          if (product.stock < inputItem.quantity) {
             const sumVariantStock = (product.variants ?? []).reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0);
             if (sumVariantStock < inputItem.quantity) throw new BadRequestError(`Insufficient stock for ${product.name}`);
             product.stock = Math.max(0, sumVariantStock);
          } else {
             product.stock -= inputItem.quantity;
          }
          product.soldCount = (product.soldCount ?? 0) + inputItem.quantity;
          await product.save({ session });
        }

        order.items = newOrderItems as any;
        order.subtotal = newSubtotal;
        order.productDiscount = newProductDiscountTotal;
        changes.items = newOrderItems;
        hasChanges = true;
      }

      if (shippingCost !== undefined && shippingCost !== order.shippingCost) {
        order.shippingCost = shippingCost;
        changes.shippingCost = shippingCost;
        hasChanges = true;
      }

      if (manualDiscount !== undefined && manualDiscount !== order.manualDiscount) {
        order.manualDiscount = manualDiscount;
        changes.manualDiscount = manualDiscount;
        hasChanges = true;
      }
      
      if (manualDiscountReason !== undefined && manualDiscountReason !== order.manualDiscountReason) {
        order.manualDiscountReason = manualDiscountReason;
      }

      // Final recalculation
      const safeSubtotal = order.subtotal || 0;
      const safeCoupon = order.couponDiscount || 0;
      const safeManual = order.manualDiscount || 0;
      const safeShipping = order.shippingCost || 0;
      const safeTax = order.tax || 0;

      if (safeManual > safeSubtotal) throw new BadRequestError('Manual discount cannot exceed subtotal');

      const grandTotal = Math.max(0, safeSubtotal - safeCoupon - safeManual + safeShipping + safeTax);
      order.total = grandTotal;

      if (hasChanges) {
        order.auditLog = [
          ...(order.auditLog ?? []),
          {
            timestamp: new Date(),
            adminUser: req.user!._id,
            adminName: `${req.user!.firstName} ${req.user!.lastName}`,
            actionPerformed: 'Order Edited',
            oldValues,
            newValues: order.toObject(),
          }
        ] as any;
      }

      await order.save({ session });
      await session.commitTransaction();
      session.endSession();

      // Async email out of transaction
      if (hasChanges) {
        const customerEmailAddress = order.customerEmail || (order.user ? (await User.findById(order.user))?.email : null);
        if (customerEmailAddress) {
          try {
             // We can use the existing order status email or create a new sendOrderUpdateEmail.
             // Using sendOrderConfirmationEmail as a fallback to send the updated receipt.
             await sendOrderConfirmationEmail(customerEmailAddress, order.customerName ? order.customerName.split(' ')[0] : 'Customer', order);
          } catch (e) {
             console.error('Failed to send update email', e);
          }
        }
      }

      return res.json({ success: true, message: 'Order updated successfully', data: order });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
);
"""

content = content.replace("router.patch(\n  '/:orderId/status',", admin_edit_code + "\nrouter.patch(\n  '/:orderId/status',")

with open('src/routes/order.routes.ts', 'w') as f:
    f.write(content)
