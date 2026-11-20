import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Package, Phone, Download, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

// Confetti Component
const Confetti = () => {
  const [confettiPieces, setConfettiPieces] = useState([]);

  useEffect(() => {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    const pieces = [];
    for (let i = 0; i < 120; i++) {
      pieces.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 3 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 8,
        rotation: Math.random() * 360
      });
    }
    setConfettiPieces(pieces);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            animation: `confetti-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0%'
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const order = location.state?.order;

  usePageMeta({
    title: 'Order Confirmed',
    description: 'Your Veil & Vogue order has been placed successfully. View order details, track status, and download invoice.'
  });

  useEffect(() => {
    if (!order) {
      navigate('/');
      return;
    }

    // Persist guest tracking info for convenience
    if ((order.isGuest || !order.user) && order.orderNumber) {
      const existing = (() => {
        try { return JSON.parse(localStorage.getItem('vv-last-guest-order') || 'null') || {}; } catch { return {}; }
      })();
      localStorage.setItem('vv-last-guest-order', JSON.stringify({
        ...existing,
        orderNumber: order.orderNumber,
        guestAccessToken: order.guestAccessToken || existing.guestAccessToken || '',
        email: order.guestInfo?.email || existing.email || ''
      }));
    }
  }, [order, navigate]);

  const handleDownloadInvoice = () => {
    if (!order) return;

    const customerEmail = order.user?.email || order.guestInfo?.email || 'N/A';
    const invoiceContent = `
VEIL & VOGUE
Where Modesty Meets Elegance
INVOICE

Order Number: ${order.orderNumber}
Order Date: ${new Date(order.createdAt || Date.now()).toLocaleString('en-PK')}
Order Status: ${order.orderStatus}

Customer: ${order.shippingAddress?.fullName || order.guestInfo?.name || 'N/A'}
Email: ${customerEmail}
Phone: ${order.shippingAddress?.phone || order.guestInfo?.phone || 'N/A'}

Shipping Address:
${order.shippingAddress?.street || ''}
${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.zip || ''}
${order.shippingAddress?.country || ''}

Items:
${(order.orderItems || []).map((item, idx) => `${idx + 1}. ${item.name} x${item.quantity} - PKR ${Number(item.price || 0).toLocaleString()}`).join('\n')}

Subtotal: PKR ${Number(order.itemsPrice || 0).toLocaleString()}
Discount (10% over PKR 10,000): - PKR ${Number(order.discountPrice || 0).toLocaleString()}
Shipping: ${Number(order.shippingPrice || 0) === 0 ? 'FREE' : `PKR ${Number(order.shippingPrice || 0).toLocaleString()}`}
Total: PKR ${Number(order.totalPrice || 0).toLocaleString()}

Payment Method: ${order.paymentMethod}
Payment Status: ${order.paymentStatus}
`;

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${order.orderNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!order) return null;

  const isGuestOrder = !user || order.isGuest || !order.user;
  const trackLink = `/track-order?order=${encodeURIComponent(order.orderNumber || '')}${order.guestAccessToken ? `&token=${encodeURIComponent(order.guestAccessToken)}` : ''}`;

  return (
    <>
      <Confetti />
      <div className="pt-32 pb-20 min-h-screen bg-gradient-to-br from-ivory via-cream to-beige dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-2xl text-center relative overflow-hidden">
            <div className="relative mb-8">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto mb-6 flex items-center justify-center animate-bounce">
                <CheckCircle size={60} className="text-green-600 dark:text-green-400" />
              </div>
            </div>

            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-ivory">Order Placed Successfully!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">Thank you for shopping with Veil & Vogue</p>

            <div className="bg-cream dark:bg-zinc-800 rounded-2xl p-6 md:p-8 mb-8 text-left">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Number</p>
                  <p className="font-bold text-lg text-gray-900 dark:text-ivory">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Date</p>
                  <p className="font-semibold text-gray-900 dark:text-ivory">
                    {new Date(order.createdAt || Date.now()).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="border-t border-gold/20 pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="font-semibold text-gray-900 dark:text-ivory">PKR {Number(order.itemsPrice || 0).toLocaleString()}</span>
                </div>
                {Number(order.discountPrice || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Discount (10%)</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">- PKR {Number(order.discountPrice || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                  <span className="font-semibold text-gray-900 dark:text-ivory">{Number(order.shippingPrice || 0) === 0 ? 'FREE' : `PKR ${Number(order.shippingPrice || 0).toLocaleString()}`}</span>
                </div>
                <div className="flex justify-between border-t border-gold/20 pt-2">
                  <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                  <span className="font-bold text-2xl text-gold">PKR {Number(order.totalPrice || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                  <span className="font-semibold text-gray-900 dark:text-ivory">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Order Status</span>
                  <span className="px-4 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-sm font-semibold">{order.orderStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Payment Status</span>
                  <span className="font-semibold text-gray-900 dark:text-ivory">{order.paymentStatus}</span>
                </div>
              </div>

              {['BANK_TRANSFER', 'JAZZCASH', 'NAYAPAY', 'EASYPAISA'].includes(order.paymentMethod) && (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-200 dark:border-yellow-800">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2 flex items-center gap-2">
                    <Package size={18} /> Payment Verification
                  </p>
                  <p className="text-sm text-yellow-900 dark:text-yellow-300">
                    If you selected online payment and have not uploaded your receipt yet, please upload/send it with your order number so we can verify it quickly.
                  </p>
                </div>
              )}

              {isGuestOrder && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-sm text-blue-900 dark:text-blue-200">
                  <p className="font-semibold mb-1">Guest checkout order</p>
                  <p>Save your order number to track your order. You can also use the tracking link below.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleDownloadInvoice}
                className="flex-1 bg-deep-black dark:bg-gold text-ivory dark:text-white py-4 rounded-full font-semibold hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <Download size={20} /> Download Invoice
              </button>
              <Link
                to={trackLink}
                className="flex-1 border-2 border-gold text-gold py-4 rounded-full font-semibold hover:bg-gold hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Search size={20} /> Track Order
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              {user && (
                <button
                  onClick={() => navigate('/profile')}
                  className="flex-1 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-200 py-3 rounded-full font-semibold hover:border-gold hover:text-gold transition-colors flex items-center justify-center gap-2"
                >
                  <Package size={18} /> View My Orders
                </button>
              )}
              <button
                onClick={() => navigate('/shop')}
                className="flex-1 text-gray-600 dark:text-gray-400 hover:text-gold dark:hover:text-gold transition-colors font-semibold py-3"
              >
                Continue Shopping →
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-zinc-800">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Need help? Contact us on WhatsApp</p>
              <a
                href={`https://wa.me/923144129295?text=${encodeURIComponent(`Assalam-o-Alaikum! I have a question about my order ${order.orderNumber}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full hover:bg-green-600 transition-colors"
              >
                <Phone size={18} /> WhatsApp: 0314-4129295
              </a>
            </div>
          </div>

          <ProductsStrip
            title="Continue Shopping - Abayas & Best Sellers"
            subtitle="Explore abayas and popular products with images and prices"
            category="abayas"
            sortBy="sold"
            limit={4}
            className="mt-10"
            viewAllTo="/shop/abayas"
          />
        </div>
      </div>
    </>
  );
}