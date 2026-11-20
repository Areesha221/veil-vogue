import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Banknote, Upload, Check, MessageCircle, X, MapPin, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

const PAYMENT_METHODS = [
  { id: 'COD', name: 'Cash on Delivery', icon: Banknote },
  { id: 'BANK_TRANSFER', name: 'Bank Transfer', icon: Upload },
  { id: 'JAZZCASH', name: 'JazzCash', icon: CreditCard },
  { id: 'NAYAPAY', name: 'NayaPay', icon: CreditCard }
];

const RECEIPT_METHODS = ['BANK_TRANSFER', 'JAZZCASH', 'NAYAPAY', 'EASYPAISA'];

export default function Checkout() {
  const { cart, cartTotal: rawCartTotal, subtotal, discount: rawDiscount, shipping: rawShipping, total: rawTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  usePageMeta({
    title: 'Checkout',
    description: 'Complete your Veil & Vogue order securely with guest checkout, cash on delivery, and online payment options.'
  });

  const cartSubtotal = rawCartTotal || subtotal || 0;
  const discount = rawDiscount || 0;
  const shipping = rawShipping ?? (cartSubtotal > 3000 ? 0 : 200);
  const total = rawTotal ?? Math.max(0, cartSubtotal - discount + shipping);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'Pakistan'
  });
  const [payment, setPayment] = useState('COD');
  const [processing, setProcessing] = useState(false);
  const [giftMessage, setGiftMessage] = useState(() => localStorage.getItem('vv-gift-note') || '');

  // Saved addresses (logged-in users)
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [useNewAddress, setUseNewAddress] = useState(false);

  // Receipt upload states
  const [receiptMethod, setReceiptMethod] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: user.name || prev.name || '',
        email: user.email || prev.email || '',
        phone: user.phone || prev.phone || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchSavedAddresses = async () => {
      if (!user) {
        setSavedAddresses([]);
        setSelectedAddressId('');
        setUseNewAddress(true);
        return;
      }
      try {
        setAddressesLoading(true);
        const token = localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token');
        const { data } = await axios.get('/api/auth/profile', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const addresses = Array.isArray(data?.addresses) ? data.addresses : [];
        setSavedAddresses(addresses);

        if (addresses.length > 0) {
          const preferred = addresses.find(a => a.isDefault) || addresses[0];
          setUseNewAddress(false);
          setSelectedAddressId(String(preferred._id || ''));
          setForm(prev => ({
            ...prev,
            name: preferred.fullName || prev.name || user.name || '',
            email: user.email || prev.email || '',
            phone: preferred.phone || prev.phone || user.phone || '',
            street: preferred.street || '',
            city: preferred.city || '',
            state: preferred.state || '',
            zip: preferred.zip || '',
            country: preferred.country || 'Pakistan'
          }));
        } else {
          setSelectedAddressId('');
          setUseNewAddress(true);
        }
      } catch (error) {
        console.error('Failed to load saved addresses:', error);
        setSavedAddresses([]);
        setSelectedAddressId('');
        setUseNewAddress(true);
      } finally {
        setAddressesLoading(false);
      }
    };

    fetchSavedAddresses();
  }, [user]);

  const applySavedAddress = (address) => {
    if (!address) return;
    setSelectedAddressId(String(address._id || ''));
    setUseNewAddress(false);
    setForm(prev => ({
      ...prev,
      name: address.fullName || prev.name || user?.name || '',
      email: user?.email || prev.email || '',
      phone: address.phone || prev.phone || user?.phone || '',
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      zip: address.zip || '',
      country: address.country || 'Pakistan'
    }));
  };

  useEffect(() => {
    if (!RECEIPT_METHODS.includes(payment)) {
      setReceiptMethod('');
      setUploadedFile(null);
      setUploadProgress(0);
    }
  }, [payment]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG or PDF files allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFile({
          file,
          preview: reader.result,
          name: file.name,
          size: file.size
        });
        setUploading(false);
        toast.success('Receipt attached');
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedFile({
        file,
        preview: null,
        name: file.name,
        size: file.size
      });
      setUploading(false);
      toast.success('Receipt attached');
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setUploadProgress(0);
  };

  const handleSubmit = async () => {
    const email = (form.email || user?.email || '').trim().toLowerCase();

    if (!form.name || !form.phone || !form.street || !form.city || !form.state) {
      toast.error('Please fill all required shipping fields');
      return;
    }
    if (!user && !email) {
      toast.error('Please enter your email for guest checkout');
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    if (RECEIPT_METHODS.includes(payment) && !receiptMethod) {
      toast.error('Please choose how to send payment receipt (Upload or WhatsApp)');
      return;
    }
    if (receiptMethod === 'website' && !uploadedFile) {
      toast.error('Please upload your payment receipt');
      return;
    }

    setProcessing(true);

    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));

      const note = (giftMessage || localStorage.getItem('vv-gift-note') || '').trim();
      if (note) localStorage.setItem('vv-gift-note', note);
      const orderData = {
        orderItems: cart.map(item => ({
          name: item.product?.name || item.name,
          quantity: item.quantity,
          image: item.product?.images?.[0] || item.image || '',
          price: item.product?.price || item.price,
          product: item.product?._id || item.product,
          ...(item.variant ? { variant: item.variant } : {})
        })),
        shippingAddress: {
          fullName: form.name.trim(),
          phone: form.phone.trim(),
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zip: (form.zip || '').trim(),
          country: form.country || 'Pakistan'
        },
        paymentMethod: payment,
        ...(note ? { giftMessage: note, notes: note } : {}),
        ...(user ? {} : {
          guestName: form.name.trim(),
          guestEmail: email,
          guestPhone: form.phone.trim()
        })
      };

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data: order } = await axios.post('/api/orders', orderData, { headers, timeout: 30000 });

      if (receiptMethod === 'website' && uploadedFile) {
        const formData = new FormData();
        formData.append('receipt', uploadedFile.file);
        const uploadUrl = `/api/orders/${order._id}/upload-receipt${order.guestAccessToken ? `?guestToken=${encodeURIComponent(order.guestAccessToken)}` : ''}`;

        await axios.post(uploadUrl, formData, {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000,
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });
      }

      // Save guest order tracking info for convenience
      if (!user && order?.orderNumber) {
        localStorage.setItem('vv-last-guest-order', JSON.stringify({
          orderNumber: order.orderNumber,
          guestAccessToken: order.guestAccessToken || '',
          email
        }));
      }

      localStorage.removeItem('vv-gift-note');
      localStorage.removeItem('vv-hamper-builder');
      clearCart();
      toast.success(`Order ${order.orderNumber} placed successfully!`);
      navigate('/order-success', { state: { order } });
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.response?.data?.message || 'Order failed');
    } finally {
      setProcessing(false);
    }
  };

  // pricing comes from CartContext (kept consistent with backend)

  const renderReceiptOptions = (paymentType) => {
    const accountDetails = {
      BANK_TRANSFER: {
        title: 'Bank Transfer',
        bank: 'Meezan Bank',
        account: '04150113428574',
        accountTitle: 'Hazeem Malik'
      },
      JAZZCASH: {
        title: 'JazzCash',
        number: '03040955050',
        accountTitle: 'Hazeem Malik'
      },
      NAYAPAY: {
        title: 'NayaPay',
        number: '03394135050',
        accountTitle: 'Huzaim Malik'
      },
      EASYPAISA: {
        title: 'EasyPaisa',
        number: '03040955050',
        accountTitle: 'Hazeem Malik'
      }
    };

    const details = accountDetails[paymentType] || { title: paymentType, accountTitle: 'Veil & Vogue' };

    return (
      <div className="mt-4 p-4 bg-cream dark:bg-zinc-800 rounded-xl space-y-4">
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-ivory">
            {paymentType === 'BANK_TRANSFER' ? <Upload size={20} /> : <CreditCard size={20} />}
            {details.title} Payment Details
          </h3>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg space-y-2">
            {details.bank && <p className="text-gray-900 dark:text-ivory"><span className="font-medium">Bank:</span> {details.bank}</p>}
            {details.number && <p className="text-gray-900 dark:text-ivory"><span className="font-medium">Account Number:</span> {details.number}</p>}
            {details.account && <p className="text-gray-900 dark:text-ivory"><span className="font-medium">Account:</span> {details.account}</p>}
            <p className="text-gray-900 dark:text-ivory"><span className="font-medium">Title:</span> {details.accountTitle}</p>
          </div>
        </div>

        <div>
          <p className="font-medium mb-3 text-gray-900 dark:text-ivory">How would you like to send payment proof?</p>
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setReceiptMethod('website')}
              className={`p-4 rounded-xl border-2 transition-all ${receiptMethod === 'website'
                ? 'border-gold bg-gold/10'
                : 'border-gray-200 dark:border-zinc-700 hover:border-gold/50'
                }`}
            >
              <Upload size={24} className="mx-auto mb-2 text-gold" />
              <p className="font-semibold text-gray-900 dark:text-ivory">Upload on Website</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Upload receipt for verification</p>
            </button>

            <a
              href={`https://wa.me/923144129295?text=${encodeURIComponent(`Assalam-o-Alaikum! I've sent payment via ${details.title}. Please verify my order.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setReceiptMethod('whatsapp')}
              className={`p-4 rounded-xl border-2 transition-all ${receiptMethod === 'whatsapp'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 dark:border-zinc-700 hover:border-green-500/50'
                }`}
            >
              <MessageCircle size={24} className="mx-auto mb-2 text-green-600" />
              <p className="font-semibold text-gray-900 dark:text-ivory">Send on WhatsApp</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Send screenshot to 0314-4129295</p>
            </a>
          </div>
        </div>

        {receiptMethod === 'website' && (
          <div className="border-2 border-dashed border-gold/30 rounded-lg p-6 text-center bg-white dark:bg-zinc-900">
            {uploadedFile ? (
              <div className="space-y-3">
                {uploadedFile.preview && (
                  <img src={uploadedFile.preview} alt="Receipt preview" className="max-h-48 mx-auto rounded-lg border-2 border-gold/20" />
                )}
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Check size={20} />
                  <span className="font-medium text-gray-900 dark:text-ivory">{uploadedFile.name}</span>
                  <span className="text-sm text-gray-500">({(uploadedFile.size / 1024).toFixed(2)} KB)</span>
                </div>
                <button type="button" onClick={removeUploadedFile} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 mx-auto">
                  <X size={16} /> Remove & Upload Different
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <div className="space-y-2">
                  <Upload size={40} className="mx-auto text-gold" />
                  <p className="font-medium text-gray-900 dark:text-ivory">Click to upload receipt</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG or PDF (Max 5MB)</p>
                </div>
                <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" disabled={uploading} />
              </label>
            )}
            {uploading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                  <div className="bg-gold h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Uploading... {uploadProgress}%</p>
              </div>
            )}
          </div>
        )}

        {receiptMethod === 'whatsapp' && (
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-400 font-medium mb-2">WhatsApp Selected</p>
            <p className="text-sm text-green-900 dark:text-green-300">
              After placing the order, send your payment screenshot to <strong>0314-4129295</strong> with your order number.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pt-32 pb-20 min-h-screen bg-gradient-to-br from-ivory via-cream to-beige dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-center text-gray-900 dark:text-ivory">Checkout</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-10">
          {user ? 'Complete your order securely.' : 'Checkout as guest or '} 
          {!user && <Link to="/login" className="text-gold font-semibold hover:underline">login/register</Link>}
          {!user && ' for an account (order history and promotional updates).'}
        </p>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg">
              <h2 className="font-serif text-2xl mb-4 text-gray-900 dark:text-ivory">Shipping & Contact Details</h2>

              {user && (
                <div className="mb-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-ivory font-medium">
                      <MapPin size={18} className="text-gold" />
                      <span>Saved Addresses</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/profile')}
                      className="text-sm text-gold hover:underline"
                    >
                      Manage addresses
                    </button>
                  </div>

                  {addressesLoading ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 bg-ivory dark:bg-zinc-800 rounded-lg p-3 border border-gold/20">
                      Loading saved addresses...
                    </div>
                  ) : savedAddresses.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        {savedAddresses.map((addr) => {
                          const selected = !useNewAddress && String(selectedAddressId) === String(addr._id);
                          return (
                            <button
                              key={addr._id}
                              type="button"
                              onClick={() => applySavedAddress(addr)}
                              className={`text-left p-3 rounded-xl border-2 transition-all ${
                                selected
                                  ? 'border-gold bg-gold/10'
                                  : 'border-gray-200 dark:border-zinc-700 hover:border-gold/50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 dark:text-ivory truncate">
                                    {addr.fullName || user.name}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{addr.phone || user.phone || 'No phone'}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                    {addr.street}, {addr.city}, {addr.state} {addr.zip || ''}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500">{addr.country || 'Pakistan'}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  {addr.isDefault && (
                                    <span className="px-2 py-0.5 rounded-full bg-gold text-white text-[10px] font-semibold">Default</span>
                                  )}
                                  {selected && <Check size={16} className="text-gold" />}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUseNewAddress(true);
                          setSelectedAddressId('');
                          setForm(prev => ({
                            ...prev,
                            name: user.name || prev.name || '',
                            email: user.email || prev.email || '',
                            phone: user.phone || prev.phone || '',
                            street: '',
                            city: '',
                            state: '',
                            zip: '',
                            country: 'Pakistan'
                          }));
                        }}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                          useNewAddress
                            ? 'border-gold bg-gold/10 text-gray-900 dark:text-ivory'
                            : 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:border-gold/50'
                        }`}
                      >
                        <Plus size={16} /> Use a new address for this order
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-ivory dark:bg-zinc-800 rounded-lg p-3 border border-gold/20">
                      No saved addresses yet. You can enter one below and save addresses from your{' '}
                      <button type="button" onClick={() => navigate('/profile')} className="text-gold font-medium hover:underline">Profile</button> for next time.
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Full Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Email {user ? '(Account)' : '*'}</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      disabled={Boolean(user?.email)}
                      className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory disabled:opacity-70"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Phone *</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      placeholder="0300-1234567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">City *</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={e => setForm({ ...form, city: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      placeholder="Karachi"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Street Address *</label>
                  <textarea
                    value={form.street}
                    onChange={e => setForm({ ...form, street: e.target.value })}
                    rows="2"
                    className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                    placeholder="House #, Street #, Area"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">State/Province *</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={e => setForm({ ...form, state: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      placeholder="Sindh"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">ZIP Code</label>
                    <input
                      type="text"
                      value={form.zip}
                      onChange={e => setForm({ ...form, zip: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      placeholder="75500"
                    />
                  </div>
                </div>

                {!user && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-ivory dark:bg-zinc-800 rounded-lg p-3 border border-gold/20">
                    Guest checkout is enabled. Promotional emails/sale/new product emails are sent only to users who create an account.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Gift Message / Order Note (optional)</label>
                  <textarea
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Add a gift note or special instructions for your order/hamper..."
                    className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Helpful for custom gift hampers and special delivery notes.</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg">
              <h2 className="font-serif text-2xl mb-4 text-gray-900 dark:text-ivory">Payment Method</h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon;
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${payment === m.id
                        ? 'border-gold bg-gold/10'
                        : 'border-gray-200 dark:border-zinc-700 hover:border-gold/50'
                        }`}
                    >
                      <input type="radio" name="payment" value={m.id} checked={payment === m.id} onChange={e => setPayment(e.target.value)} className="hidden" />
                      <Icon size={20} className="text-gold" />
                      <span className="flex-1 font-medium text-gray-900 dark:text-ivory">{m.name}</span>
                      {payment === m.id && <Check size={20} className="text-gold" />}
                    </label>
                  );
                })}
              </div>

              {RECEIPT_METHODS.includes(payment) && renderReceiptOptions(payment)}
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 h-fit sticky top-24 shadow-lg">
            <h2 className="font-serif text-2xl mb-4 text-gray-900 dark:text-ivory">Order Summary</h2>

            {cart.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                  {cart.map((item, idx) => (
                    <div key={item.key || idx} className="flex gap-3 text-sm">
                      <img
                        src={item.product?.images?.[0] || item.image || 'https://via.placeholder.com/100'}
                        alt={item.product?.name || item.name}
                        className="w-12 h-14 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="line-clamp-1 font-medium text-gray-900 dark:text-ivory">{item.product?.name || item.name}</p>
                        <p className="text-zinc-500 dark:text-zinc-400">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gold">PKR {((item.product?.price || item.price || 0) * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gold/20 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Subtotal</span>
                    <span>PKR {cartSubtotal.toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-700 dark:text-green-400">
                      <span>Discount (10% off over PKR 10,000)</span>
                      <span>- PKR {discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'FREE' : `PKR ${shipping}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gold/20">
                    <span className="text-gray-900 dark:text-ivory">Total</span>
                    <span className="text-gold">PKR {total.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={processing || cart.length === 0}
                  className="w-full mt-6 bg-deep-black dark:bg-gold text-ivory dark:text-white py-3 rounded-full font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : `Place Order - PKR ${total.toLocaleString()}`}
                </button>

                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
                  Secure checkout • Guest checkout available • Free shipping over PKR 3,000 • 10% off over PKR 10,000
                </p>
              </>
            )}
          </motion.div>
        </div>

        <ProductsStrip
          title="Add More Before You Place Order"
          subtitle="Best sellers you can add to your order"
          onlyBestSeller
          sortBy="sold"
          limit={4}
          viewAllTo="/shop"
        />
      </div>
    </div>
  );
}