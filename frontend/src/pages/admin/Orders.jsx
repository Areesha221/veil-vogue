import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Eye, ArrowLeft, Upload, Search, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const getToken = () => localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token') || '';

export default function AdminOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter, paymentFilter, sort, page]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!user || user.role !== 'admin') return;
      setPage(1);
      fetchOrders(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchOrders = async (targetPage = page) => {
    try {
      if (!refreshing) setLoading(true);
      const token = getToken();
      const params = { page: targetPage, limit: 20, sort };
      if (filter !== 'all') params.status = filter;
      if (paymentFilter !== 'all') params.paymentMethod = paymentFilter;
      if (search.trim()) params.search = search.trim();
      const { data } = await axios.get('/api/admin/orders', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const rows = Array.isArray(data) ? data : (data?.items || []);
      setOrders(rows);
      setPagination(data?.pagination || { page: targetPage, totalPages: 1, total: rows.length, limit: 20 });
    } catch (error) {
      console.error('Fetch orders error:', error);
      toast.error(error?.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = getToken();
      await axios.put(`/api/admin/orders/${orderId}`, { orderStatus: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update order');
    }
  };

  const handleExport = async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams({ export: 'csv', sort });
      if (filter !== 'all') params.set('status', filter);
      if (paymentFilter !== 'all') params.set('paymentMethod', paymentFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await axios.get(`/api/admin/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Orders exported');
    } catch (error) {
      console.error('Export orders error:', error);
      toast.error(error?.response?.data?.message || 'Failed to export orders');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      SHIPPED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCustomerName = (order) => order.shippingAddress?.fullName || order.guestInfo?.name || order.user?.name || 'Guest';
  const getCustomerContact = (order) => order.user?.email || order.guestInfo?.email || order.shippingAddress?.phone || order.guestInfo?.phone || 'Guest order';

  const totalsOnPage = useMemo(() => {
    return orders.reduce((acc, o) => acc + Number(o.totalPrice || 0), 0);
  }, [orders]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory dark:bg-zinc-950">
        <div className="text-2xl font-serif dark:text-ivory">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 dark:text-ivory mb-2">Order Management</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {pagination.total || 0} orders â€¢ Page revenue: PKR {totalsOnPage.toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleExport} className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-2">
                <Download size={16} /> Export CSV
              </button>
              <button onClick={() => { setRefreshing(true); fetchOrders(); }} className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-2">
                <RefreshCw size={16} /> Refresh
              </button>
              <button onClick={() => navigate('/admin')} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-ivory hover:bg-gray-300 dark:hover:bg-zinc-700 flex items-center gap-2">
                <ArrowLeft size={16} /> Dashboard
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
            <div className="lg:col-span-2 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order #, customer, email, phone, city..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
            <select value={paymentFilter} onChange={(e) => { setPage(1); setPaymentFilter(e.target.value); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory">
              <option value="all">All payment methods</option>
              <option value="COD">COD</option>
              <option value="BANK_TRANSFER">BANK_TRANSFER</option>
              <option value="JAZZCASH">JAZZCASH</option>
              <option value="EASYPAISA">EASYPAISA</option>
              <option value="NAYAPAY">NAYAPAY</option>
            </select>
            <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory">
              <option value="-createdAt">Newest first</option>
              <option value="createdAt">Oldest first</option>
              <option value="-totalPrice">Highest total</option>
              <option value="totalPrice">Lowest total</option>
              <option value="orderNumber">Order # A-Z</option>
              <option value="-orderNumber">Order # Z-A</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            {['all', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
              <button
                key={status}
                onClick={() => { setPage(1); setFilter(status); }}
                className={`px-3 sm:px-6 py-2 rounded-full font-semibold transition-colors text-xs sm:text-sm ${
                  filter === status ? 'bg-gold text-white' : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-ivory hover:bg-gray-100 dark:hover:bg-zinc-700'
                }`}
              >
                {status === 'all' ? 'All Orders' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Order #</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Payment</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {orders.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-600 dark:text-gray-400">No orders found.</td></tr>
                ) : orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-ivory">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-ivory">{getCustomerName(order)}</p>
                      <p className="text-xs text-gray-500 break-all max-w-[220px]">{getCustomerContact(order)}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(order.isGuest || !order.user) && <span className="inline-flex px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs">Guest</span>}
                        {(order.notes || order.giftMessage) && <span className="inline-flex px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">Has notes</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4"><p className="text-sm text-gray-700 dark:text-ivory">{order.orderItems?.length || 0} items</p></td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gold">PKR {Number(order.totalPrice || 0).toLocaleString()}</p>
                      {Number(order.discountPrice || 0) > 0 && <p className="text-xs text-green-600 dark:text-green-400">- PKR {Number(order.discountPrice).toLocaleString()} discount</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 dark:text-ivory">{order.paymentMethod}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{order.paymentStatus || 'PENDING'}</p>
                      {order.paymentReceipt?.fileName && <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs"><Upload size={12} /> Receipt</span>}
                    </td>
                    <td className="px-6 py-4">
                      <select value={order.orderStatus} onChange={(e) => updateOrderStatus(order._id, e.target.value)} className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.orderStatus)}`}>
                        <option value="PENDING">PENDING</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => navigate(`/admin/orders/${order._id}`)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View Details"><Eye size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg text-center text-gray-600 dark:text-gray-400">No orders found.</div>
          ) : orders.map((order) => (
            <div key={order._id} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-lg">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-ivory">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <select value={order.orderStatus} onChange={(e) => updateOrderStatus(order._id, e.target.value)} className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.orderStatus)}`}>
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <div className="space-y-2 mb-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
                  <p className="font-medium text-gray-900 dark:text-ivory">{getCustomerName(order)}</p>
                  <p className="text-xs text-gray-500 break-all">{getCustomerContact(order)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-gray-500 dark:text-gray-400">Items</p><p className="text-gray-700 dark:text-ivory">{order.orderItems?.length || 0}</p></div>
                  <div><p className="text-xs text-gray-500 dark:text-gray-400">Total</p><p className="font-bold text-gold">PKR {Number(order.totalPrice || 0).toLocaleString()}</p></div>
                </div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Payment</p><p className="text-gray-700 dark:text-ivory">{order.paymentMethod} â€¢ {order.paymentStatus || 'PENDING'}</p></div>
              </div>
              <button onClick={() => navigate(`/admin/orders/${order._id}`)} className="w-full bg-blue-600 text-white py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm">
                <Eye size={16} /> View Details
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">Page {pagination.page || 1} of {pagination.totalPages || 1} â€¢ Total {pagination.total || 0}</p>
          <div className="flex items-center gap-2">
            <button disabled={(pagination.page || 1) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-ivory disabled:opacity-50">Previous</button>
            <button disabled={(pagination.page || 1) >= (pagination.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-ivory disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
