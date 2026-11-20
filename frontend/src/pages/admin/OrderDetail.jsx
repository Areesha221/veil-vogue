import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Package, User, Calendar, CreditCard, MapPin,
  Phone, Mail, Download, Check, X, Upload, AlertCircle, Eye, MessageSquare, Gift
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptBlobUrl, setReceiptBlobUrl] = useState('');
  const [receiptLoading, setReceiptLoading] = useState(false);

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    return () => {
      if (receiptBlobUrl) URL.revokeObjectURL(receiptBlobUrl);
    };
  }, [receiptBlobUrl]);

  const fetchOrder = async () => {
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      const { data } = await axios.get(`/api/admin/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReceiptBlobUrl = async () => {
    if (!order?.paymentReceipt?.fileName || !order?._id) return '';
    if (receiptBlobUrl) return receiptBlobUrl;
    try {
      setReceiptLoading(true);
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      const res = await axios.get(`/api/admin/orders/${order._id}/receipt-file`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(res.data);
      setReceiptBlobUrl(url);
      return url;
    } catch (error) {
      console.error('Receipt load error:', error);
      toast.error(error?.response?.data?.message || 'Failed to load receipt file');
      return '';
    } finally {
      setReceiptLoading(false);
    }
  };

  const openReceiptModal = async () => {
    setShowReceiptModal(true);
    await fetchReceiptBlobUrl();
  };

  const handleDownloadReceipt = async () => {
    const url = await fetchReceiptBlobUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = order?.paymentReceipt?.fileName || `receipt-${order?.orderNumber || 'order'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleVerifyReceipt = async (orderId, verified) => {
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      let notes = '';

      if (!verified) {
        notes = prompt('Reason for rejection (optional):');
        if (notes === null) return;
      }

      await axios.put(
        `/api/admin/orders/${orderId}/verify-receipt`,
        { verified, adminNotes: notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(verified ? '✓ Receipt verified!' : '✗ Receipt rejected');
      await fetchOrder();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to verify receipt');
    }
  };

  const handleDownloadInvoice = () => {
    if (!order) return;
    const invoiceContent = `
VEIL & VOGUE - INVOICE
======================
Order Number: ${order.orderNumber}
Order Date: ${new Date(order.createdAt).toLocaleDateString('en-PK')}

CUSTOMER: ${order.shippingAddress?.fullName || order.guestInfo?.name || order.user?.name || 'Guest'}
Phone: ${order.shippingAddress?.phone || order.guestInfo?.phone || 'N/A'}
Email: ${order.user?.email || order.guestInfo?.email || 'N/A'}

ITEMS:
${(order.orderItems || []).map((item, idx) => `${idx + 1}. ${item.name} x ${item.quantity} = PKR ${Number(item.price || 0) * Number(item.quantity || 0)}`).join('\n')}

Subtotal: PKR ${Number(order.itemsPrice || 0).toLocaleString()}
Discount (10%): - PKR ${Number(order.discountPrice || 0).toLocaleString()}
Shipping: ${Number(order.shippingPrice || 0) === 0 ? 'FREE' : `PKR ${Number(order.shippingPrice || 0).toLocaleString()}`}
TOTAL: PKR ${Number(order.totalPrice || 0).toLocaleString()}
Payment: ${order.paymentMethod} (${order.paymentStatus || 'PENDING'})
Status: ${order.orderStatus}
${order.notes ? `\nOrder Notes:\n${order.notes}` : ''}
${order.giftMessage ? `\nGift Message:\n${order.giftMessage}` : ''}
    `.trim();
    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${order.orderNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'PROCESSING': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'SHIPPED': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'DELIVERED': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'CANCELLED': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory dark:bg-zinc-950">
        <div className="text-2xl font-serif dark:text-ivory">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory dark:bg-zinc-950">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-ivory mb-4">Order Not Found</h2>
          <button onClick={() => navigate('/admin/orders')} className="bg-gold text-white px-6 py-2 rounded-full hover:bg-yellow-600">
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  // Payment method details
  const paymentDetails = {
    BANK_TRANSFER: { bank: 'Meezan Bank', account: '04150113428574', title: 'Hazeem Malik' },
    JAZZCASH: { number: '03040955050', title: 'Hazeem Malik' },
    NAYAPAY: { number: '03394135050', title: 'Huzaim Malik' },
    EASYPAISA: { number: '03040955050', title: 'Hazeem Malik' }
  };

  return (
    <div className="min-h-screen bg-ivory dark:bg-zinc-950 pt-28 md:pt-32 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/admin/orders')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gold dark:hover:text-gold mb-4"
          >
            <ArrowLeft size={20} />
            Back to Orders
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 dark:text-ivory mb-2">
                Order Details
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Order #{order.orderNumber}</p>
            </div>
            <button
              onClick={handleDownloadInvoice}
              className="flex items-center gap-2 bg-gold text-white px-6 py-3 rounded-full font-semibold hover:bg-yellow-600 transition-colors"
            >
              <Download size={18} />
              Download Invoice
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Order Status</p>
            <span className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(order.orderStatus)}`}>
              {order.orderStatus}
            </span>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Payment Status</p>
            <span className={`px-4 py-2 rounded-full font-semibold ${
              order.paymentStatus === 'VERIFIED' || order.paymentStatus === 'PAID'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : order.paymentStatus === 'REJECTED'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {order.paymentStatus}
            </span>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Payment Method</p>
            <p className="font-semibold text-gray-900 dark:text-ivory">{order.paymentMethod}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-lg mb-6">
              <h2 className="font-serif text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-ivory flex items-center gap-2">
                <Package size={24} />
                Order Items
              </h2>

              <div className="space-y-3 sm:space-y-4">
                {order.orderItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                    <img
                      src={item.image || 'https://via.placeholder.com/100'}
                      alt={item.name}
                      className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-ivory mb-1 truncate">{item.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quantity: {item.quantity}</p>
                      <p className="font-bold text-gold">PKR {item.price.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-ivory">
                        PKR {(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="border-t border-gray-200 dark:border-zinc-800 mt-4 sm:mt-6 pt-4 sm:pt-6 space-y-2">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>PKR {Number(order.itemsPrice || 0).toLocaleString()}</span>
                </div>
                {Number(order.discountPrice || 0) > 0 && (
                  <div className="flex justify-between text-green-700 dark:text-green-400">
                    <span>Discount (10%)</span>
                    <span>- PKR {Number(order.discountPrice || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping</span>
                  <span>{Number(order.shippingPrice || 0) === 0 ? 'FREE' : `PKR ${Number(order.shippingPrice || 0).toLocaleString()}`}</span>
                </div>
                <div className="flex justify-between font-bold text-lg sm:text-xl pt-2 border-t border-gray-200 dark:border-zinc-800">
                  <span className="text-gray-900 dark:text-ivory">Total</span>
                  <span className="text-gold">PKR {Number(order.totalPrice || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Customer Info */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-lg">
              <h2 className="font-serif text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-ivory flex items-center gap-2">
                <User size={24} />
                Customer
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-semibold text-gray-900 dark:text-ivory">
                    {order.user?.name || order.guestInfo?.name || order.shippingAddress?.fullName || 'Guest'}
                  </p>
                  {(order.isGuest || !order.user) && (
                    <span className="inline-flex mt-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs">
                      Guest Order
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <div className="flex items-center gap-2 text-gray-900 dark:text-ivory break-all">
                    <Mail size={16} className="text-gray-400" />
                    {order.user?.email || order.guestInfo?.email || 'N/A'}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  <div className="flex items-center gap-2 text-gray-900 dark:text-ivory">
                    <Phone size={16} className="text-gray-400" />
                    {order.shippingAddress?.phone || order.guestInfo?.phone || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-lg">
              <h2 className="font-serif text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-ivory flex items-center gap-2">
                <MapPin size={24} />
                Shipping Address
              </h2>
              <div className="space-y-2 text-gray-900 dark:text-ivory">
                <p className="font-semibold">{order.shippingAddress?.fullName}</p>
                <p>{order.shippingAddress?.street}</p>
                <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}</p>
                <p>{order.shippingAddress?.country}</p>
              </div>
            </div>

            {/* Order Info */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-lg">
              <h2 className="font-serif text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-ivory flex items-center gap-2">
                <Calendar size={24} />
                Order Info
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Order Date</p>
                  <p className="font-semibold text-gray-900 dark:text-ivory">
                    {new Date(order.createdAt).toLocaleString('en-PK')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Order Number</p>
                  <p className="font-semibold text-gray-900 dark:text-ivory">{order.orderNumber}</p>
                </div>
              </div>
            </div>

            {/* Notes / Gift Message */}
            {(order.notes || order.giftMessage) && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-lg space-y-4">
                {order.notes && (
                  <div>
                    <h2 className="font-serif text-xl font-bold mb-2 text-gray-900 dark:text-ivory flex items-center gap-2">
                      <MessageSquare size={20} />
                      Order Notes
                    </h2>
                    <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words bg-gray-50 dark:bg-zinc-800 rounded-xl p-3">
                      {order.notes}
                    </p>
                  </div>
                )}
                {order.giftMessage && (
                  <div>
                    <h2 className="font-serif text-xl font-bold mb-2 text-gray-900 dark:text-ivory flex items-center gap-2">
                      <Gift size={20} />
                      Gift Message
                    </h2>
                    <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words bg-gray-50 dark:bg-zinc-800 rounded-xl p-3">
                      {order.giftMessage}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Payment Receipt */}
            {order.paymentReceipt && order.paymentReceipt.fileName && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-gold/30">
                <h2 className="font-serif text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-ivory flex items-center gap-2">
                  <Upload size={24} className="text-gold" />
                  Payment Receipt
                </h2>

                <div className="space-y-3 sm:space-y-4">
                  <div className="p-3 sm:p-4 bg-gold/10 border-2 border-gold/30 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">File Name</p>
                    <p className="font-semibold text-gray-900 dark:text-ivory break-all text-sm sm:text-base">
                      {order.paymentReceipt.fileName}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">File Size</p>
                      <p className="font-semibold text-sm text-gray-900 dark:text-ivory">
                        {order.paymentReceipt.fileSize
                          ? `${(Number(order.paymentReceipt.fileSize) / 1024).toFixed(2)} KB`
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Upload Method</p>
                      <p className="font-semibold text-sm text-gray-900 dark:text-ivory capitalize">
                        {order.paymentReceipt.uploadedVia || 'Website'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Uploaded At</p>
                    <p className="font-semibold text-sm text-gray-900 dark:text-ivory">
                      {order.paymentReceipt.uploadedAt
                        ? new Date(order.paymentReceipt.uploadedAt).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Verification Status</p>
                    {order.paymentReceipt.verified ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-sm font-semibold">
                        <Check size={16} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-sm font-semibold">
                        <AlertCircle size={16} /> Pending
                      </span>
                    )}
                  </div>

                  <button
                    onClick={openReceiptModal}
                    disabled={receiptLoading}
                    className="w-full bg-blue-600 text-white py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Eye size={20} />
                    {receiptLoading ? 'Loading Receipt...' : 'View Receipt'}
                  </button>

                  {order.paymentReceipt.adminNotes && (
                    <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Admin Notes</p>
                      <p className="text-sm text-gray-900 dark:text-ivory">{order.paymentReceipt.adminNotes}</p>
                    </div>
                  )}

                  {!order.paymentReceipt.verified && order.paymentStatus !== 'REJECTED' && (
                    <div className="flex gap-2 sm:gap-3 pt-2 border-t border-gray-200 dark:border-zinc-800">
                      <button
                        onClick={() => handleVerifyReceipt(order._id, true)}
                        className="flex-1 bg-green-500 text-white py-2 sm:py-3 rounded-full font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <Check size={18} />
                        Verify
                      </button>
                      <button
                        onClick={() => handleVerifyReceipt(order._id, false)}
                        className="flex-1 bg-red-500 text-white py-2 sm:py-3 rounded-full font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <X size={18} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Method Details (Bank/JazzCash/EasyPaisa) */}
            {paymentDetails[order.paymentMethod] && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-lg">
                <h2 className="font-serif text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-ivory flex items-center gap-2">
                  <CreditCard size={24} />
                  Payment Details
                </h2>
                <div className="bg-cream dark:bg-zinc-800 p-4 rounded-xl space-y-2">
                  {paymentDetails[order.paymentMethod].bank && (
                    <p className="text-gray-900 dark:text-ivory">
                      <span className="font-medium">Bank:</span> {paymentDetails[order.paymentMethod].bank}
                    </p>
                  )}
                  {paymentDetails[order.paymentMethod].account && (
                    <p className="text-gray-900 dark:text-ivory">
                      <span className="font-medium">Account:</span> {paymentDetails[order.paymentMethod].account}
                    </p>
                  )}
                  {paymentDetails[order.paymentMethod].number && (
                    <p className="text-gray-900 dark:text-ivory">
                      <span className="font-medium">Number:</span> {paymentDetails[order.paymentMethod].number}
                    </p>
                  )}
                  <p className="text-gray-900 dark:text-ivory">
                    <span className="font-medium">Title:</span> {paymentDetails[order.paymentMethod].title}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReceiptModal(false);
          }}
        >
          <div 
            className="relative max-w-5xl w-full bg-white dark:bg-zinc-900 rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-ivory">Payment Receipt</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {order.paymentReceipt.fileName} • {order.paymentReceipt.fileSize ? `${(Number(order.paymentReceipt.fileSize) / 1024).toFixed(2)} KB` : 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-700 dark:text-ivory" />
              </button>
            </div>

            <div className="p-6 bg-gray-100 dark:bg-zinc-950 min-h-[400px] flex items-center justify-center">
              {receiptLoading && !receiptBlobUrl ? (
                <p className="text-gray-600 dark:text-gray-300">Loading receipt...</p>
              ) : receiptBlobUrl ? (
                (order.paymentReceipt.fileType === 'application/pdf' || String(order.paymentReceipt.fileName || '').toLowerCase().endsWith('.pdf')) ? (
                  <iframe
                    src={receiptBlobUrl}
                    className="w-full h-[600px] bg-white rounded-lg"
                    title="Receipt PDF"
                  />
                ) : (
                  <img
                    src={receiptBlobUrl}
                    alt="Payment Receipt"
                    className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg"
                  />
                )
              ) : (
                <p className="text-gray-600 dark:text-gray-300">Receipt preview unavailable.</p>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800">
              <button
                onClick={handleDownloadReceipt}
                disabled={receiptLoading}
                className="flex-1 bg-gold text-white px-4 py-3 rounded-full font-semibold hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Download size={20} />
                {receiptLoading ? 'Loading...' : 'Download Receipt'}
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 bg-gray-300 dark:bg-zinc-700 text-gray-900 dark:text-ivory px-4 py-3 rounded-full font-semibold hover:bg-gray-400 dark:hover:bg-zinc-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}