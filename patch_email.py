import re

with open('src/utils/email.ts', 'r') as f:
    content = f.read()

old_interface = """  order: {
    _id: { toString(): string } | string;
    orderNumber: string;
    items: Array<{ name: string; quantity: number; total: number; price: number }>;
    shippingAddress: {
      firstName: string;
      lastName: string;
      phone: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    paymentMethod: string;
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
    status: string;
    estimatedDelivery?: Date;
    createdAt?: Date;
  }"""

new_interface = """  order: {
    _id: { toString(): string } | string;
    orderNumber: string;
    items: Array<{ name: string; quantity: number; total: number; price: number }>;
    shippingAddress: {
      firstName: string;
      lastName: string;
      phone: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    paymentMethod: string;
    subtotal: number;
    productDiscount?: number;
    shippingCost: number;
    discount: number;
    manualDiscount?: number;
    tax?: number;
    total: number;
    status: string;
    estimatedDelivery?: Date;
    createdAt?: Date;
  }"""

content = content.replace(old_interface, new_interface)


old_html = """      <h3 style="margin-top:24px;">Order Summary</h3>
      ${orderItemsTable(order.items)}
      <p><strong>Subtotal:</strong> ${formatPkr(order.subtotal)}</p>
      <p><strong>Shipping:</strong> ${order.shippingCost === 0 ? 'FREE' : formatPkr(order.shippingCost)}</p>
      ${order.discount > 0 ? `<p><strong>Discount:</strong> -${formatPkr(order.discount)}</p>` : ''}
      <p style="font-size:18px;"><strong>Total:</strong> ${formatPkr(order.total)}</p>"""

new_html = """      <h3 style="margin-top:24px;">Order Summary</h3>
      ${orderItemsTable(order.items)}
      <p><strong>Subtotal:</strong> ${formatPkr(order.subtotal)}</p>
      ${(order.productDiscount && order.productDiscount > 0) ? `<p style="color:#22c55e;"><strong>Product Discount:</strong> -${formatPkr(order.productDiscount)}</p>` : ''}
      ${order.discount > 0 ? `<p style="color:#22c55e;"><strong>Coupon Discount:</strong> -${formatPkr(order.discount)}</p>` : ''}
      ${(order.manualDiscount && order.manualDiscount > 0) ? `<p style="color:#f97316;"><strong>Manual Discount:</strong> -${formatPkr(order.manualDiscount)}</p>` : ''}
      <p><strong>Shipping:</strong> ${order.shippingCost === 0 ? 'FREE' : '+' + formatPkr(order.shippingCost)}</p>
      ${(order.tax && order.tax > 0) ? `<p><strong>Tax:</strong> +${formatPkr(order.tax)}</p>` : ''}
      <p style="font-size:18px;"><strong>Total:</strong> ${formatPkr(order.total)}</p>"""

content = content.replace(old_html, new_html)

with open('src/utils/email.ts', 'w') as f:
    f.write(content)
