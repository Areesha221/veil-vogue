import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/shop/ProductCard';
import { Search as SearchIcon, Filter } from 'lucide-react';
import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || '');
  const [inputValue, setInputValue] = useState(query);

  usePageMeta({
    title: query ? `Search: ${query}` : 'Search Products',
    description: query
      ? `Search results for "${query}" on Veil & Vogue, including products, prices, and categories.`
      : 'Search hijabs, abayas, fabrics, prices, and accessories on Veil & Vogue.'
  });

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (sortBy) params.set('sort', sortBy); else params.delete('sort');
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  useEffect(() => {
    if (!query) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let url = `/api/products/search?q=${encodeURIComponent(query)}`;
        if (sortBy) url += `&sort=${encodeURIComponent(sortBy)}`;
        const { data } = await axios.get(url);
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Search error:', error);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProducts();
    return () => { cancelled = true; };
  }, [query, sortBy]);

  const suggestions = useMemo(() => {
    if (!query) return ['abayas', 'hijab', 'wedding abaya', 'chiffon hijab', 'best seller abaya'];
    return [];
  }, [query]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = inputValue.trim();
    const params = new URLSearchParams(searchParams);
    if (q) params.set('q', q); else params.delete('q');
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-ivory dark:bg-zinc-950 pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <SearchIcon size={32} className="text-gold" />
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 dark:text-ivory">
              Search Products
            </h1>
          </div>

          <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl shadow space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search by name, fabric, category, price intent..."
                className="flex-1 px-4 py-3 rounded-xl bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gold text-white font-semibold hover:bg-yellow-600 transition-colors"
              >
                Search
              </button>
            </form>

            {query ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Showing results for "<span className="font-semibold text-gold">{query}</span>"
                  {!loading && products.length > 0 && (
                    <span className="ml-2 text-sm">({products.length} products found)</span>
                  )}
                </p>

                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-gray-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-sm"
                  >
                    <option value="">Sort By</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                    <option value="rating">Top Rated</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Try searching for:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSearchParams({ q: s })}
                      className="px-3 py-1.5 rounded-full border border-gold/30 text-gold hover:bg-gold hover:text-white transition-colors text-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        )}

        {!loading && query && products.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto mb-6 flex items-center justify-center">
              <SearchIcon size={48} className="text-gray-400" />
            </div>
            <h2 className="font-serif text-2xl font-bold mb-3 text-gray-900 dark:text-ivory">
              No products found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We couldn't find any products matching "{query}". Try a category name, fabric, or product keyword.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/shop" className="inline-block bg-gold text-white px-6 py-3 rounded-full font-semibold hover:bg-yellow-600 transition-colors">
                Browse All Products
              </Link>
              <Link to="/shop/abayas" className="inline-block border border-gold text-gold px-6 py-3 rounded-full font-semibold hover:bg-gold hover:text-white transition-colors">
                Browse Abayas
              </Link>
            </div>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

        <ProductsStrip
          title="More Products to Explore"
          subtitle="Best sellers and popular picks"
          onlyBestSeller
          sortBy="sold"
          limit={4}
          viewAllTo="/shop"
        />
      </div>
    </div>
  );
}
