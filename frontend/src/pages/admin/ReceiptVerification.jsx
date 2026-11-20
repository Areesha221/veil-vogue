import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Check, X, Eye, AlertCircle, ArrowLeft, Search, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const getToken = () => localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token') || '';

export default function ReceiptVerification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-uploadedAt');
  const [page, setPage] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [receiptBlobUrl, setReceiptBlobUrl] = useState('');
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchPendingReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, sort]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!user || user.role !== 'admin') return;
      setPage(1);
      fetchPendingReceipts(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    return () => {
      if (receiptBlobUrl) URL.revokeObjectURL(receiptBlobUrl);
    };
  }, [receiptBlobUrl]);

  const fetchPendingReceipts = async (targetPage = page) => {
    try {
      if (!refreshing) setLoading(true);
      const token = getToken();
      const params = { page: targetPage, limit: 20, sort };
      if (search.trim()) params.search = search.trim();
      const { data } = await axios.get('/api/admin/orders/receipts', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const rows = Array.isArray(data) ? data : (data?.items || []);
      setOrders(rows);
      setPagination(data?.pagination || { page: targetPage, totalPages: 1, total: rows.length, limit: 20 });
    } catch (error) {
      console.error('Fetch pending receipts error:', error);
      toast.error(error?.response?.data?.message || 'Failed to load receipts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchReceiptBlobUrl = async (order) => {
    if (!order?._id || !order?.paymentReceipt?.fileName) return '';
    try {
      setReceiptLoading(true);
      const token = getToken();
      const res = await axios.get(`/api/admin/orders/${order._id}/receipt-file`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(res.data);
      if (receiptBlobUrl) URL.revokeObjectURL(receiptBlobUrl);
      setReceiptBlobUrl(url);
      return url;
    } catch (error) {
      console.error('Receipt preview error:', error);
      toast.error(error?.response?.data?.message || 'Failed to load receipt preview');
      return '';
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleVerify = async (orderId, verified) => {
    try {
      setActionLoading(true);
      const token = getToken();
      await axios.put(
        `/api/admin/orders/${orderId}/verify-receipt`,
        { verified, adminNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(verified ? 'Receipt verified successfully!' : 'Receipt rejected');
      closeModal();
      fetchPendingReceipts();
    } catch (error) {
      console.error('Verify receipt error:', error);
      toast.error(error?.response?.data?.message || 'Failed to verify receipt');
    } finally {
      setActionLoading(false);
    }
  };

  const openVerificationModal = async (order) => {
    setSelectedOrder(order);
    setAdminNotes('');
    setShowModal(true);
    if (receiptBlobUrl) {
      URL.revokeObjectURL(receiptBlobUrl);
      setReceiptBlobUrl('');
    }
    await fetchReceiptBlobUrl(order);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
    setAdminNotes('');
    if (receiptBlobUrl) {
      URL.revokeObjectURL(receiptBlobUrl);
      setReceiptBlobUrl('');
    }
  };

  const handleDownloadReceipt = async () => {
    let url = receiptBlobUrl;
    if (!url && selectedOrder) url = await fetchReceiptBlobUrl(selectedOrder);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedOrder?.paymentReceipt?.fileName || `receipt-${selectedOrder?.orderNumber || 'order'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleExport = async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams({ export: 'csv', sort });
      if (search.trim()) params.set('search', search.trim());
      const res = await axios.get(`/api/admin/orders/receipts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pending-receipts-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Pending receipts exported');
    } catch (error) {
      console.error('Export receipts error:', error);
      toast.error(error?.response?.data?.message || 'Failed to export receipts');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory dark:bg-zinc-950">
        <div className="text-2xl font-serif dark:text-ivory">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory dark:bg-zinc-950 pt-28 md:pt-32 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 dark:text-ivory">Receipt Verification</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Pending receipts: {pagination.total || 0}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExport} className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-2">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={() => { setRefreshing(true); fetchPendingReceipts(); }} className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-2">
              <RefreshCw size={16} /> Refresh
            </button>
            <button onClick={() => navigate('/admin')} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-ivory hover:bg-gray-300 dark:hover:bg-zinc-700 flex items-center gap-2">
              <ArrowLeft size={16} /> Dashboard
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-lg mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, customer, email, payment method..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory">
            <option value="-uploadedAt">Newest uploads</option>
            <option value="uploadedAt">Oldest uploads</option>
            <option value="-totalPrice">Highest amount</option>
            <option value="totalPrice">Lowest amount</option>
          </select>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 text-center shadow-lg">
            <AlertCircle size={60} className="mx-auto text-gray-300 mb-4" />
            <h2 className="font-serif text-2xl font-bold mb-2 text-gray-900 dark:text-ivory">No Pending Receipts</h2>
            <p className="text-gray-600 dark:text-gray-400">All uploaded receipts are verified or there are no matching results.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Order #</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Receipt</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Uploaded</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 dark:text-ivory">{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">{order.paymentMethod}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900 dark:text-ivory">
                          {order.user?.name || order.guestInfo?.name || order.shippingAddress?.fullName || 'Guest'}
                        </p>
                        <p className="text-sm text-gray-500 break-all">{order.user?.email || order.guestInfo?.email || 'Guest order'}</p>
                        {(order.isGuest || !order.user) && (
                          <span className="inline-flex mt-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs">Guest</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gold">PKR {Number(order.totalPrice || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{order.paymentStatus || 'PENDING'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700 dark:text-ivory break-all max-w-[240px]">{order.paymentReceipt?.fileName || 'N/A'}</p>
                        <p className="text-xs text-gray-500">
                          {order.paymentReceipt?.fileSize ? `${(Number(order.paymentReceipt.fileSize) / 1024).toFixed(2)} KB` : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700 dark:text-ivory">
                          {order.paymentReceipt?.uploadedAt ? new Date(order.paymentReceipt.uploadedAt).toLocaleString() : 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openVerificationModal(order)}
                          className="flex items-center gap-2 bg-gold text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
                        >
                          <Eye size={16} />
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Page {pagination.page || 1} of {pagination.totalPages || 1} • Total {pagination.total || 0}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={(pagination.page || 1) <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-ivory disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-ivory disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {showModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 p-5 flex items-center justify-between z-10">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-ivory">Verify Receipt</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Order {selectedOrder.orderNumber}</p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                  <X size={22} />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Customer</p>
                    <p className="font-semibold text-gray-900 dark:text-ivory">{selectedOrder.user?.name || selectedOrder.guestInfo?.name || selectedOrder.shippingAddress?.fullName || 'Guest'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 break-all">{selectedOrder.user?.email || selectedOrder.guestInfo?.email || 'Guest order'}</p>
                    {(selectedOrder.isGuest || !selectedOrder.user) && <span className="inline-flex px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs">Guest</span>}
                  </div>
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                      <p className="font-bold text-gold">PKR {Number(selectedOrder.totalPrice || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Payment</p>
                      <p className="font-semibold text-gray-900 dark:text-ivory">{selectedOrder.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                      <p className="font-semibold text-gray-900 dark:text-ivory">{selectedOrder.paymentStatus || 'PENDING'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Uploaded</p>
                      <p className="font-semibold text-gray-900 dark:text-ivory text-sm">{selectedOrder.paymentReceipt?.uploadedAt ? new Date(selectedOrder.paymentReceipt.uploadedAt).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Receipt File</p>
                      <p className="font-medium text-gray-900 dark:text-ivory break-all">{selectedOrder.paymentReceipt?.fileName || 'N/A'}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Size: {selectedOrder.paymentReceipt?.fileSize ? `${(Number(selectedOrder.paymentReceipt.fileSize) / 1024).toFixed(2)} KB` : 'N/A'}
                        {selectedOrder.paymentReceipt?.fileType ? ` • ${selectedOrder.paymentReceipt.fileType}` : ''}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button onClick={handleDownloadReceipt} disabled={receiptLoading} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-ivory hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-60 flex items-center gap-2">
                          <Download size={16} /> {receiptLoading ? 'Loading...' : 'Download'}
                        </button>
                        <button onClick={() => fetchReceiptBlobUrl(selectedOrder)} disabled={receiptLoading} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-ivory hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-60 flex items-center gap-2">
                          <RefreshCw size={16} /> Reload Preview
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Admin Notes (optional, recommended for rejection)</label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={4}
                        placeholder="Add verification notes, rejection reason, or follow-up instructions..."
                        className="w-full px-4 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                      />
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => handleVerify(selectedOrder._id, false)}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
                      >
                        <X size={18} /> Reject Receipt
                      </button>
                      <button
                        onClick={() => handleVerify(selectedOrder._id, true)}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-600 transition-colors disabled:opacity-60"
                      >
                        <Check size={18} /> Verify & Approve
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-950 min-h-[420px] flex items-center justify-center p-3">
                    {receiptLoading && !receiptBlobUrl ? (
                      <p className="text-gray-600 dark:text-gray-300">Loading receipt preview...</p>
                    ) : receiptBlobUrl ? (
                      (selectedOrder.paymentReceipt?.fileType === 'application/pdf' || String(selectedOrder.paymentReceipt?.fileName || '').toLowerCase().endsWith('.pdf')) ? (
                        <iframe src={receiptBlobUrl} className="w-full h-[520px] bg-white rounded-lg" title="Receipt PDF" />
                      ) : (
                        <img src={receiptBlobUrl} alt="Payment receipt" className="max-w-full max-h-[520px] object-contain rounded-lg shadow" />
                      )
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 px-4">
                        <AlertCircle size={36} className="mx-auto mb-2 opacity-60" />
                        <p>Receipt preview unavailable. Try reloading or download the file.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
