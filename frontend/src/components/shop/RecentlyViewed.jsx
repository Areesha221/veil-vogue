import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3 } from 'lucide-react';

const formatPKR = (n) => `PKR ${Math.round(Number(n) || 0).toLocaleString()}`;

export default function RecentlyViewed({ excludeId = '', limit = 4, title = 'Recently Viewed', subtitle = 'Products you looked at recently' }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('vv-recently-viewed') || '[]');
      const arr = Array.isArray(raw) ? raw : [];
      const filtered = arr
        .filter((x) => x && x._id && String(x._id) !== String(excludeId))
        .slice(0, limit);
      setItems(filtered);
    } catch {
      setItems([]);
    }
  }, [excludeId, limit]);

  if (!items.length) return null;

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2 mb-2">
        <Clock3 size={18} className="text-gold" />
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 dark:text-ivory">{title}</h2>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{subtitle}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((p) => (
          <Link key={p._id} to={`/product/${p._id}`} className="group rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-[4/5] bg-gray-50 dark:bg-zinc-800 overflow-hidden">
              <img src={p?.images?.[0] || 'https://placehold.co/500x650/f5f0e8/d4af37?text=Veil+%26+Vogue'} alt={p.name || 'Product'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onError={(e) => { e.target.src = 'https://placehold.co/500x650/f5f0e8/d4af37?text=Veil+%26+Vogue'; }} />
            </div>
            <div className="p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{p?.category?.name || 'Veil & Vogue'}</p>
              <h3 className="text-sm font-medium text-gray-900 dark:text-ivory line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
              <p className="text-gold font-semibold mt-1 text-sm">{formatPKR(p.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
