import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Search, Star, Trash2, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const getToken = () => localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token') || '';

export default function AdminReviews() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('all');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, sort, rating]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!user || user.role !== 'admin') return;
      setPage(1);
      fetchReviews(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchReviews = async (targetPage = page) => {
    try {
      if (!refreshing) setLoading(true);
      const token = getToken();
      const params = {
        page: targetPage,
        limit: 20,
        sort,
      };
      if (search.trim()) params.search = search.trim();
      if (rating !== 'all') params.rating = rating;
      const { data } = await axios.get('/api/admin/reviews', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const rows = Array.isArray(data) ? data : (data?.items || []);
      setItems(rows);
      setPagination(data?.pagination || { page: targetPage, totalPages: 1, total: rows.length, limit: 20 });
    } catch (error) {
      console.error('Fetch reviews error:', error);
      toast.error(error?.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (review) => {
    if (!review?.productId || !review?.reviewId) return;
    const ok = window.confirm(`Delete this review by "${review.name || 'reviewer'}" from "${review.productName || 'product'}"?`);
    if (!ok) return;
    try {
      const token = getToken();
      await axios.delete(`/api/admin/reviews/${review.productId}/${review.reviewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Review deleted');
      fetchReviews();
    } catch (error) {
      console.error('Delete review error:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete review');
    }
  };

  const handleExport = async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams({ export: 'csv', sort });
      if (search.trim()) params.set('search', search.trim());
      if (rating !== 'all') params.set('rating', rating);
      const res = await axios.get(`/api/admin/reviews?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reviews-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Reviews exported');
    } catch (error) {
      console.error('Export reviews error:', error);
      toast.error(error?.response?.data?.message || 'Failed to export reviews');
    }
  };

  const avgRating = useMemo(() => {
    if (!items.length) return 0;
    const sum = items.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return (sum / items.length).toFixed(1);
  }, [items]);

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 dark:text-ivory">Review Moderation</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {pagination.total || 0} reviews â€¢ Page avg rating: {avgRating}/5
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExport} className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-2">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={() => { setRefreshing(true); fetchReviews(); }} className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-2">
              <RefreshCw size={16} /> Refresh
            </button>
            <button onClick={() => navigate('/admin')} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-ivory hover:bg-gray-300 dark:hover:bg-zinc-700 flex items-center gap-2">
              <ArrowLeft size={16} /> Dashboard
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-lg mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product, reviewer, or comment..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <select value={rating} onChange={(e) => { setPage(1); setRating(e.target.value); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory">
            <option value="all">All ratings</option>
            {[5,4,3,2,1].map((r) => <option key={r} value={r}>{r} stars</option>)}
          </select>
          <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory">
            <option value="-createdAt">Newest first</option>
            <option value="createdAt">Oldest first</option>
          </select>
        </div>

        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-10 text-center shadow-lg text-gray-600 dark:text-gray-400">
              No reviews found for the selected filters.
            </div>
          ) : items.map((review) => (
            <div key={`${review.productId}-${review.reviewId}`} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="w-full sm:w-20 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 flex-shrink-0">
                  {review.productImage ? (
                    <img src={review.productImage} alt={review.productName || 'Product'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No image</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-ivory break-words">{review.productName || 'Unknown Product'}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        By <span className="font-medium">{review.name || 'Anonymous'}</span>
                        {review.user ? ' (registered user)' : ' (guest)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-semibold">
                        <Star size={14} className="fill-current" /> {Number(review.rating || 0).toFixed(1)}
                      </div>
                      <button
                        onClick={() => handleDelete(review)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete review"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{review.comment || 'â€”'}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Created: {review.createdAt ? new Date(review.createdAt).toLocaleString() : 'N/A'}</span>
                    <span>Product ID: {String(review.productId || '').slice(-8)}</span>
                    <span>Review ID: {String(review.reviewId || '').slice(-8)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Page {pagination.page || 1} of {pagination.totalPages || 1} â€¢ Total {pagination.total || 0}
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
      </div>
    </div>
  );
}
