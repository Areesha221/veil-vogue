import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import ProductCard from './ProductCard';

const norm = (v = '') => String(v).toLowerCase().trim();

export default function ProductsStrip({
  title = 'Explore Products',
  subtitle = 'Discover more from Veil & Vogue',
  limit = 4,
  filter = null, // function(product) => boolean
  category = '', // slug or name keyword e.g. 'abayas', 'hijabs'
  keywords = [], // string or array of keywords
  onlyBestSeller = false,
  onlyNew = false,
  onlyFeatured = false,
  sortBy = 'default', // default | newest | sold | price_low | price_high | rating
  viewAllTo = '/shop',
  excludeId = '',
  className = ''
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const keywordList = useMemo(() => {
    if (Array.isArray(keywords)) return keywords.map(norm).filter(Boolean);
    if (typeof keywords === 'string' && keywords.trim()) return [norm(keywords)];
    return [];
  }, [keywords]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE_URL}/api/products`);
        const list = Array.isArray(data) ? data : (Array.isArray(data?.products) ? data.products : []);
        if (!cancelled) setProducts(list);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    const catNeedle = norm(category);

    if (excludeId) {
      list = list.filter((p) => String(p?._id) !== String(excludeId));
    }

    if (catNeedle) {
      list = list.filter((p) => {
        const fields = [
          p?.category?.slug,
          p?.category?.name,
          p?.subcategory,
          ...(Array.isArray(p?.tags) ? p.tags : [])
        ].map(norm);
        return fields.some((f) => f && (f === catNeedle || f.includes(catNeedle) || catNeedle.includes(f)));
      });
    }

    if (keywordList.length) {
      list = list.filter((p) => {
        const hay = norm([
          p?.name,
          p?.description,
          p?.subcategory,
          p?.category?.name,
          p?.category?.slug,
          p?.fabric,
          p?.material,
          ...(Array.isArray(p?.tags) ? p.tags : [])
        ].filter(Boolean).join(' '));
        return keywordList.every((k) => hay.includes(k));
      });
    }

    if (onlyBestSeller) list = list.filter((p) => p?.isBestSeller || Number(p?.sold || 0) > 0);
    if (onlyNew) list = list.filter((p) => p?.isNewArrival);
    if (onlyFeatured) list = list.filter((p) => p?.isFeatured);
    if (typeof filter === 'function') list = list.filter(filter);

    switch (sortBy) {
      case 'sold':
        list.sort((a, b) => (Number(b?.sold || 0) - Number(a?.sold || 0)) || (Number(b?.rating || 0) - Number(a?.rating || 0)));
        break;
      case 'price_low':
        list.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
        break;
      case 'price_high':
        list.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
        break;
      case 'rating':
        list.sort((a, b) => Number(b?.rating || 0) - Number(a?.rating || 0));
        break;
      case 'newest':
        list.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
        break;
      default:
        break;
    }

    return list.slice(0, limit);
  }, [products, category, keywordList, onlyBestSeller, onlyNew, onlyFeatured, sortBy, limit, excludeId]); // filter excluded intentionally

  if (!loading && filtered.length === 0) return null;

  return (
    <section className={`mt-14 md:mt-16 ${className}`}>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 dark:text-ivory">{title}</h2>
          {subtitle && <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <Link to={viewAllTo} className="text-gold font-semibold hover:underline shrink-0">View All</Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: Math.min(limit, 4) }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse">
              <div className="aspect-[3/4] bg-gray-200 dark:bg-zinc-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filtered.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

