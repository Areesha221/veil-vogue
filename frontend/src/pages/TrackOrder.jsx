import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock, Package, Truck, Home, XCircle, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

const STATUS_STEPS = [
  { key: 'PENDING', label: 'Pending', description: 'Order received and awaiting processing', icon: Clock },
  { key: 'PROCESSING', label: 'Processing', description: 'Order is being prepared', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', description: 'Order is on the way', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', description: 'Order delivered successfully', icon: Home }
];

export default function TrackOrder() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  usePageMeta({
    title: 'Track Order',
    description: 'Track your Veil & Vogue order status using your order number. Guest and registered customer tracking supported.'
  });

  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [guestToken, setGuestToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem('vv-last-guest-order') || 'null');
      } catch {
        return null;
      }
    })();

    const qpOrder = searchParams.get('order') || '';
    const qpToken = searchParams.get('token') || '';
    const qpEmail = searchParams.get('email') || '';

    if (qpOrder) setOrderNumber(qpOrder);
    else if (saved?.orderNumber) setOrderNumber(saved.orderNumber);

    if (qpToken) setGuestToken(qpToken);
    else if (saved?.guestAccessToken) setGuestToken(saved.guestAccessToken);

    if (qpEmail) setEmail(qpEmail);
    else if (saved?.email) setEmail(saved.email);
  }, [searchParams]);

  const handleTrack = async (e) => {
    e?.preventDefault?.();
    const normalizedOrder = orderNumber.trim().toUpperCase();
    if (!normalizedOrder) {
      toast.error('Please enter your order number');
      return;
    }

    if (!user && !guestToken && !email.trim() && !phone.trim()) {
      toast.error('Guest tracking requires email or phone used at checkout');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('orderNumber', normalizedOrder);
      if (guestToken.trim()) params.set('guestToken', guestToken.trim());
      if (email.trim()) params.set('email', email.trim().toLowerCase());
      if (phone.trim()) params.set('phone', phone.trim());

      const { data } = await axios.get(`/api/orders/track?${params.toString()}`);
      setOrder(data);
      toast.success('Order details loaded');
    } catch (error) {
      setOrder(null);
      toast.error(error.response?.data?.message || 'Unable to track order');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = useMemo(() => {
    if (!order?.orderStatus) return -1;
    return STATUS_STEPS.findIndex((s) => s.key === order.orderStatus);
  }, [order]);

  const copyOrderNumber = async () => {
    if (!order?.orderNumber) return;
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      toast.success('Order number copied');
    } catch {
      toast.error('Could not copy order number');
    }
  };

  return (
    <div className="min-h-screen bg-ivory dark:bg-zinc-950 pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-gray-100 dark:border-zinc-800 p-6 md:p-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 dark:text-ivory mb-4">Track Order</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Enter your order number to check status updates. Guests can track using the email/phone used at checkout (or tracking link/token).
          </p>

          <form onSubmit={handleTrack} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order Number *</label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. VV-XXXXXX"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            {!user && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email (guest)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email used at checkout"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone (guest)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone used at checkout"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-gold text-white px-6 py-3 rounded-full font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check Status'}
              </button>
              {user && (
                <Link to="/profile" className="text-gold font-medium hover:underline">
                  View your order history
                </Link>
              )}
            </div>
          </form>
        </div>

        {order && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-gray-100 dark:border-zinc-800 p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-ivory">Order {order.orderNumber}</h2>
                  <button onClick={copyOrderNumber} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:border-gold hover:text-gold">
                    <Copy size={12} /> Copy
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Placed on {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gold/10 text-gold border border-gold/20">
                  {order.orderStatus}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200">
                  Payment: {order.paymentStatus}
                </span>
              </div>
            </div>

            {order.orderStatus === 'CANCELLED' ? (
              <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
                <XCircle className="text-red-500 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-300">This order has been cancelled.</p>
                  <p className="text-sm text-red-700/80 dark:text-red-300/80">If you need help, please contact support with your order number.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {STATUS_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const active = currentStepIndex >= idx;
                    const current = currentStepIndex === idx;
                    return (
                      <div
                        key={step.key}
                        className={`rounded-xl p-4 border transition-colors ${active ? 'border-gold bg-gold/10' : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${active ? 'bg-gold text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400'}`}>
                            {active && !current ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                          </div>
                          <p className={`font-semibold text-sm ${active ? 'text-gold' : 'text-gray-600 dark:text-gray-300'}`}>{step.label}</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{step.description}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current status: <span className="font-semibold text-gold">{order.orderStatus}</span>
                </p>
              </div>
            )}

            {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-ivory mb-3">Status History</h3>
                <div className="space-y-2">
                  {order.statusHistory.slice().reverse().map((h, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 dark:border-zinc-800 p-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-ivory">{h?.status || 'Updated'}</p>
                        {h?.note && <p className="text-sm text-gray-600 dark:text-gray-400">{h.note}</p>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {h?.at ? new Date(h.at).toLocaleString() : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-ivory">Shipping</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <p className="font-medium">{order.shippingAddress?.fullName}</p>
                  <p>{order.shippingAddress?.phone}</p>
                  <p>{order.shippingAddress?.street}</p>
                  <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip || ''}</p>
                  <p>{order.shippingAddress?.country}</p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-ivory">Payment & Total</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <p>Method: <span className="font-medium">{order.paymentMethod}</span></p>
                  <p>Items: PKR {Number(order.itemsPrice || 0).toLocaleString()}</p>
                  {Number(order.discountPrice || 0) > 0 && (
                    <p className="text-green-700 dark:text-green-400">Discount (10%): - PKR {Number(order.discountPrice || 0).toLocaleString()}</p>
                  )}
                  <p>Shipping: {Number(order.shippingPrice || 0) === 0 ? 'FREE' : `PKR ${Number(order.shippingPrice || 0).toLocaleString()}`}</p>
                  <p className="text-base font-bold text-gold pt-1">Total: PKR {Number(order.totalPrice || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-ivory mb-3">Items</h3>
              <div className="space-y-3">
                {(order.orderItems || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 border border-gray-100 dark:border-zinc-800 rounded-xl p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-ivory truncate">{item.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Qty: {item.quantity} {item.variant ? `• ${item.variant}` : ''}</p>
                    </div>
                    <p className="font-semibold text-gold whitespace-nowrap">PKR {(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <ProductsStrip
          title="Shop While You Wait"
          subtitle="Best-selling abayas, hijabs, and accessories"
          onlyBestSeller
          sortBy="sold"
          limit={4}
          viewAllTo="/shop"
        />
      </div>
    </div>
  );
}
