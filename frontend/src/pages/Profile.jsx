import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Package, Heart, LogOut, MapPin, Plus, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import PasswordInput from '../components/ui/PasswordInput';
import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

export default function Profile() {
  usePageMeta({
    title: 'My Account',
    description: 'Manage your Veil & Vogue profile, saved addresses, orders, and wishlist.'
  });
  const { user, logout, refreshUser } = useAuth();
  const { wishlist } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Profile edit
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'Pakistan',
    isDefault: false
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    setProfileData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: ''
    });

    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'addresses') fetchAddresses();
  }, [user, activeTab, navigate]);

  // Handle notification/navigation state
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      const { data } = await axios.get('/api/orders/myorders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      const { data } = await axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddresses(data.addresses || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load addresses');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      await axios.put('/api/auth/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshUser(); 
      toast.success('Profile updated successfully');
      setEditMode(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      const { data } = await axios.post(
        '/api/auth/profile/addresses',
        addressForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAddresses(data);
      setShowAddressForm(false);
      resetAddressForm();
      toast.success('Address added successfully');
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const handleUpdateAddress = async (e) => {
    e.preventDefault();
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      const { data } = await axios.put(
        `/api/auth/profile/addresses/${editingAddress._id}`,
        addressForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAddresses(data);
      setShowAddressForm(false);
      setEditingAddress(null);
      resetAddressForm();
      toast.success('Address updated successfully');
    } catch (error) {
      toast.error('Failed to update address');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      const { data } = await axios.delete(
        `/api/auth/profile/addresses/${addressId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAddresses(data);
      toast.success('Address deleted successfully');
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      fullName: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'Pakistan',
      isDefault: false
    });
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm(address);
    setShowAddressForm(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
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

  return (
    <div className="pt-28 pb-20 min-h-screen bg-ivory dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="font-serif text-4xl font-bold mb-8 text-gray-900 dark:text-ivory">My Account</h1>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg sticky top-28">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gold/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <User size={40} className="text-gold" />
                </div>
                <h3 className="font-serif text-xl font-bold text-gray-900 dark:text-ivory">{user?.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-gold text-white' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-ivory'
                    }`}
                >
                  <User size={18} /> Profile
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-gold text-white' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-ivory'
                    }`}
                >
                  <Package size={18} /> Orders
                </button>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'addresses' ? 'bg-gold text-white' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-ivory'
                    }`}
                >
                  <MapPin size={18} /> Addresses
                </button>
                <button
                  onClick={() => navigate('/wishlist')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-ivory transition-colors"
                >
                  <Heart size={18} /> Wishlist ({wishlist.length})
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                >
                  <LogOut size={18} /> Logout
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-ivory">Profile Information</h2>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-full hover:bg-yellow-600 transition-colors"
                  >
                    <Edit size={16} />
                    {editMode ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {!editMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Full Name</label>
                      <p className="font-semibold text-gray-900 dark:text-ivory">{user?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Email</label>
                      <p className="font-semibold text-gray-900 dark:text-ivory">{user?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Phone</label>
                      <p className="font-semibold text-gray-900 dark:text-ivory">{user?.phone || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Account Type</label>
                      <p className="font-semibold text-gray-900 dark:text-ivory capitalize">{user?.role}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Full Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Email</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Phone</label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">
                        New Password (leave blank to keep current)
                      </label>
                      <PasswordInput
                        value={profileData.password}
                        onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                        placeholder="Enter new password"
                        className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gold text-white py-3 rounded-full font-semibold hover:bg-yellow-600 transition-colors"
                    >
                      Save Changes
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6 gap-3">
                  <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-ivory">My Orders</h2>
                  <button
                    onClick={() => navigate('/track-order')}
                    className="text-sm text-gold font-medium hover:underline"
                  >
                    Track by Order Number
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-10">Loading...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10">
                    <Package size={60} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map(order => {
                      const expanded = expandedOrderId === order._id;
                      return (
                        <div key={order._id} className="border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                            <div>
                              <p className="font-bold text-gray-900 dark:text-ivory">Order #{order.orderNumber}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(order.createdAt).toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Payment: {order.paymentMethod} • {order.paymentStatus}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.orderStatus)}`}>
                                {order.orderStatus}
                              </span>
                              <button
                                onClick={() => setExpandedOrderId(expanded ? null : order._id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 dark:border-zinc-700 text-sm text-gray-700 dark:text-gray-200 hover:border-gold hover:text-gold transition-colors"
                              >
                                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Details
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-200 dark:border-zinc-800">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {(order.orderItems || []).length} item(s)
                            </p>
                            <p className="font-bold text-gold">PKR {Number(order.totalPrice || 0).toLocaleString()}</p>
                          </div>

                          {expanded && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800 space-y-4">
                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-ivory mb-1">Shipping Address</p>
                                  <p className="text-gray-600 dark:text-gray-400">{order.shippingAddress?.fullName}</p>
                                  <p className="text-gray-600 dark:text-gray-400">{order.shippingAddress?.phone}</p>
                                  <p className="text-gray-600 dark:text-gray-400">{order.shippingAddress?.street}</p>
                                  <p className="text-gray-600 dark:text-gray-400">
                                    {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip || ''}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-ivory mb-1">Summary</p>
                                  <p className="text-gray-600 dark:text-gray-400">Items: PKR {Number(order.itemsPrice || 0).toLocaleString()}</p>
                                  <p className="text-gray-600 dark:text-gray-400">Shipping: {Number(order.shippingPrice || 0) === 0 ? 'FREE' : `PKR ${Number(order.shippingPrice || 0).toLocaleString()}`}</p>
                                  <p className="text-gray-600 dark:text-gray-400">Payment: {order.paymentStatus}</p>
                                  {order.paymentReceipt?.filePath && (
                                    <p className="text-gray-600 dark:text-gray-400">Receipt: {order.paymentReceipt?.verified ? 'Verified' : 'Uploaded (pending review)'}</p>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <p className="font-semibold text-gray-900 dark:text-ivory">Items</p>
                                {(order.orderItems || []).map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-3 text-sm bg-ivory/60 dark:bg-zinc-800/60 rounded-lg px-3 py-2">
                                    <div className="min-w-0">
                                      <p className="font-medium text-gray-900 dark:text-ivory truncate">{item.name}</p>
                                      <p className="text-gray-500 dark:text-gray-400">Qty: {item.quantity} {item.variant ? `• ${item.variant}` : ''}</p>
                                    </div>
                                    <p className="font-semibold text-gold whitespace-nowrap">PKR {(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-ivory">Saved Addresses</h2>
                  <button
                    onClick={() => {
                      setShowAddressForm(true);
                      setEditingAddress(null);
                      resetAddressForm();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-full hover:bg-yellow-600 transition-colors"
                  >
                    <Plus size={16} />
                    Add Address
                  </button>
                </div>

                {showAddressForm && (
                  <form onSubmit={editingAddress ? handleUpdateAddress : handleAddAddress} className="mb-6 p-4 bg-ivory dark:bg-zinc-800 rounded-xl">
                    <h3 className="font-semibold mb-4 text-gray-900 dark:text-ivory">
                      {editingAddress ? 'Edit Address' : 'New Address'}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={addressForm.fullName}
                        onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                        required
                        className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                        required
                        className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      />
                      <input
                        type="text"
                        placeholder="Street Address"
                        value={addressForm.street}
                        onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                        required
                        className="md:col-span-2 px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      />
                      <input
                        type="text"
                        placeholder="City"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        required
                        className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      />
                      <input
                        type="text"
                        placeholder="State/Province"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        required
                        className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      />
                      <input
                        type="text"
                        placeholder="ZIP Code"
                        value={addressForm.zip}
                        onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })}
                        className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      />
                      <input
                        type="text"
                        placeholder="Country"
                        value={addressForm.country}
                        onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                        className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-gold text-white py-2 rounded-full font-semibold hover:bg-yellow-600 transition-colors"
                      >
                        {editingAddress ? 'Update' : 'Add'} Address
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddress(null);
                          resetAddressForm();
                        }}
                        className="flex-1 bg-gray-300 dark:bg-zinc-700 text-gray-900 dark:text-ivory py-2 rounded-full font-semibold hover:bg-gray-400 dark:hover:bg-zinc-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 ? (
                  <div className="text-center py-10">
                    <MapPin size={60} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No saved addresses</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {addresses.map(addr => (
                      <div key={addr._id} className="border border-gray-200 dark:border-zinc-800 rounded-xl p-4 relative">
                        {addr.isDefault && (
                          <span className="absolute top-2 right-2 px-2 py-1 bg-gold text-white text-xs rounded-full">
                            Default
                          </span>
                        )}
                        <p className="font-semibold text-gray-900 dark:text-ivory mb-2">{addr.fullName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{addr.phone}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{addr.street}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {addr.city}, {addr.state} {addr.zip}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{addr.country}</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleEditAddress(addr)}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr._id)}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <ProductsStrip
          title="Recommended for You"
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