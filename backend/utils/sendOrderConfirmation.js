import sendEmail from './sendEmail.js';

export const sendOrderConfirmation = async (order, user, options = {}) => {
  try {
    console.log('sendOrderConfirmation called with order:', order.orderNumber);

    const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const isGuest = Boolean(options.isGuest || order.isGuest || !order.user);
    const guestToken = options.guestAccessToken;
    const trackLink = isGuest
      ? `${frontendBase}/track-order?order=${encodeURIComponent(order.orderNumber || '')}${guestToken ? `&token=${encodeURIComponent(guestToken)}` : ''}`
      : `${frontendBase}/profile`;

    const itemsList = (order.orderItems || order.items || [])
      .map((item) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px; color: #333;">
            <strong>${item.name || 'Product'}</strong>
            ${item.variant ? `<br/><span style="color: #666; font-size: 12px;">Variant: ${item.variant}</span>` : ''}
          </td>
          <td style="padding: 12px 8px; text-align: center; color: #333;">${item.quantity || 1}</td>
          <td style="padding: 12px 8px; text-align: right; color: #333;">PKR ${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
        </tr>
      `)
      .join('');

    const paymentMethodNames = {
      COD: 'Cash on Delivery',
      BANK_TRANSFER: 'Bank Transfer',
      JAZZCASH: 'JazzCash',
      EASYPAISA: 'EasyPaisa',
      NAYAPAY: 'NayaPay',
      STRIPE: 'Stripe'
    };

    const paymentDisplay = paymentMethodNames[order.paymentMethod] || order.paymentMethod || 'Not specified';
    const statusColors = { PENDING: '#f59e0b', PROCESSING: '#3b82f6', SHIPPED: '#8b5cf6', DELIVERED: '#10b981', CANCELLED: '#ef4444' };
    const statusColor = statusColors[order.orderStatus] || '#6b7280';

    const itemsPrice = order.itemsPrice || order.subtotal || 0;
    const shippingPrice = order.shippingPrice || order.shipping || 0;
    const totalPrice = order.totalPrice || order.total || 0;

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #d4af37 0%, #f4e5c2 100%); padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; color: #0a0a0a; font-size: 36px; font-family: Georgia, serif;">Veil & Vogue</h1>
          <p style="color: #0a0a0a; margin: 10px 0 0 0; font-size: 14px; letter-spacing: 2px;">WHERE MODESTY MEETS ELEGANCE</p>
        </div>
        <div style="background: #f0fdf4; border-left: 5px solid #10b981; padding: 20px; margin: 30px;">
          <h2 style="margin: 0 0 10px 0; color: #065f46; font-size: 22px;">Order Confirmed</h2>
          <p style="margin: 0; color: #065f46; font-size: 15px;">Thank you for shopping with us, <strong>${user?.name || order.shippingAddress?.fullName || 'Valued Customer'}</strong>!</p>
        </div>
        <div style="padding: 0 30px;">
          <h3 style="color: #111827; font-size: 18px; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">Order Details</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Order Number</p>
              <p style="margin: 5px 0 0 0; color: #111827; font-size: 18px; font-weight: bold;">${order.orderNumber || 'N/A'}</p>
            </div>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Order Date</p>
              <p style="margin: 5px 0 0 0; color: #111827; font-size: 16px; font-weight: bold;">${new Date(order.createdAt || Date.now()).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Payment Method</p>
              <p style="margin: 5px 0 0 0; color: #111827; font-size: 16px; font-weight: bold;">${paymentDisplay}</p>
            </div>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Status</p>
              <p style="margin: 5px 0 0 0; color: ${statusColor}; font-size: 16px; font-weight: bold;">${order.orderStatus || 'PENDING'}</p>
            </div>
          </div>
          <h3 style="color: #111827; font-size: 18px; border-bottom: 2px solid #d4af37; padding-bottom: 10px; margin-top: 30px;">Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px 8px; text-align: left; color: #374151; font-size: 13px;">Product</th>
                <th style="padding: 12px 8px; text-align: center; color: #374151; font-size: 13px;">Qty</th>
                <th style="padding: 12px 8px; text-align: right; color: #374151; font-size: 13px;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsList}</tbody>
          </table>
          <h3 style="color: #111827; font-size: 18px; border-bottom: 2px solid #d4af37; padding-bottom: 10px; margin-top: 30px;">Shipping Address</h3>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0; color: #111827; font-size: 15px;">
              <strong>${order.shippingAddress?.fullName || 'N/A'}</strong><br/>
              ${order.shippingAddress?.street || ''}<br/>
              ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.zip || ''}<br/>
              ${order.shippingAddress?.country || ''}<br/>
              ${order.shippingAddress?.phone || ''}
            </p>
          </div>
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 10px; margin: 25px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #78350f;">Subtotal:</span>
              <span style="color: #78350f; font-weight: bold;">PKR ${itemsPrice.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #78350f;">Shipping:</span>
              <span style="color: #78350f; font-weight: bold;">${shippingPrice === 0 ? 'FREE' : 'PKR ' + shippingPrice.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #d4af37; margin-top: 12px;">
              <span style="color: #78350f; font-size: 18px; font-weight: bold;">Total:</span>
              <span style="color: #78350f; font-size: 22px; font-weight: bold;">PKR ${totalPrice.toLocaleString()}</span>
            </div>
          </div>
          ${['BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA', 'NAYAPAY'].includes(order.paymentMethod) ? `
            <div style="background: #eff6ff; border-left: 5px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: bold;">Payment Receipt Required</p>
              <p style="margin: 0; color: #1e40af; font-size: 14px;">Please upload/send your payment receipt with your Order Number <strong>${order.orderNumber}</strong> so we can verify your payment.</p>
            </div>
          ` : ''}
          <div style="text-align: center; margin: 30px 0 20px 0;">
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Thank you for choosing <strong style="color: #d4af37;">Veil & Vogue</strong>!<br/>You can track your order status using the link below.</p>
            <a href="${trackLink}" style="display: inline-block; background: #d4af37; color: white; padding: 12px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; margin-top: 15px;">${isGuest ? 'Track Your Order' : 'View Your Orders'}</a>
          </div>
        </div>
        <div style="background: #f4f4f4; padding: 25px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px 0;"><strong>Veil & Vogue</strong> - Where Modesty Meets Elegance</p>
          <p style="margin: 0 0 5px 0;">veilandvogue5320@gmail.com | +92 314 4129295</p>
          <p style="margin: 0;">Faisalabad, Pakistan</p>
          <p style="margin: 15px 0 0 0; font-size: 11px; color: #9ca3af;">&copy; ${new Date().getFullYear()} Veil & Vogue. All rights reserved.</p>
        </div>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: `Order Confirmed - ${order.orderNumber} | Veil & Vogue`,
      html: emailHtml
    });

    console.log(`Order confirmation email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    console.error('Error stack:', error.stack);
    return false;
  }
};