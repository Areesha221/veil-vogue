import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Gift, Minus, Plus, Search, ShoppingBag, Trash2, Sparkles, Wand2, RefreshCw, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { useCart } from '../context/CartContext';
import usePageMeta from '../hooks/usePageMeta';

const formatPKR = (n) => `PKR ${Math.round(Number(n) || 0).toLocaleString()}`;
const norm = (v = '') => String(v).toLowerCase().trim();

export default function HamperBuilder() {
  usePageMeta({
    title: 'Build Your Own Gift Hamper',
    description: 'Create a custom Veil & Vogue gift hamper by choosing your own products, quantities, and gift message.'
  });

  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vv-hamper-builder') || '[]');
    } catch {
      return [];
    }
  });
  const [giftMessage, setGiftMessage] = useState(() => localStorage.getItem('vv-gift-note') || '');
  const [suggestionOccasion, setSuggestionOccasion] = useState('all');
  const [suggestionBudget, setSuggestionBudget] = useState('any');
  const [suggestionSeed, setSuggestionSeed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE_URL}/api/products`);
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.products) ? data.products : []);
        if (!cancelled) setProducts(arr);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem('vv-hamper-builder', JSON.stringify(selected));
  }, [selected]);

  useEffect(() => {
    localStorage.setItem('vv-gift-note', giftMessage);
  }, [giftMessage]);

  const categories = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      const name = p?.category?.name || p?.category?.slug || p?.subcategory || 'Other';
      const key = norm(name) || 'other';
      if (!map.has(key)) map.set(key, { key, label: name });
    });
    return [{ key: 'all', label: 'All Products' }, ...Array.from(map.values())];
  }, [products]);

  const filtered = useMemo(() => {
    const q = norm(query);
    return products.filter((p) => {
      if (Number(p?.stock) <= 0) return false;
      const catName = norm(p?.category?.name || p?.category?.slug || p?.subcategory || '');
      if (category !== 'all' && catName !== norm(categories.find((c) => c.key === category)?.label || '')) return false;
      if (!q) return true;
      const hay = [p?.name, p?.description, p?.fabric, p?.material, p?.category?.name, ...(Array.isArray(p?.tags) ? p.tags : [])].filter(Boolean).map(norm).join(' ');
      return hay.includes(q) || q.split(/\s+/).every((t) => hay.includes(t));
    });
  }, [products, query, category, categories]);

  const selectedDetails = useMemo(() => {
    return selected
      .map((s) => {
        const product = products.find((p) => String(p._id) === String(s.id));
        if (!product) return null;
        return { ...s, product, lineTotal: (Number(product.price) || 0) * s.qty };
      })
      .filter(Boolean);
  }, [selected, products]);

  const total = selectedDetails.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = selectedDetails.reduce((sum, item) => sum + item.qty, 0);

  const addItem = (product) => {
    setSelected((prev) => {
      const idx = prev.findIndex((x) => String(x.id) === String(product._id));
      if (idx >= 0) {
        const copy = [...prev];
        const max = Math.max(1, Number(product.stock) || 99);
        copy[idx] = { ...copy[idx], qty: Math.min(copy[idx].qty + 1, max) };
        return copy;
      }
      return [...prev, { id: product._id, qty: 1 }];
    });
    toast.success(`${product.name} added to hamper`);
  };

  const updateQty = (id, delta) => {
    setSelected((prev) =>
      prev
        .map((x) => {
          if (String(x.id) !== String(id)) return x;
          const product = products.find((p) => String(p._id) === String(id));
          const max = Math.max(1, Number(product?.stock) || 99);
          return { ...x, qty: Math.max(0, Math.min(x.qty + delta, max)) };
        })
        .filter((x) => x.qty > 0)
    );
  };

  const removeItem = (id) => setSelected((prev) => prev.filter((x) => String(x.id) !== String(id)));

  const addHamperToCart = () => {
    if (selectedDetails.length === 0) {
      toast.error('Please select at least one product for your hamper');
      return;
    }
    selectedDetails.forEach(({ product, qty }) => addToCart(product, qty));
    toast.success('Custom hamper items added to cart');
  };

  const inStockProducts = useMemo(() => products.filter((p) => Number(p?.stock) > 0), [products]);

  const scoreForOccasion = (p, occasion) => {
    const hay = norm([p?.name, p?.description, p?.category?.name, p?.subcategory, p?.fabric, p?.material, ...(Array.isArray(p?.tags) ? p.tags : [])].filter(Boolean).join(' '));
    if (occasion === 'wedding' || occasion === 'eid') {
      if (/(wedding|bridal|formal|party|embroider|premium|luxury|silk|satin|nida|georgette|abaya)/.test(hay)) return 3;
    }
    if (occasion === 'everyday') {
      if (/(everyday|casual|daily|basic|jersey|chiffon|cap|scrunch)/.test(hay)) return 3;
    }
    if (occasion === 'accessories') {
      if (/(pin|cap|scrunch|hair|catcher|accessor)/.test(hay)) return 3;
    }
    if (occasion === 'hijab') {
      if (/(hijab|scarf|cap|pin)/.test(hay)) return 3;
    }
    if (occasion === 'abaya') {
      if (/(abaya)/.test(hay)) return 3;
    }
    return /(best seller|new|gift|hamper|set)/.test(hay) ? 2 : 1;
  };

  const aiSuggestions = useMemo(() => {
    if (!inStockProducts.length) return [];
    const budgetRanges = {
      any: [0, Infinity],
      under1500: [0, 1500],
      under3000: [0, 3000],
      under7000: [0, 7000],
      premium: [7000, Infinity]
    };
    const [minB, maxB] = budgetRanges[suggestionBudget] || budgetRanges.any;
    const pool = [...inStockProducts].sort((a, b) => {
      const sa = scoreForOccasion(a, suggestionOccasion) + Number(a?.isBestSeller ? 1 : 0) + Number(a?.sold || 0) / 100;
      const sb = scoreForOccasion(b, suggestionOccasion) + Number(b?.isBestSeller ? 1 : 0) + Number(b?.sold || 0) / 100;
      return sb - sa || Number(a?.price || 0) - Number(b?.price || 0);
    });

    const pickCombo = (predicate, maxItems, targetMax) => {
      const chosen = [];
      let sum = 0;
      for (const p of pool) {
        if (chosen.length >= maxItems) break;
        if (!predicate(p)) continue;
        if (chosen.some((x) => String(x._id) === String(p._id))) continue;
        const price = Number(p.price) || 0;
        if (chosen.length > 0 && sum + price > targetMax) continue;
        chosen.push(p);
        sum += price;
      }
      // fill if empty due to strict target
      if (chosen.length === 0) {
        for (const p of pool) {
          if (chosen.length >= maxItems) break;
          if (!predicate(p)) continue;
          if (!chosen.some((x) => String(x._id) === String(p._id))) chosen.push(p);
        }
      }
      return chosen.slice(0, maxItems);
    };

    const cat = (p) => norm(p?.category?.name || p?.category?.slug || p?.subcategory || '');
    const nameHay = (p) => norm([p?.name, p?.description, ...(Array.isArray(p?.tags) ? p.tags : [])].join(' '));
    const budgetCap = maxB === Infinity ? 20000 : maxB;
    const withinBudget = (items) => {
      const s = items.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
      return s >= minB && s <= (maxB === Infinity ? Infinity : maxB + 1500);
    };

    const templates = [
      {
        id: 'mix',
        title: 'Balanced Gift Hamper',
        reason: 'Mix of popular items for a complete gift.',
        items: pickCombo(() => true, 3, budgetCap),
        note: 'A thoughtful Veil & Vogue gift hamper selected for you.'
      },
      {
        id: 'hijab-set',
        title: 'Hijab Styling Hamper',
        reason: 'Hijab-focused combo with matching essentials.',
        items: pickCombo((p) => /(hijab|scarf|pin|cap|scrunch|hair|catcher)/.test(cat(p) + ' ' + nameHay(p)), 4, budgetCap),
        note: 'Hijab styling essentials hamper.'
      },
      {
        id: 'abaya-special',
        title: 'Abaya Special Hamper',
        reason: 'Abaya-centered selection for a premium gift.',
        items: pickCombo((p) => /(abaya)/.test(cat(p) + ' ' + nameHay(p)) || /(pin|scarf|hijab)/.test(cat(p) + ' ' + nameHay(p)), 3, Math.max(budgetCap, 15000)),
        note: 'Elegant abaya gift hamper.'
      },
      {
        id: 'accessory',
        title: 'Accessories Hamper',
        reason: 'Useful add-ons like pins, caps, scrunchies, and hair care.',
        items: pickCombo((p) => /(pin|cap|scrunch|hair|catcher|accessor)/.test(cat(p) + ' ' + nameHay(p)), 4, budgetCap),
        note: 'Accessory essentials gift hamper.'
      },
      {
        id: 'budget',
        title: suggestionBudget === 'premium' ? 'Premium Hamper Pick' : 'Budget-Friendly Hamper',
        reason: suggestionBudget === 'premium' ? 'Higher-value items for a special occasion.' : 'Great value combination within a smaller budget.',
        items: [...pool].filter((p) => {
          const price = Number(p.price) || 0;
          return suggestionBudget === 'premium' ? price >= 2000 : price <= Math.max(1500, budgetCap);
        }).slice(0, 3),
        note: 'Smart hamper suggestion based on your budget.'
      }
    ];

    let out = templates
      .map((t) => ({ ...t, items: (t.items || []).filter(Boolean).slice(0, 4) }))
      .filter((t) => t.items.length > 0)
      .map((t) => ({
        ...t,
        total: t.items.reduce((s, p) => s + (Number(p.price) || 0), 0),
        count: t.items.length
      }))
      .filter((t) => withinBudget(t.items) || suggestionBudget === 'any' || t.id === 'budget');

    // rotate suggestions a bit when user refreshes
    if (suggestionSeed % 2 === 1 && out.length > 1) out = [out[1], out[0], ...out.slice(2)];
    return out.slice(0, 4);
  }, [inStockProducts, suggestionOccasion, suggestionBudget, suggestionSeed]);

  const applySuggestion = (items, mode = 'replace', note = '') => {
    if (!items?.length) return;
    setSelected((prev) => {
      const base = mode === 'replace' ? [] : [...prev];
      items.forEach((p) => {
        const idx = base.findIndex((x) => String(x.id) === String(p._id));
        if (idx >= 0) base[idx] = { ...base[idx], qty: Math.min((base[idx].qty || 1) + 1, Math.max(1, Number(p.stock) || 99)) };
        else base.push({ id: p._id, qty: 1 });
      });
      return base;
    });
    if (note) setGiftMessage(note);
    toast.success(mode === 'replace' ? 'AI suggestion applied to your hamper' : 'Suggestion items added to your hamper');
  };

  return (
    <div className="min-h-screen bg-ivory dark:bg-zinc-950 pt-24 md:pt-28 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 rounded-3xl border border-gold/20 bg-gradient-to-r from-gold/10 via-white to-rose-50 dark:from-gold/10 dark:via-zinc-900 dark:to-zinc-900 p-6 md:p-8">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gold/20 text-gold flex items-center justify-center shrink-0">
              <Gift size={22} />
            </div>
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 dark:text-ivory">Build Your Own Gift Hamper</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-3xl">
                Apni marzi se products choose karein, quantities set karein, gift message add karein, aur apna custom hamper cart mein add karein. Guest checkout and order tracking supported.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200">Choose any in-stock products</span>
                <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200">Add gift note</span>
                <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200">Checkout as guest or registered user</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
          <div>
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 md:p-5 mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Wand2 size={18} className="text-gold" />
                    <h2 className="font-serif text-xl md:text-2xl font-bold text-gray-900 dark:text-ivory">AI Hamper Suggestions</h2>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Smart rule-based suggestions from available in-stock products. Pick a suggestion, then customize it however you want.</p>
                </div>
                <button
                  onClick={() => setSuggestionSeed((s) => s + 1)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 dark:border-zinc-700 text-sm text-gray-700 dark:text-gray-200 hover:border-gold hover:text-gold"
                >
                  <RefreshCw size={14} /> Refresh Suggestions
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <select
                  value={suggestionOccasion}
                  onChange={(e) => setSuggestionOccasion(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="all">Occasion: Any</option>
                  <option value="wedding">Wedding / Formal</option>
                  <option value="eid">Eid / Festive</option>
                  <option value="everyday">Everyday Essentials</option>
                  <option value="hijab">Hijab Styling</option>
                  <option value="abaya">Abaya Gift</option>
                  <option value="accessories">Accessories Mix</option>
                </select>
                <select
                  value={suggestionBudget}
                  onChange={(e) => setSuggestionBudget(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="any">Budget: Any</option>
                  <option value="under1500">Under PKR 1,500</option>
                  <option value="under3000">Under PKR 3,000</option>
                  <option value="under7000">Under PKR 7,000</option>
                  <option value="premium">Premium (PKR 7,000+)</option>
                </select>
              </div>

              {loading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading suggestions...</div>
              ) : aiSuggestions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 p-4 text-sm text-gray-500 dark:text-gray-400">
                  Not enough in-stock products available to generate suggestions right now. You can still build your own hamper below.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {aiSuggestions.map((sug) => (
                    <div key={sug.id} className="rounded-xl border border-gold/20 bg-gold/5 dark:bg-gold/10 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-ivory">{sug.title}</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{sug.reason}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-white/70 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gold font-semibold whitespace-nowrap">{formatPKR(sug.total)}</span>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-300">
                        {sug.items.map((p) => (
                          <li key={p._id} className="flex items-start gap-1.5">
                            <CheckCircle2 size={12} className="text-gold mt-0.5 shrink-0" />
                            <span className="line-clamp-1">{p.name} ({formatPKR(p.price)})</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => applySuggestion(sug.items, 'replace', sug.note)}
                          className="px-3 py-1.5 rounded-full bg-gold text-white text-xs font-semibold hover:opacity-90"
                        >
                          Apply Suggestion
                        </button>
                        <button
                          onClick={() => applySuggestion(sug.items, 'add', sug.note)}
                          className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-gray-700 dark:text-gray-200 hover:border-gold hover:text-gold"
                        >
                          Add to Current Hamper
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="grid md:grid-cols-[1fr_220px] gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products, fabrics, categories..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Showing in-stock products only. Select items to include in your custom hamper.</p>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 animate-pulse">
                    <div className="aspect-[4/5] rounded-xl bg-gray-200 dark:bg-zinc-800 mb-3" />
                    <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">No matching in-stock products found.</p>
                <Link to="/shop" className="inline-block mt-3 text-gold font-medium hover:underline">Browse shop</Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((p) => {
                  const selectedQty = selected.find((x) => String(x.id) === String(p._id))?.qty || 0;
                  const img = p?.images?.[0] || 'https://placehold.co/600x800/f5f0e8/d4af37?text=Veil+%26+Vogue';
                  return (
                    <div key={p._id} className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
                      <div className="aspect-[4/5] bg-gray-50 dark:bg-zinc-800 overflow-hidden">
                        <img src={img} alt={p.name} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.target.src = 'https://placehold.co/600x800/f5f0e8/d4af37?text=Veil+%26+Vogue'; }} />
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{p?.category?.name || 'Product'}</p>
                        <h3 className="font-semibold text-gray-900 dark:text-ivory line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
                        <p className="text-gold font-bold mt-1">{formatPKR(p.price)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{p.fabric || p.material ? `Fabric: ${p.fabric || p.material}` : 'Fabric details on product page'}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <button onClick={() => addItem(p)} className="flex-1 px-3 py-2 rounded-full bg-gold text-white text-sm font-semibold hover:opacity-90 transition">
                            {selectedQty ? `Add More (${selectedQty})` : 'Add to Hamper'}
                          </button>
                          <Link to={`/product/${p._id}`} className="px-3 py-2 rounded-full border border-gray-200 dark:border-zinc-700 text-xs font-medium text-gray-700 dark:text-gray-200 hover:border-gold hover:text-gold">View</Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-28 space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 md:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl font-bold text-gray-900 dark:text-ivory">Your Hamper</h2>
                <span className="text-xs px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
              </div>

              {selectedDetails.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 p-4 text-sm text-gray-500 dark:text-gray-400">
                  No items selected yet. Add products from the list to build your custom hamper.
                </div>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
                  {selectedDetails.map(({ product, qty, lineTotal }) => (
                    <div key={product._id} className="rounded-xl border border-gray-100 dark:border-zinc-800 p-3">
                      <div className="flex gap-3">
                        <img src={product?.images?.[0] || 'https://placehold.co/100x100/f5f0e8/d4af37?text=V'} alt={product.name} className="w-14 h-14 rounded-lg object-cover bg-gray-100 dark:bg-zinc-800" onError={(e) => { e.target.src = 'https://placehold.co/100x100/f5f0e8/d4af37?text=V'; }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-ivory line-clamp-2">{product.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatPKR(product.price)} each</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="inline-flex items-center border border-gray-200 dark:border-zinc-700 rounded-full overflow-hidden">
                              <button onClick={() => updateQty(product._id, -1)} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-zinc-800"><Minus size={14} /></button>
                              <span className="px-2 text-sm font-medium text-gray-900 dark:text-ivory min-w-[1.5rem] text-center">{qty}</span>
                              <button onClick={() => updateQty(product._id, 1)} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-zinc-800"><Plus size={14} /></button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gold">{formatPKR(lineTotal)}</span>
                              <button onClick={() => removeItem(product._id)} className="text-red-500 hover:text-red-600" aria-label="Remove item"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gift message / note (optional)</label>
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. With love on your special day..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Saved for checkout as your order/gift note.</p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Selected items</span><span>{itemCount}</span></div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Hamper subtotal</span><span>{formatPKR(total)}</span></div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Shipping</span><span>{total > 3000 ? 'FREE' : total > 0 ? formatPKR(200) : '-'}</span></div>
                <div className="flex justify-between font-bold text-base text-gray-900 dark:text-ivory"><span>Estimated total</span><span className="text-gold">{total > 0 ? formatPKR(total + (total > 3000 ? 0 : 200)) : formatPKR(0)}</span></div>
              </div>

              <div className="mt-4 space-y-2">
                <button onClick={addHamperToCart} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-gold text-white font-semibold hover:opacity-90 transition">
                  <ShoppingBag size={16} /> Add Hamper Items to Cart
                </button>
                <Link to="/cart" className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-ivory font-medium hover:border-gold hover:text-gold transition">
                  Go to Cart
                </Link>
                <Link to="/shop/gift-hampers" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-gold hover:underline">
                  <Sparkles size={14} /> Browse gift hamper ideas
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium text-gray-900 dark:text-ivory mb-1">How it works</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Select any combination of in-stock products.</li>
                <li>Set quantities for each item.</li>
                <li>Add an optional gift message for checkout.</li>
                <li>Add all selected items to cart and checkout (guest or registered).</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
