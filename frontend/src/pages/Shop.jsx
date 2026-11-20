import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { SlidersHorizontal, X } from 'lucide-react';
import { API_BASE_URL } from '../config';
import ProductCard from '../components/shop/ProductCard';
import usePageMeta from '../hooks/usePageMeta';

const CATEGORY_TABS = [
  { name: 'All', slug: '' },
  { name: 'Hijabs', slug: 'hijabs' },
  { name: 'Abayas', slug: 'abayas' },
  { name: 'Hijab Pins', slug: 'pins' },
  { name: 'Scrunchies', slug: 'scrunchies' },
  { name: 'Hijab Caps', slug: 'caps' },
  { name: 'Hair Catchers', slug: 'hair-catchers' },
  { name: 'Gift Hampers', slug: 'gift-hampers' },
  { name: 'Accessories', slug: 'accessories' }
];

const PAGE_SIZE = 12;

const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const formatPKR = (n) => `PKR ${Math.round(n).toLocaleString()}`;
const normalize = (v = '') => String(v).toLowerCase().trim();

const Shop = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [minPrice, setMinPrice] = useState(toNumber(searchParams.get('min'), 0));
  const [maxPrice, setMaxPrice] = useState(toNumber(searchParams.get('max'), 0));
  const [priceInitialized, setPriceInitialized] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const categoryTitle = category
    ? category.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    : 'All Products';
  const isGiftHampersPage = normalize(category) === 'gift-hampers';
  const isAccessoriesPage = normalize(category) === 'accessories';

  usePageMeta({
    title: category ? `${categoryTitle} Collection` : 'Shop',
    description: category
      ? `Browse ${categoryTitle.toLowerCase()} at Veil & Vogue with images, prices, fabrics, and details.`
      : 'Shop hijabs, abayas, and modest fashion accessories at Veil & Vogue with filters, prices, and product details.'
  });

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await axios.get(`${API_BASE_URL}/api/products`);
        if (!cancelled) setProducts(Array.isArray(data) ? data : (Array.isArray(data?.products) ? data.products : []));
      } catch (err) {
        console.error('Error fetching products:', err);
        if (!cancelled) {
          setError('Products could not be loaded right now. Please try again shortly.');
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const priceBounds = useMemo(() => {
    if (!products.length) return { min: 0, max: 0 };
    const prices = products.map((p) => toNumber(p?.price, 0)).filter((n) => n >= 0);
    return {
      min: Math.floor(Math.min(...prices, 0)),
      max: Math.ceil(Math.max(...prices, 0))
    };
  }, [products]);

  useEffect(() => {
    if (!products.length) return;
    if (priceInitialized) return;
    const urlMin = searchParams.get('min');
    const urlMax = searchParams.get('max');
    const nextMin = urlMin != null ? Math.max(priceBounds.min, Math.min(toNumber(urlMin, priceBounds.min), priceBounds.max)) : priceBounds.min;
    const nextMax = urlMax != null ? Math.max(priceBounds.min, Math.min(toNumber(urlMax, priceBounds.max), priceBounds.max)) : priceBounds.max;
    setMinPrice(Math.min(nextMin, nextMax));
    setMaxPrice(Math.max(nextMin, nextMax));
    setPriceInitialized(true);
  }, [products.length, priceBounds.min, priceBounds.max, priceInitialized, searchParams]);

  useEffect(() => {
    if (!priceInitialized) return;
    const params = new URLSearchParams(searchParams);
    if (sort && sort !== 'newest') params.set('sort', sort); else params.delete('sort');
    if (minPrice > priceBounds.min) params.set('min', String(minPrice)); else params.delete('min');
    if (maxPrice < priceBounds.max) params.set('max', String(maxPrice)); else params.delete('max');
    setSearchParams(params, { replace: true });
  }, [sort, minPrice, maxPrice, priceInitialized, priceBounds.min, priceBounds.max]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [category, sort, minPrice, maxPrice]);

  const filteredProducts = useMemo(() => {
    const selected = normalize(category || '');
    let list = [...products];

    if (selected) {
      const accessoryGroup = new Set(['accessories', 'pins', 'scrunchies', 'caps', 'hair-catchers', 'hijab-pins', 'hijab-caps', 'hair catchers']);
      list = list.filter((p) => {
        const catName = normalize(p?.category?.name);
        const catSlug = normalize(p?.category?.slug);
        const sub = normalize(p?.subcategory);
        const name = normalize(p?.name);
        const tags = Array.isArray(p?.tags) ? p.tags.map(normalize) : [];
        const hay = [catName, catSlug, sub, name, ...tags].filter(Boolean);

        if (selected === 'accessories') {
          return hay.some((v) =>
            accessoryGroup.has(v) ||
            v.includes('accessor') ||
            v.includes('pin') ||
            v.includes('scrunch') ||
            v.includes('cap') ||
            v.includes('hair catcher') ||
            v.includes('hair-catcher')
          );
        }

        if (selected === 'gift-hampers' || selected === 'gift hampers' || selected === 'hampers') {
          return hay.some((v) =>
            v.includes('hamper') ||
            v.includes('gift') ||
            v.includes('bundle') ||
            v.includes('set')
          );
        }

        return hay.some((v) => v && (v === selected || v.includes(selected) || selected.includes(v)));
      });
    }

    list = list.filter((p) => {
      const price = toNumber(p?.price, 0);
      return price >= minPrice && price <= (maxPrice || priceBounds.max || price);
    });

    switch (sort) {
      case 'price_low':
        list.sort((a, b) => toNumber(a?.price) - toNumber(b?.price));
        break;
      case 'price_high':
        list.sort((a, b) => toNumber(b?.price) - toNumber(a?.price));
        break;
      case 'name':
        list.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        break;
      case 'rating':
        list.sort((a, b) => toNumber(b?.rating) - toNumber(a?.rating));
        break;
      case 'newest':
      default:
        list.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
        break;
    }

    return list;
  }, [products, category, minPrice, maxPrice, sort, priceBounds.max]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const clearFilters = () => {
    setSort('newest');
    setMinPrice(priceBounds.min);
    setMaxPrice(priceBounds.max);
  };

  const activeFilterCount =
    (sort !== 'newest' ? 1 : 0) +
    (priceInitialized && (minPrice > priceBounds.min || maxPrice < priceBounds.max) ? 1 : 0);

  return (
    <div className="min-h-screen bg-ivory dark:bg-zinc-950 pt-24 md:pt-28 lg:pt-32 pb-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6 md:mb-8 text-gray-900 dark:text-ivory px-2">
          {categoryTitle} Collection
        </h1>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-6 md:mb-8">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat.slug || 'all'}
              onClick={() => navigate(cat.slug ? `/shop/${cat.slug}` : '/shop')}
              className={`px-4 sm:px-5 md:px-8 py-2 sm:py-2.5 rounded-full font-semibold transition-all text-xs sm:text-sm md:text-base ${(category === cat.slug) || (!category && !cat.slug)
                ? 'bg-gold text-white shadow-lg scale-105'
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-ivory border border-gray-200 dark:border-zinc-700 hover:bg-gold hover:text-white hover:border-gold'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {(isGiftHampersPage || isAccessoriesPage) && (
          <div className="mb-6 md:mb-8 rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/10 via-white to-gold/5 dark:from-gold/10 dark:via-zinc-900 dark:to-zinc-900 p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-gray-900 dark:text-ivory">
                {isGiftHampersPage ? 'Build a Custom Gift Hamper' : 'Complete Your Look with Accessories'}
              </h2>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
                {isGiftHampersPage
                  ? 'Choose products of your own choice, add a gift note, and create a personalized hamper for someone special.'
                  : 'Explore hijab pins, caps, scrunchies, hair catchers, and more matching accessories in one place.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isGiftHampersPage && (
                <button
                  onClick={() => navigate('/build-hamper')}
                  className="px-5 py-2.5 rounded-full bg-gold text-white font-semibold hover:opacity-90 transition"
                >
                  Build Your Own Hamper
                </button>
              )}
              {isAccessoriesPage && (
                <button
                  onClick={() => navigate('/build-hamper')}
                  className="px-5 py-2.5 rounded-full bg-deep-black dark:bg-gold text-white font-semibold hover:opacity-90 transition"
                >
                  Create a Gift Hamper
                </button>
              )}
              <button
                onClick={() => navigate('/shop')}
                className="px-5 py-2.5 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-ivory font-medium hover:border-gold hover:text-gold transition"
              >
                Browse All Products
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 md:mb-8 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {loading ? 'Loading products...' : `${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'} found`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-full border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-ivory hover:border-gold"
                >
                  <X size={14} /> Clear filters
                </button>
              )}
              <button
                onClick={() => setShowFilters((s) => !s)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-deep-black dark:bg-gold text-white font-medium"
              >
                <SlidersHorizontal size={16} />
                Filters {activeFilterCount ? `(${activeFilterCount})` : ''}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort by</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="newest">Newest</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="name">Name: A to Z</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Price range</label>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {formatPKR(minPrice)} - {formatPKR(maxPrice)}
                  </span>
                </div>

                {priceBounds.max > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Min</p>
                        <input
                          type="range"
                          min={priceBounds.min}
                          max={priceBounds.max}
                          step="1"
                          value={Math.min(minPrice, maxPrice)}
                          onChange={(e) => {
                            const v = toNumber(e.target.value, priceBounds.min);
                            setMinPrice(Math.min(v, maxPrice));
                          }}
                          className="w-full accent-gold"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Max</p>
                        <input
                          type="range"
                          min={priceBounds.min}
                          max={priceBounds.max}
                          step="1"
                          value={Math.max(maxPrice, minPrice)}
                          onChange={(e) => {
                            const v = toNumber(e.target.value, priceBounds.max);
                            setMaxPrice(Math.max(v, minPrice));
                          }}
                          className="w-full accent-gold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        value={minPrice}
                        min={priceBounds.min}
                        max={maxPrice}
                        onChange={(e) => {
                          const v = Math.max(priceBounds.min, Math.min(toNumber(e.target.value, priceBounds.min), maxPrice));
                          setMinPrice(v);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory"
                        placeholder="Min"
                      />
                      <input
                        type="number"
                        value={maxPrice}
                        min={minPrice}
                        max={priceBounds.max}
                        onChange={(e) => {
                          const v = Math.max(minPrice, Math.min(toNumber(e.target.value, priceBounds.max), priceBounds.max));
                          setMaxPrice(v);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory"
                        placeholder="Max"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No price data available.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8 px-2 sm:px-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse">
                <div className="aspect-[3/4] bg-gray-200 dark:bg-zinc-800" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 text-base sm:text-lg md:text-xl py-16 sm:py-20 px-4">
            {isGiftHampersPage
              ? 'No pre-made gift hamper products are listed right now, but you can create your own custom hamper.'
              : 'No products found for selected filters.'}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {isGiftHampersPage && (
                <button
                  onClick={() => navigate('/build-hamper')}
                  className="px-5 py-2.5 rounded-full bg-gold text-white font-medium hover:opacity-90"
                >
                  Build Your Own Hamper
                </button>
              )}
              <button
                onClick={clearFilters}
                className="px-5 py-2.5 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-ivory font-medium hover:border-gold"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8 px-2 sm:px-0">
              {visibleProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {visibleProducts.length} of {filteredProducts.length} products
              </p>
              {hasMore && (
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="px-6 py-2.5 rounded-full bg-deep-black dark:bg-gold text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  Load More
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Shop;
