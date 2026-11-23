import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit, Trash2, ArrowLeft, X, Search, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const SUBCATEGORY_OPTIONS = {
  '': ['Select a category first'],
  'hijabs': ['Chiffon Hijabs', 'Jersey Hijabs', 'Crinkle Hijabs', 'Silk Hijabs', 'Premium Everyday', 'Luxury Occasion'],
  'abayas': ['Simple Abayas', 'Elegant Abayas', 'Open Abayas', 'Georgette Abayas', 'Wedding Style'],
  'accessories': ['Hijab Pins', 'Magnetic Pins', 'Decorative Pins', 'Safety Pins', 'Ball Pins'],
  'scrunchies': ['Satin Scrunchies', 'Silk Scrunchies', 'Everyday Scrunchies', 'Luxury Scrunchies'],
  'caps': ['Single Hijab Caps', '4-in-1 Hijab Caps', 'Cotton Caps', 'Lace Caps'],
  'hair-catchers': ['Flower Hair Catchers', 'Bow Hair Catchers', 'Pearl Hair Catchers', 'Trendy', 'Everyday', 'Premium'],
  'gift-hampers': ['Birthday Hampers', 'Eid Hampers', 'Bridal Hampers', 'Luxury Hampers', 'Self-Care', 'Personalized']
};

const getToken = () => localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token') || '';

export default function AdminProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [featuredFilter, setFeaturedFilter] = useState('all'); // all | true
  const [stockFilter, setStockFilter] = useState('all'); // all | true | false
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    compareAtPrice: '',
    category: '',
    categorySlug: '',
    subcategory: '',
    stock: '',
    images: [],
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: false
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchProducts();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, sort, featuredFilter, stockFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!user || user.role !== 'admin') return;
      setPage(1);
      fetchProducts(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchProducts = async (targetPage = page) => {
    try {
      if (!refreshing) setLoading(true);
      const token = getToken();
      const params = { page: targetPage, limit: 20, sort };
      if (search.trim()) params.search = search.trim();
      if (featuredFilter === 'true') params.featured = 'true';
      if (stockFilter !== 'all') params.inStock = stockFilter;
      const { data } = await axios.get('/api/admin/products', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const rows = Array.isArray(data) ? data : (data?.items || []);
      setProducts(rows);
      setPagination(data?.pagination || { page: targetPage, totalPages: 1, total: rows.length, limit: 20 });
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error(error?.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get('/api/categories');
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories');
      setCategories([
        { _id: 'hijabs', name: 'Hijabs', slug: 'hijabs' },
        { _id: 'abayas', name: 'Abayas', slug: 'abayas' },
        { _id: 'accessories', name: 'Accessories', slug: 'accessories' },
        { _id: 'scrunchies', name: 'Scrunchies', slug: 'scrunchies' },
        { _id: 'caps', name: 'Hijab Caps', slug: 'caps' },
        { _id: 'hair-catchers', name: 'Hair Catchers', slug: 'hair-catchers' },
        { _id: 'gift-hampers', name: 'Gift Hampers', slug: 'gift-hampers' }
      ]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'category') {
      const selectedCat = categories.find(c => c._id === value);
      const slug = selectedCat ? selectedCat.slug : '';
      setFormData(prev => ({
        ...prev,
        category: value,
        categorySlug: slug,
        subcategory: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const handleEdit = (product) => {
    let categoryValue = '';
    let categorySlugValue = '';

    if (product.category && typeof product.category === 'object') {
      categoryValue = product.category._id || '';
      categorySlugValue = product.category.slug || '';
    } else if (typeof product.category === 'string') {
      const foundCat = categories.find(c => c._id === product.category || c.slug === product.category);
      if (foundCat) {
        categoryValue = foundCat._id;
        categorySlugValue = foundCat.slug;
      }
    }

    if (!categorySlugValue && product.subcategory) {
      const sub = String(product.subcategory).toLowerCase();
      const foundCat = categories.find(c => c.slug === sub || c.name.toLowerCase().includes(sub.split(' ')[0]));
      if (foundCat) {
        categoryValue = foundCat._id;
        categorySlugValue = foundCat.slug;
      }
    }

    const safePrice = (product.price !== undefined && product.price !== null && !isNaN(product.price)) ? String(product.price) : '0';
    const safeStock = (product.stock !== undefined && product.stock !== null && !isNaN(product.stock)) ? String(product.stock) : '0';
    const safeCompareAtPrice = (product.compareAtPrice !== undefined && product.compareAtPrice !== null && !isNaN(product.compareAtPrice)) ? String(product.compareAtPrice) : '';

    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: safePrice,
      compareAtPrice: safeCompareAtPrice,
      category: categoryValue,
      categorySlug: categorySlugValue,
      subcategory: product.subcategory || '',
      stock: safeStock,
      images: product.images || [],
      isFeatured: !!product.isFeatured,
      isNewArrival: !!product.isNewArrival,
      isBestSeller: !!product.isBestSeller
    });

    setImagePreviews(product.images || []);
    setSelectedFiles([]);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      compareAtPrice: '',
      category: '',
      categorySlug: '',
      subcategory: '',
      stock: '',
      images: [],
      isFeatured: false,
      isNewArrival: false,
      isBestSeller: false
    });
    setSelectedFiles([]);
    setImagePreviews([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const rawPrice = String(formData.price || '').trim();
    const rawStock = String(formData.stock || '').trim();
    if (!rawPrice || isNaN(parseFloat(rawPrice))) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!rawStock || isNaN(parseInt(rawStock, 10))) {
      toast.error('Please enter a valid stock quantity');
      return;
    }

    const priceVal = parseFloat(rawPrice);
    const stockVal = parseInt(rawStock, 10);
    const compareAtPriceVal = formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : null;

    try {
      const token = getToken();
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';
      const method = editingProduct ? 'put' : 'post';
      const formDataObj = new FormData();

      formDataObj.append('name', String(formData.name || '').trim());
      formDataObj.append('description', String(formData.description || '').trim());
      formDataObj.append('price', String(priceVal));
      formDataObj.append('stock', String(stockVal));
      if (compareAtPriceVal !== null && !isNaN(compareAtPriceVal)) {
        formDataObj.append('compareAtPrice', String(compareAtPriceVal));
      } else {
        formDataObj.append('compareAtPrice', '');
      }
      formDataObj.append('subcategory', String(formData.subcategory || '').trim());
      formDataObj.append('isFeatured', formData.isFeatured ? 'true' : 'false');
      formDataObj.append('isNewArrival', formData.isNewArrival ? 'true' : 'false');
      formDataObj.append('isBestSeller', formData.isBestSeller ? 'true' : 'false');
      if (formData.category) formDataObj.append('category', formData.category);

      if (selectedFiles.length > 0) {
        selectedFiles.forEach(file => formDataObj.append('images', file));
      } else if (editingProduct && formData.images && formData.images.length > 0) {
        formDataObj.append('images', JSON.stringify(formData.images));
      }

      await axios[method](url, formDataObj, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts(1);
      setPage(1);
    } catch (error) {
      console.error('Product error:', error);
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const token = getToken();
      await axios.delete(`/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Product deleted successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Delete product error:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleExport = async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams({ export: 'csv', sort });
      if (search.trim()) params.set('search', search.trim());
      if (featuredFilter === 'true') params.set('featured', 'true');
      if (stockFilter !== 'all') params.set('inStock', stockFilter);
      const res = await axios.get(`/api/admin/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Products exported');
    } catch (error) {
      console.error('Export products error:', error);
      toast.error(error?.response?.data?.message || 'Failed to export products');
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    resetForm();
    setShowModal(true);
  };

  const getSubcategoryOptions = () => {
    if (!formData.categorySlug) return SUBCATEGORY_OPTIONS[''];
    return SUBCATEGORY_OPTIONS[formData.categorySlug] || SUBCATEGORY_OPTIONS[''];
  };

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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 dark:text-ivory">Manage Products</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Total: {pagination.total || 0} products</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory rounded-full hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors font-semibold">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={() => { setRefreshing(true); fetchProducts(); }} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory rounded-full hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors font-semibold">
              <RefreshCw size={16} /> Refresh
            </button>
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-ivory rounded-full hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors font-semibold">
              <ArrowLeft size={16} /> Dashboard
            </button>
            <button onClick={openAddModal} className="flex items-center gap-2 bg-gold text-white px-5 py-2.5 rounded-full font-semibold hover:bg-yellow-600 transition-colors">
              <Plus size={18} /> Add Product
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-lg mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, description, subcategory, tags..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <select value={stockFilter} onChange={(e) => { setPage(1); setStockFilter(e.target.value); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory">
            <option value="all">All stock states</option>
            <option value="true">In stock</option>
            <option value="false">Out of stock</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={featuredFilter} onChange={(e) => { setPage(1); setFeaturedFilter(e.target.value); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory">
              <option value="all">All products</option>
              <option value="true">Featured only</option>
            </select>
            <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory">
              <option value="-createdAt">Newest</option>
              <option value="createdAt">Oldest</option>
              <option value="name">Name A-Z</option>
              <option value="-price">Price high-low</option>
              <option value="price">Price low-high</option>
              <option value="stock">Stock low-high</option>
              <option value="-stock">Stock high-low</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {products.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-600 dark:text-gray-400">No products found.</td></tr>
                ) : products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={product.images?.[0] || 'https://via.placeholder.com/60'} alt={product.name} className="w-12 h-12 object-cover rounded-lg" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-ivory line-clamp-1">{product.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-sm text-gray-700 dark:text-ivory">{product.category?.name || product.subcategory || 'N/A'}</span></td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gold">PKR {Number(product.price || 0).toLocaleString()}</p>
                        {product.compareAtPrice ? <p className="text-xs text-gray-400 line-through">PKR {Number(product.compareAtPrice).toLocaleString()}</p> : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${Number(product.stock || 0) > 10 ? 'bg-green-100 text-green-800' : Number(product.stock || 0) > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {Number(product.stock || 0)} {Number(product.stock || 0) <= 5 && Number(product.stock || 0) > 0 && '(Low)'}{Number(product.stock || 0) === 0 && '(Out)'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {product.isFeatured && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Featured</span>}
                        {product.isNewArrival && <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">New</span>}
                        {product.isBestSeller && <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Best Seller</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Edit"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(product._id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">Page {pagination.page || 1} of {pagination.totalPages || 1} â€¢ Total {pagination.total || 0}</p>
          <div className="flex items-center gap-2">
            <button disabled={(pagination.page || 1) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-ivory disabled:opacity-50">Previous</button>
            <button disabled={(pagination.page || 1) >= (pagination.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-ivory disabled:opacity-50">Next</button>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 p-6 flex items-center justify-between z-10">
                <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-ivory">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={24} className="text-gray-700 dark:text-ivory" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Product Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g., Premium Chiffon Hijab" className="w-full px-4 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Description *</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} required rows="3" placeholder="Describe your product..." className="w-full px-4 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Price (PKR) *</label>
                    <input type="number" name="price" value={formData.price} onChange={handleInputChange} required min="0" step="0.01" placeholder="1200" className="w-full px-4 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Compare At Price</label>
                    <input type="number" name="compareAtPrice" value={formData.compareAtPrice} onChange={handleInputChange} min="0" step="0.01" placeholder="1500 (for discount)" className="w-full px-4 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Category *</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} required className="w-full px-4 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory">
                      <option value="">Select Category</option>
                      {categories.map(cat => (<option key={cat._id} value={cat._id}>{cat.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Subcategory *</label>
                    <select name="subcategory" value={formData.subcategory} onChange={handleInputChange} required disabled={!formData.category} className="w-full px-4 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory disabled:opacity-50 disabled:cursor-not-allowed">
                      <option value="">Select Subcategory</option>
                      {getSubcategoryOptions().map((sub, idx) => (<option key={idx} value={sub.toLowerCase().replace(/\s+/g, '-')}>{sub}</option>))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Stock Quantity *</label>
                  <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required min="0" placeholder="50" className="w-full px-4 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Product Images {editingProduct ? '(Leave empty to keep existing)' : '*'}</label>
                  <input type="file" multiple accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} className="w-full px-4 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold file:text-white hover:file:bg-yellow-600 cursor-pointer" />
                  {imagePreviews.length > 0 && (
                    <div className="flex gap-3 mt-3 flex-wrap">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img src={preview} alt={`Preview ${index + 1}`} className="w-20 h-20 object-cover rounded-lg border-2 border-gold" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleInputChange} className="w-4 h-4 text-gold rounded focus:ring-gold" /><span className="text-sm text-gray-700 dark:text-ivory">Featured</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="isNewArrival" checked={formData.isNewArrival} onChange={handleInputChange} className="w-4 h-4 text-gold rounded focus:ring-gold" /><span className="text-sm text-gray-700 dark:text-ivory">New Arrival</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="isBestSeller" checked={formData.isBestSeller} onChange={handleInputChange} className="w-4 h-4 text-gold rounded focus:ring-gold" /><span className="text-sm text-gray-700 dark:text-ivory">Best Seller</span></label>
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 px-6 py-3 border border-gray-300 dark:border-zinc-700 rounded-full font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-gray-700 dark:text-ivory">Cancel</button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-gold text-white rounded-full font-semibold hover:bg-yellow-600 transition-colors">{editingProduct ? 'Update Product' : 'Create Product'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
