import { useState, useEffect, useRef } from 'react';
import { Bot, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content:
    "Hello! I'm Veil & Vogue's website assistant. I can help with products, categories, prices, fabrics, best sellers, shipping, guest checkout, order tracking, returns, and contact information.",
  links: [
    { label: 'Shop All', to: '/shop' },
    { label: 'Abayas', to: '/shop/abayas' },
    { label: 'Hijabs', to: '/shop/hijabs' }
  ]
};

const QUICK_ACTIONS = [
  { label: 'Best seller abaya', query: 'Which abaya is your best seller?' },
  { label: 'Hijab prices', query: 'What are the prices of hijabs?' },
  { label: 'Abaya fabrics', query: 'What fabrics are available in abayas?' },
  { label: 'Guest checkout', query: 'Can I checkout without login?' },
  { label: 'Track order', query: 'How can I track my order?' }
];

const CATEGORY_ROUTE_MAP = [
  { keys: ['hijab cap', 'hijab caps', 'cap', 'caps'], to: '/shop/caps', label: 'Hijab Caps', slug: 'caps' },
  { keys: ['hijab pin', 'hijab pins', 'pin', 'pins'], to: '/shop/pins', label: 'Hijab Pins', slug: 'pins' },
  { keys: ['hair catcher', 'hair catchers'], to: '/shop/hair-catchers', label: 'Hair Catchers', slug: 'hair-catchers' },
  { keys: ['gift hamper', 'gift hampers', 'hamper', 'hampers'], to: '/shop/gift-hampers', label: 'Gift Hampers', slug: 'gift-hampers' },
  { keys: ['scrunchie', 'scrunchies'], to: '/shop/scrunchies', label: 'Scrunchies', slug: 'scrunchies' },
  { keys: ['accessory', 'accessories'], to: '/shop/accessories', label: 'Accessories', slug: 'accessories' },
  { keys: ['abaya', 'abayas'], to: '/shop/abayas', label: 'Abayas', slug: 'abayas' },
  { keys: ['hijab', 'hijabs'], to: '/shop/hijabs', label: 'Hijabs', slug: 'hijabs' }
];

const FABRIC_KEYWORDS = ['chiffon', 'georgette', 'jersey', 'satin', 'silk', 'cotton', 'lawn', 'linen', 'nida', 'crepe', 'organza', 'velvet', 'wool', 'polyester', 'viscose', 'rayon'];

const formatPKR = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'N/A';
  return `PKR ${n.toLocaleString()}`;
};

const normalize = (text = '') => String(text).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
const normalizeSlugish = (text = '') => normalize(text).replace(/-/g, ' ');
const includesAny = (text, words) => words.some((w) => text.includes(w));
const hasAnyWord = (text, words) => {
  const tokens = normalize(text).split(' ').filter(Boolean);
  const tokenSet = new Set(tokens);
  return words.some((w) => {
    const nw = normalize(w);
    if (!nw) return false;
    if (nw.includes(' ')) return normalize(text).includes(nw);
    return tokenSet.has(nw);
  });
};
const isGreeting = (text) => {
  const t = normalize(text);
  if (!t) return false;
  return /^(hi|hello|hey|salam|assalam|assalamu|aoa)(\s|$)/.test(t) ||
    /^(good morning|good afternoon|good evening)(\s|$)/.test(t);
};

const extractPriceLimit = (text = '') => {
  const lower = normalize(text);
  const m = lower.match(/(?:under|below|less than|upto|up to|max|maximum|within|kam se kam nahin|se kam|tak)\s*(?:pkr|rs|rupees)?\s*([\d,]+)/i) ||
            lower.match(/([\d,]+)\s*(?:se kam|tak|ke under|and under)/i);
  if (!m) return null;
  const n = Number(String(m[1]).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const extractMinPrice = (text = '') => {
  const lower = normalize(text);
  const m = lower.match(/(?:above|over|more than|min|minimum|from|se zyada|se upar)\s*(?:pkr|rs|rupees)?\s*([\d,]+)/i) ||
            lower.match(/([\d,]+)\s*(?:se zyada|se upar|ke upar)/i);
  if (!m) return null;
  const n = Number(String(m[1]).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const getCategoryName = (p) => p?.category?.name || p?.categoryName || '';
const getCategorySlug = (p) => p?.category?.slug || '';

const productSearchText = (p) => normalize([
  p?.name,
  p?.description,
  p?.subcategory,
  p?.fabric,
  p?.material,
  getCategoryName(p),
  getCategorySlug(p),
  ...(Array.isArray(p?.tags) ? p.tags : [])
].filter(Boolean).join(' '));

const inferFabric = (p) => {
  const direct = (p?.fabric || p?.material || '').trim();
  if (direct) return direct;
  const text = productSearchText(p);
  const found = FABRIC_KEYWORDS.filter((k) => text.includes(k));
  if (found.length) return found.map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join(', ');
  return '';
};

const uniqueLinks = (links = []) => {
  const seen = new Set();
  return links.filter((l) => {
    if (!l?.to) return false;
    const key = `${l.to}|${l.label || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const scoreProduct = (product, query, queryTokens) => {
  const text = productSearchText(product);
  const name = normalize(product?.name || '');
  let score = 0;
  if (!query) return 0;
  if (name.includes(query)) score += 14;
  if (text.includes(query)) score += 8;
  for (const token of queryTokens) {
    if (!token) continue;
    if (name.includes(token)) score += 6;
    else if (text.includes(token)) score += 2;
  }
  const intentBoosters = ['wedding', 'bridal', 'party', 'formal', 'casual', 'everyday', 'printed', 'plain', 'premium', 'elegant', ...FABRIC_KEYWORDS];
  for (const booster of intentBoosters) {
    if (query.includes(booster) && (name.includes(booster) || text.includes(booster))) score += 4;
  }
  if (product?.isBestSeller) score += 1;
  score += Math.min(Number(product?.sold || 0) / 20, 3);
  if (product?.isFeatured) score += 0.3;
  return score;
};

export default function AIAssistant() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [siteData, setSiteData] = useState({ categories: [], products: [], loaded: false, loading: false, error: '' });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const siteDataRef = useRef({ categories: [], products: [], loaded: false, loading: false, error: '' });

  useEffect(() => {
    siteDataRef.current = siteData;
  }, [siteData]);

  const loadSiteData = async (force = false) => {
    const current = siteDataRef.current;
    if (current.loading) return current;
    if (current.loaded && !force && current.products.length > 0) return current;

    const loadingState = { ...siteDataRef.current, loading: true, error: '' };
    siteDataRef.current = loadingState;
    setSiteData(loadingState);

    const bases = [API_BASE_URL, 'http://localhost:5000', 'http://127.0.0.1:5000', ''].filter((v, i, arr) => arr.indexOf(v) === i);

    const tryGet = async (path) => {
      let lastErr = null;
      for (const base of bases) {
        const url = base ? `${String(base).replace(/\/$/, '')}${path}` : path;
        try {
          const res = await axios.get(url, { timeout: 10000 });
          return res;
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr;
    };

    try {
      const [catRes, prodRes] = await Promise.allSettled([tryGet('/api/categories'), tryGet('/api/products')]);

      const categories = catRes.status === 'fulfilled' && Array.isArray(catRes.value?.data) ? catRes.value.data : [];
      const productsRaw = prodRes.status === 'fulfilled' ? prodRes.value?.data : [];
      const products = Array.isArray(productsRaw)
        ? productsRaw
        : Array.isArray(productsRaw?.products)
          ? productsRaw.products
          : Array.isArray(productsRaw?.data)
            ? productsRaw.data
            : Array.isArray(productsRaw?.items)
              ? productsRaw.items
              : [];

      const ok = products.length > 0 || categories.length > 0;
      const next = {
        categories,
        products,
        loaded: ok,
        loading: false,
        error: ok ? '' : 'Unable to load product data from the website right now.'
      };
      siteDataRef.current = next;
      setSiteData(next);
      return next;
    } catch (err) {
      const next = { categories: [], products: [], loaded: false, loading: false, error: 'Unable to load product data from the website right now.' };
      siteDataRef.current = next;
      setSiteData(next);
      return next;
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openAIAssistant', handleOpen);
    return () => window.removeEventListener('openAIAssistant', handleOpen);
  }, []);

  useEffect(() => {
    if (!isOpen || siteData.loaded || siteData.loading) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadSiteData(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const resetChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput('');
    setIsTyping(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetChat();
  };

  const findCategoryRoute = (query) => {
    const q = normalizeSlugish(query);
    for (const item of CATEGORY_ROUTE_MAP) {
      if (item.keys.some((k) => q.includes(normalizeSlugish(k)))) return item;
    }
    // fallback: try matching known category names/slugs from API data
    const byData = siteData.categories.find((c) => {
      const name = normalizeSlugish(c?.name || '');
      const slug = normalizeSlugish(c?.slug || '');
      return (name && q.includes(name)) || (slug && q.includes(slug));
    });
    if (byData) {
      const slug = String(byData.slug || '').toLowerCase();
      const mapped = CATEGORY_ROUTE_MAP.find((m) => m.slug === slug);
      if (mapped) return mapped;
      return {
        keys: [normalizeSlugish(byData.name || ''), normalizeSlugish(byData.slug || '')].filter(Boolean),
        to: `/shop/${byData.slug || ''}`.replace(/\/$/, ''),
        label: byData.name || 'Category',
        slug
      };
    }
    return null;
  };

  const productsInCategory = (catRoute, poolOverride = null) => {
    if (!catRoute) return [];
    const pool = poolOverride || siteDataRef.current.products || [];
    const routeKeys = (catRoute.keys || []).map((k) => normalizeSlugish(k)).filter(Boolean);
    const routeLabel = normalizeSlugish(catRoute.label || '');
    const routeSlug = normalizeSlugish(catRoute.slug || '');
    return pool.filter((p) => {
      const fields = [
        getCategoryName(p),
        getCategorySlug(p),
        p?.subcategory,
        p?.name,
        p?.description,
        ...(Array.isArray(p?.tags) ? p.tags : [])
      ].filter(Boolean).map((v) => normalizeSlugish(v));

      const hay = fields.join(' ');
      if (routeKeys.some((k) => hay.includes(k))) return true;
      if (routeLabel && hay.includes(routeLabel)) return true;
      if (routeSlug && hay.includes(routeSlug)) return true;
      const cName = normalizeSlugish(getCategoryName(p));
      const cSlug = normalizeSlugish(getCategorySlug(p));
      if (routeSlug && (cSlug === routeSlug || cName === routeLabel)) return true;
      if (routeLabel && cName && routeLabel.includes(cName)) return true;
      return false;
    });
  };

  const findProducts = (query, limit = 6, pool = null) => {
    const list = pool || siteDataRef.current.products || [];
    const q = normalize(query);
    if (!q) return [];
    const tokens = q.split(' ').filter((t) => t.length >= 2);
    return list
      .map((p) => ({ p, score: scoreProduct(p, q, tokens) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || Number(b.p?.sold || 0) - Number(a.p?.sold || 0) || Number(b.p?.rating || 0) - Number(a.p?.rating || 0))
      .slice(0, limit)
      .map((x) => x.p);
  };

  const formatProductLine = (p, options = {}) => {
    const { showFabric = false, showSold = false, compact = false } = options;
    const name = p?.name || 'Product';
    const price = formatPKR(p?.price);
    const cat = getCategoryName(p);
    const fabric = inferFabric(p);
    const stock = (typeof p?.stock === 'number') ? (p.stock > 0 ? `In stock (${p.stock})` : 'Out of stock') : null;
    const sold = Number(p?.sold || 0);

    if (compact) {
      const extras = [];
      if (showFabric) extras.push(`Fabric: ${fabric || 'Not specified'}`);
      if (showSold && sold > 0) extras.push(`Sold: ${sold}`);
      if (p?.isBestSeller) extras.push('Best seller');
      return `- ${name}: ${price}${extras.length ? ` (${extras.join(' • ')})` : ''}`;
    }

    const parts = [`- ${name}${cat ? ` [${cat}]` : ''}: ${price}`];
    const meta = [];
    if (showFabric) meta.push(`Fabric: ${fabric || 'Not specified'}`);
    if (showSold && sold > 0) meta.push(`Sold: ${sold}`);
    if (p?.isBestSeller) meta.push('Best seller');
    if (stock) meta.push(stock);
    if (meta.length) parts.push(`  ${meta.join(' • ')}`);
    parts.push(`  View: /product/${p?._id}`);
    return parts.join('\n');
  };

  const buildProductReply = (matches, intro, extraLinks = [], options = {}) => {
    if (!matches.length) return null;
    const lines = matches.map((p) => formatProductLine(p, options));
    const links = uniqueLinks([
      ...matches.slice(0, 4).map((p) => ({ label: `View ${p?.name || 'Product'}`, to: `/product/${p?._id}` })),
      ...extraLinks
    ]);
    return { content: `${intro}\n${lines.join('\n')}`, links };
  };

  const getSiteAwareResponse = (msg) => {
    const raw = String(msg || '');
    const lower = normalize(raw);
    const lowerSlugish = normalizeSlugish(raw);
    const currentData = siteDataRef.current || siteData;
    const { categories, products } = currentData;

    if (!lower) {
      return { content: 'Please type your question about Veil & Vogue and I will help.', links: [] };
    }

    if ((currentData.error || !currentData.loaded) && products.length === 0 && includesAny(lower, ['price', 'prices', 'fabric', 'material', 'abaya', 'hijab', 'pin', 'scrunchie', 'cap', 'hamper', 'accessor', 'best seller', 'bestseller', 'product', 'keemat', 'qeemat', 'daam', 'kitne', 'kapra', 'stock', 'new', 'description', 'detail', 'sare', 'sab', 'dikhao'])) {
      return {
        content: "I'm having trouble loading the latest product data from the website right now. Please make sure the website/API is running, then ask again (for example: 'hijab prices', 'best seller abaya', or 'fabric of [product name]').",
        links: [{ label: 'Shop All', to: '/shop' }, { label: 'Hijabs', to: '/shop/hijabs' }, { label: 'Abayas', to: '/shop/abayas' }]
      };
    }

    if (isGreeting(lower)) {
      return {
        content: "Hello! I can help with Veil & Vogue products, categories, prices, fabrics, best sellers, shipping, guest checkout, order tracking, returns, and contact details. How can I help you?",
        links: [{ label: 'Shop All', to: '/shop' }, { label: 'Abayas', to: '/shop/abayas' }, { label: 'Hijabs', to: '/shop/hijabs' }]
      };
    }

    const catRoute = findCategoryRoute(raw);
    const asksBestSeller = includesAny(lower, ['best seller', 'bestseller', 'most sold', 'top selling', 'top seller', 'popular', 'zyada bik', 'sabse zyada', 'famous']);
    const asksFabric = includesAny(lower, ['fabric', 'material', 'cloth', 'stuff', 'kapra', 'kapray', 'kapre', 'kapda']);
    const asksPrice = includesAny(lower, ['price', 'prices', 'cost', 'costs', 'rate', 'rates', 'how much', 'pricing', 'keemat', 'qeemat', 'qimat', 'kimat', 'daam', 'kitne', 'kitna']);
    const asksListAll = includesAny(lower, ['all', 'list', 'show all', 'available', 'every', 'sab', 'sare', 'saare', 'sari', 'tamam', 'dikhao', 'show me']);
    const asksDescription = includesAny(lower, ['description', 'detail', 'details', 'about', 'maloomat', 'information', 'info', 'bataye', 'batao', 'bataiye', 'bata do', 'tell me about', 'describe']);
    const asksStock = includesAny(lower, ['stock', 'in stock', 'out of stock', 'availability', 'maujood', 'available hai']);
    const asksNew = includesAny(lower, ['new arrival', 'new arrivals', 'new', 'latest', 'naya', 'naye', 'nayi']);
    const asksCheapest = includesAny(lower, ['cheapest', 'lowest price', 'sasta', 'sabse sasta', 'kam price']);
    const asksExpensive = includesAny(lower, ['most expensive', 'highest price', 'mehnga', 'sabse mehnga', 'premium price']);
    const maxPrice = extractPriceLimit(raw);
    const minPrice = extractMinPrice(raw);
    const categoryMention = Boolean(catRoute) || includesAny(lowerSlugish, ['abaya', 'hijab', 'pin', 'scrunchie', 'cap', 'hamper', 'accessor', 'gift', 'hair catcher']);
    const isInfoIntent = includesAny(lower, [
      'shipping', 'delivery', 'deliver', 'courier',
      'return', 'exchange', 'refund',
      'payment', 'pay', 'cod', 'cash on delivery', 'bank', 'jazzcash', 'easypaisa', 'nayapay', 'card',
      'guest', 'without login', 'without account', 'no account', 'checkout without',
      'track', 'tracking', 'order status', 'where is my order',
      'contact', 'support', 'email', 'phone', 'whatsapp', 'number', 'address', 'location', 'faisalabad',
      'account', 'login', 'register', 'sign up', 'signup', 'password', 'forgot', 'reset', 'profile',
      'cart', 'wishlist', 'add to cart',
      'how to order', 'place order', 'buy', 'checkout'
    ]);

    // Product detail/description queries (e.g. "tell me about Georgette Hijab", "description of ...")
    if (asksDescription && !isInfoIntent) {
      const pool = catRoute ? productsInCategory(catRoute) : products;
      const matches = findProducts(lower, 5, pool.length ? pool : products);
      if (matches.length) {
        const top = matches[0];
        const fabric = inferFabric(top);
        const catName = getCategoryName(top);
        const stockText = (typeof top?.stock === 'number') ? (top.stock > 0 ? `In stock (${top.stock} available)` : 'Out of stock') : 'Stock not specified';
        const desc = (top?.description && String(top.description).trim())
          ? String(top.description).trim()
          : `${top?.name || 'This product'}${catName ? ` is a ${String(catName).toLowerCase().replace(/s$/, '')} product` : ' is a product'} from Veil & Vogue${fabric ? ` made with ${fabric}` : ''}. Price: ${formatPKR(top?.price)}.`;
        const lines = [
          `Here are the details for "${top?.name}":`,
          `- Price: ${formatPKR(top?.price)}`,
          `- Fabric/Material: ${fabric || 'Not specified on the website'}`,
          catName ? `- Category: ${catName}` : null,
          `- Availability: ${stockText}`,
          (Number(top?.sold || 0) > 0) ? `- Sold: ${Number(top.sold)} unit(s)` : null,
          top?.isBestSeller ? '- Marked as: Best seller' : null,
          top?.isNewArrival ? '- Marked as: New arrival' : null,
          Array.isArray(top?.tags) && top.tags.length ? `- Tags: ${top.tags.join(', ')}` : null,
          `- Description: ${desc}`,
          `- View: /product/${top?._id}`
        ].filter(Boolean);
        const others = matches.slice(1, 4);
        let content = lines.join('\n');
        if (others.length) {
          content += '\n\nOther matching products:\n' + others.map((p) => `- ${p?.name}: ${formatPKR(p?.price)}\n  View: /product/${p?._id}`).join('\n');
        }
        const links = uniqueLinks([
          { label: `View ${top?.name}`, to: `/product/${top?._id}` },
          ...(catRoute ? [{ label: `Open ${catRoute.label}`, to: catRoute.to }] : [{ label: 'Shop All', to: '/shop' }])
        ]);
        return { content, links };
      }
    }

    // All products/prices across categories (when no specific category is asked)
    if (!isInfoIntent && !catRoute && asksPrice && asksListAll && products.length) {
      const byCat = new Map();
      for (const p of products) {
        const key = getCategoryName(p) || 'Other';
        if (!byCat.has(key)) byCat.set(key, []);
        byCat.get(key).push(p);
      }
      const sections = [];
      for (const [catName, items] of Array.from(byCat.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
        const sorted = items.slice().sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
        sections.push(`${catName}:\n${sorted.map((p) => `- ${p?.name}: ${formatPKR(p?.price)}${asksFabric ? ` (Fabric: ${inferFabric(p) || 'Not specified'})` : ''}`).join('\n')}`);
      }
      if (sections.length) {
        return {
          content: `Here are Veil & Vogue product prices by category:\n\n${sections.join('\n\n')}`,
          links: [
            { label: 'Shop All', to: '/shop' },
            ...categories.slice(0, 4).map((c) => ({ label: c?.name || 'Category', to: `/shop/${c?.slug || ''}`.replace(/\/$/, '') })).filter((l) => l.to !== '/shop/')
          ]
        };
      }
    }

    // Best seller queries (e.g. "best seller abaya")
    if (asksBestSeller) {
      const pool = catRoute ? productsInCategory(catRoute) : products;
      const ranked = [...pool].sort((a, b) => {
        const aBest = a?.isBestSeller ? 1 : 0;
        const bBest = b?.isBestSeller ? 1 : 0;
        return (bBest - aBest) || (Number(b?.sold || 0) - Number(a?.sold || 0)) || (Number(b?.rating || 0) - Number(a?.rating || 0));
      }).filter(Boolean);

      if (ranked.length) {
        const top = ranked[0];
        const sold = Number(top?.sold || 0);
        const fabric = inferFabric(top);
        const introParts = [
          `Our top-selling ${catRoute ? catRoute.label.toLowerCase().replace(/s$/, '') : 'product'} right now is "${top?.name}".`
        ];
        if (sold > 0) introParts.push(`It has sold ${sold} unit(s).`);
        else if (top?.isBestSeller) introParts.push('It is marked as a best seller in our collection.');
        introParts.push(`Price: ${formatPKR(top?.price)}.`);
        introParts.push(`Fabric/Material: ${fabric || 'Not specified on the website'}.`);
        if (top?.description) introParts.push(`Details: ${String(top.description).slice(0, 180)}${String(top.description).length > 180 ? '...' : ''}`);

        const others = ranked.slice(1, 5);
        let content = introParts.join(' ');
        if (others.length) {
          content += '\n\nOther popular options:\n' + others.map((p) => formatProductLine(p, { showFabric: true, showSold: true })).join('\n');
        }
        const links = uniqueLinks([
          { label: `View ${top?.name}`, to: `/product/${top?._id}` },
          ...(catRoute ? [{ label: `Open ${catRoute.label}`, to: catRoute.to }] : [{ label: 'Shop All', to: '/shop' }])
        ]);
        return { content, links };
      }

      return {
        content: catRoute
          ? `I couldn't find best-seller data for ${catRoute.label} right now, but you can browse all ${catRoute.label.toLowerCase()} here.`
          : "I couldn't find best-seller data right now, but you can browse our products on the Shop page.",
        links: [catRoute ? { label: `Open ${catRoute.label}`, to: catRoute.to } : { label: 'Shop All', to: '/shop' }]
      };
    }

    // Category-level and category-specific queries
    if (!isInfoIntent && catRoute && (asksPrice || asksFabric || asksListAll || asksStock || asksNew || asksCheapest || asksExpensive || maxPrice !== null || minPrice !== null || categoryMention || includesAny(lower, ['product', 'show', 'find', 'search', 'available', 'wedding', 'bridal']))) {
      let pool = productsInCategory(catRoute).slice().sort((a, b) => {
        const ap = Number(a?.price);
        const bp = Number(b?.price);
        const aHas = Number.isFinite(ap);
        const bHas = Number.isFinite(bp);
        if (aHas && bHas && ap !== bp) return ap - bp;
        return String(a?.name || '').localeCompare(String(b?.name || ''));
      });

      if (asksNew) pool = pool.filter((p) => p?.isNewArrival);
      if (asksStock && includesAny(lower, ['in stock', 'available', 'maujood', 'stock'])) pool = pool.filter((p) => Number(p?.stock || 0) > 0);
      if (maxPrice !== null) pool = pool.filter((p) => Number.isFinite(Number(p?.price)) && Number(p.price) <= maxPrice);
      if (minPrice !== null) pool = pool.filter((p) => Number.isFinite(Number(p?.price)) && Number(p.price) >= minPrice);
      if (asksCheapest) pool = pool.slice().sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
      if (asksExpensive) pool = pool.slice().sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));

      const genericCategoryQuery =
        asksListAll ||
        includesAny(lower, ['all ', ' all', 'prices of', 'price of', 'list of', 'available in', 'fabrics in', 'materials in', 'fabric of all', 'show me all', 'sab ', ' sab', 'sare ', ' sare']) ||
        normalize(lower).replace(/what|are|the|prices?|price|costs?|cost|rates?|rate|of|for|all|available|show|list|me|please|tell|in|fabrics?|materials?|cloth|stuff|products?|items?|keemat|qeemat|daam|kitne|kitna|ka|ki|ke|ke|hain|hai|batao|bata|dikhao|sab|sare|saare/gi, ' ').replace(/\s+/g, ' ').trim() === normalize(catRoute.label).replace(/\s+/g, ' ').trim() ||
        normalize(lower).replace(/what|are|the|prices?|price|costs?|cost|rates?|rate|of|for|all|available|show|list|me|please|tell|in|fabrics?|materials?|cloth|stuff|products?|items?|keemat|qeemat|daam|kitne|kitna|ka|ki|ke|ke|hain|hai|batao|bata|dikhao|sab|sare|saare/gi, ' ').replace(/\s+/g, ' ').trim() === normalize(catRoute.slug || '').replace(/-/g, ' ');

      if (pool.length) {
        // If query is specific (e.g. "wedding abaya price", "fabric of nida abaya"), answer matched products
        const specificMatches = findProducts(lower, 10, pool);
        if (!genericCategoryQuery && !asksCheapest && !asksExpensive && !asksNew && maxPrice === null && minPrice === null && specificMatches.length > 0 && specificMatches.length < pool.length) {
          const intro = asksFabric && !asksPrice
            ? `Here are fabric/material details for matching ${catRoute.label.toLowerCase()}:`
            : asksPrice
              ? `Here are matching ${catRoute.label.toLowerCase()} prices from Veil & Vogue:`
              : `Here are matching ${catRoute.label.toLowerCase()} from Veil & Vogue:`;
          const lines = specificMatches.map((p) => {
            const fabric = inferFabric(p);
            if (asksFabric && !asksPrice) return `- ${p?.name}: ${fabric || 'Fabric/material not specified on the website'} (${formatPKR(p?.price)})\n  View: /product/${p?._id}`;
            if (asksPrice && asksFabric) return `- ${p?.name}: ${formatPKR(p?.price)} (Fabric: ${fabric || 'Not specified'})`;
            if (asksPrice) return `- ${p?.name}: ${formatPKR(p?.price)}${fabric ? ` (Fabric: ${fabric})` : ''}`;
            return formatProductLine(p, { showFabric: asksFabric, showSold: asksBestSeller, compact: false });
          });
          const links = uniqueLinks([
            ...specificMatches.slice(0, 4).map((p) => ({ label: `View ${p?.name || 'Product'}`, to: `/product/${p?._id}` })),
            { label: `Open ${catRoute.label} Page`, to: catRoute.to },
            { label: 'Shop All', to: '/shop' }
          ]);
          return { content: `${intro}\n${lines.join('\n')}`, links };
        }

        // General category listing (e.g. "hijab prices", "all abayas", "accessories fabrics")
        if (genericCategoryQuery || asksPrice || asksFabric || asksListAll || asksNew || asksCheapest || asksExpensive || asksStock || maxPrice !== null || minPrice !== null || categoryMention) {
          let intro;
          if (asksCheapest) {
            intro = `Here are the lowest-priced ${catRoute.label.toLowerCase()} available on Veil & Vogue:`;
          } else if (asksExpensive) {
            intro = `Here are the highest-priced ${catRoute.label.toLowerCase()} available on Veil & Vogue:`;
          } else if (asksNew && asksPrice) {
            intro = `Here are the prices of new arrival ${catRoute.label.toLowerCase()} on Veil & Vogue:`;
          } else if (asksNew) {
            intro = `Here are new arrival ${catRoute.label.toLowerCase()} on Veil & Vogue:`;
          } else if (asksFabric && !asksPrice) {
            intro = `Here are the fabrics/materials for ${catRoute.label} available on Veil & Vogue:`;
          } else if (asksPrice) {
            intro = `Here are the prices of ${catRoute.label} available on Veil & Vogue:`;
          } else {
            intro = `Here are the available ${catRoute.label} on Veil & Vogue:`;
          }

          const displayPool = (asksCheapest || asksExpensive) && !asksListAll && !asksPrice ? pool.slice(0, 5) : pool;
          const lines = displayPool.map((p) => {
            const fabric = inferFabric(p);
            if (asksFabric && !asksPrice) {
              return `- ${p?.name}: ${fabric || 'Fabric/material not specified on the website'}${Number.isFinite(Number(p?.price)) ? ` (${formatPKR(p?.price)})` : ''}`;
            }
            if (asksPrice && asksFabric) {
              return `- ${p?.name}: ${formatPKR(p?.price)} (Fabric: ${fabric || 'Not specified'})`;
            }
            if (asksPrice) {
              return `- ${p?.name}: ${formatPKR(p?.price)}`;
            }
            return `- ${p?.name}: ${formatPKR(p?.price)}${fabric ? ` (Fabric: ${fabric})` : ''}`;
          });

          const fabricsSummary = Array.from(new Set(
            displayPool.map(inferFabric).filter(Boolean).flatMap((f) => f.split(',').map((x) => x.trim())).filter(Boolean)
          ));

          let content = `${intro}\n${lines.join('\n')}`;
          if ((asksFabric || fabricsSummary.length) && fabricsSummary.length) {
            content += `\n\nFabrics/materials available: ${fabricsSummary.join(', ')}.`;
          }

          const links = uniqueLinks([
            ...displayPool.slice(0, 4).map((p) => ({ label: `View ${p?.name || 'Product'}`, to: `/product/${p?._id}` })),
            { label: `Open ${catRoute.label} Page`, to: catRoute.to },
            { label: 'Shop All', to: '/shop' }
          ]);

          return { content, links };
        }
      }

      const reasons = [];
      if (asksNew) reasons.push('new arrival');
      if (asksStock) reasons.push('in-stock');
      if (maxPrice !== null) reasons.push(`under ${formatPKR(maxPrice)}`);
      if (minPrice !== null) reasons.push(`above ${formatPKR(minPrice)}`);
      return {
        content: reasons.length
          ? `I couldn't find ${reasons.join(', ')} ${catRoute.label.toLowerCase()} matching your request right now. You can browse all ${catRoute.label.toLowerCase()} here.`
          : `I couldn't find ${catRoute.label.toLowerCase()} products in the current website data. You can browse the ${catRoute.label} page for the latest listings.`,
        links: [{ label: `Open ${catRoute.label} Page`, to: catRoute.to }, { label: 'Shop All', to: '/shop' }]
      };
    }

    // Fabric/material queries for specific products (no category-wide match handled above)
    if (asksFabric) {
      const matches = findProducts(lower, 8, products);
      if (matches.length) {
        const intro = matches.length === 1
          ? `Here is the fabric/material information for "${matches[0]?.name}":`
          : 'Here are fabric/material details for matching products on Veil & Vogue:';
        const lines = matches.map((p) => {
          const fabric = inferFabric(p);
          return `- ${p?.name}: ${fabric || 'Fabric/material not specified on the website'} (${formatPKR(p?.price)})\n  View: /product/${p?._id}`;
        });
        const allFabrics = Array.from(new Set(matches.map(inferFabric).filter(Boolean).flatMap((f) => f.split(',').map((x) => x.trim())).filter(Boolean)));
        let content = `${intro}\n${lines.join('\n')}`;
        if (matches.length > 1 && allFabrics.length) content += `\n\nFabrics/materials found: ${allFabrics.join(', ')}.`;
        const links = uniqueLinks([
          ...matches.slice(0, 4).map((p) => ({ label: `View ${p?.name || 'Product'}`, to: `/product/${p?._id}` })),
          { label: 'Shop All', to: '/shop' }
        ]);
        return { content, links };
      }

      const allFabrics = Array.from(new Set(products.map(inferFabric).filter(Boolean).flatMap((f) => f.split(',').map((x) => x.trim())).filter(Boolean)));
      if (allFabrics.length) {
        return {
          content: `I couldn't match a specific product for that fabric question. Fabrics/materials found on the website include: ${allFabrics.slice(0, 20).join(', ')}. Please ask with the product name (for example, "What fabric is Georgette Hijab?").`,
          links: [{ label: 'Shop All', to: '/shop' }]
        };
      }

      return {
        content: "I don't have specific fabric/material details listed for that product on the website yet. Please check the product page description or ask for the product price/category.",
        links: [{ label: 'Shop All', to: '/shop' }]
      };
    }

    // Specific product/price queries (no category-level listing)
    if (asksPrice || includesAny(lower, ['product', 'show', 'find', 'search', 'available', 'wedding', 'bridal'])) {
      const matches = findProducts(lower, 10, products);
      if (matches.length) {
        const intro = asksPrice
          ? 'Here are the matching product prices from Veil & Vogue:'
          : 'Here are the matching products from Veil & Vogue:';
        return buildProductReply(matches, intro, [{ label: 'Shop All', to: '/shop' }], { showFabric: asksFabric, showSold: asksBestSeller, compact: false });
      }

      if (asksPrice && products.length) {
        const priced = products.filter((p) => Number.isFinite(Number(p?.price))).sort((a, b) => Number(a.price) - Number(b.price));
        if (priced.length) {
          return buildProductReply(
            priced.slice(0, 8),
            `Our current prices range from ${formatPKR(priced[0].price)} to ${formatPKR(priced[priced.length - 1].price)}. Here are some products:`,
            [{ label: 'Shop All Products', to: '/shop' }],
            { compact: false }
          );
        }
      }
    }

    if (includesAny(lower, ['category', 'categories', 'collection', 'collections'])) {
      const links = categories.slice(0, 10).map((c) => ({
        label: c?.name || 'Category',
        to: `/shop/${c?.slug || ''}`.replace(/\/$/, '')
      })).filter((l) => l.to !== '/shop/');
      if (categories.length) {
        const names = categories.map((c) => c?.name).filter(Boolean);
        return {
          content: `Veil & Vogue categories:\n- ${names.join('\n- ')}\n\nAsk for any category (for example, "hijabs" or "abayas") and I can show products, prices, or take you to that page.`,
          links: uniqueLinks([...links, { label: 'Shop All', to: '/shop' }])
        };
      }
      return {
        content: 'You can browse categories like Hijabs, Abayas, Hijab Pins, Scrunchies, Hijab Caps, Hair Catchers, Gift Hampers, and Accessories on the Shop page.',
        links: [{ label: 'Shop All', to: '/shop' }, { label: 'Hijabs', to: '/shop/hijabs' }, { label: 'Abayas', to: '/shop/abayas' }]
      };
    }

    if (includesAny(lower, ['shipping', 'delivery', 'deliver', 'courier'])) {
      return {
        content: 'Shipping information for Veil & Vogue:\n- Standard delivery: 3-5 business days (PKR 200)\n- Express delivery: 1-2 business days where available (PKR 400)\n- Free shipping: on orders over PKR 3,000\n- Processing time: usually 24-48 hours\n- Nationwide delivery across Pakistan',
        links: [{ label: 'Shipping Page', to: '/shipping' }]
      };
    }

    if (includesAny(lower, ['return', 'exchange', 'refund'])) {
      return {
        content: 'Returns & exchanges:\n- Exchange requests can be made within 7 days of delivery\n- Items must be unused, unwashed, and in original packaging with tags\n- Used items, sale/clearance items, or items damaged due to misuse may not be eligible\n- For a damaged or wrong item, contact support with your order number and photos\n\nContact: veilandvogue5320@gmail.com or WhatsApp (+92 314 4129295).',
        links: [{ label: 'Returns Page', to: '/returns' }, { label: 'Contact', to: '/contact' }]
      };
    }

    if (includesAny(lower, ['payment', 'pay', 'cod', 'cash on delivery', 'bank', 'jazzcash', 'easypaisa', 'nayapay', 'card'])) {
      return {
        content: 'Available payment methods include Cash on Delivery (COD), Bank Transfer, JazzCash, Easypaisa, and NayaPay (as shown at checkout). For online/manual payments, follow the checkout instructions and upload/send receipt details where required.',
        links: [{ label: 'Checkout', to: '/checkout' }, { label: 'FAQ', to: '/faq' }]
      };
    }

    if (includesAny(lower, ['guest', 'without login', 'without account', 'no account', 'checkout without'])) {
      return {
        content: 'Yes, guest checkout is available on Veil & Vogue. You can place an order without logging in or creating an account.\n\nAfter placing a guest order, save your order number and the email/phone used at checkout (and guest tracking details if provided) so you can track your order on the Track Order page. Promotional emails are sent only to registered accounts.',
        links: [{ label: 'Checkout', to: '/checkout' }, { label: 'Track Order', to: '/track-order' }]
      };
    }

    if (includesAny(lower, ['track', 'tracking', 'order status', 'where is my order'])) {
      return {
        content: 'To track your order:\n1. Open the Track Order page\n2. Enter your order number\n3. If you checked out as a guest, provide the email/phone used at checkout or your guest tracking details/token\n\nLogged-in users can also view orders in Profile/Order History.',
        links: [{ label: 'Track Order', to: '/track-order' }, { label: 'Profile', to: '/profile' }]
      };
    }

    if (includesAny(lower, ['contact', 'support', 'email', 'phone', 'whatsapp', 'number', 'address', 'location', 'faisalabad'])) {
      return {
        content: 'Contact Veil & Vogue:\n- Email: veilandvogue5320@gmail.com\n- Phone/WhatsApp: +92 314 4129295\n- Location: Faisalabad, Pakistan\n\nYou can also send a message through the Contact page.',
        links: [{ label: 'Contact Page', to: '/contact' }]
      };
    }

    if (includesAny(lower, ['account', 'login', 'register', 'sign up', 'signup', 'password', 'forgot', 'reset', 'profile'])) {
      return {
        content: 'Account help:\n- Login/Register is optional because guest checkout is available\n- Registered users can manage profile details, saved addresses, and order history\n- Forgot/reset password options are available on the login/auth pages\n\nPromotional emails (new products/sales) are for registered accounts only.',
        links: [{ label: 'Login', to: '/login' }, { label: 'Register', to: '/register' }, { label: 'Profile', to: '/profile' }]
      };
    }

    if (includesAny(lower, ['cart', 'wishlist', 'add to cart'])) {
      return {
        content: 'You can add products to your Cart and proceed to Checkout. You can also save products to your Wishlist for later.',
        links: [{ label: 'Cart', to: '/cart' }, { label: 'Wishlist', to: '/wishlist' }, { label: 'Shop', to: '/shop' }]
      };
    }

    if (includesAny(lower, ['how to order', 'place order', 'buy', 'checkout'])) {
      return {
        content: 'How to place an order:\n1. Browse products and add items to your cart\n2. Go to Cart and proceed to Checkout\n3. Enter shipping/contact details (guest checkout is available)\n4. Choose a payment method (COD or online/manual options)\n5. Place your order and follow any payment/receipt instructions\n6. Save your order number and track it on the Track Order page',
        links: [{ label: 'Shop', to: '/shop' }, { label: 'Cart', to: '/cart' }, { label: 'Checkout', to: '/checkout' }, { label: 'Track Order', to: '/track-order' }]
      };
    }

    return {
      content: "I can only help with Veil & Vogue website-related questions, such as products, prices, categories, fabrics, best sellers, shipping, guest checkout, order tracking, returns, payments, and contact information. Please ask something like \"best seller abaya\", \"hijab prices\", or \"what fabric is this abaya?\".",
      links: [{ label: 'Shop All', to: '/shop' }, { label: 'Abayas', to: '/shop/abayas' }, { label: 'Hijabs', to: '/shop/hijabs' }]
    };
  };

  const handleSend = async (text) => {
    const message = (text ?? input).trim();
    if (!message || isTyping) return;

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setIsTyping(true);

    try {
      const cur = siteDataRef.current;
      if (!cur.loaded || (cur.error && cur.products.length === 0) || cur.products.length === 0) {
        await loadSiteData(true);
      }
    } catch {}

    setTimeout(() => {
      const aiResponse = getSiteAwareResponse(message);
      setMessages((prev) => [...prev, { role: 'assistant', ...aiResponse }]);
      setIsTyping(false);
    }, 250 + Math.random() * 200);
  };

  const renderLinks = (links = []) => {
    const safe = uniqueLinks(links);
    if (!safe.length) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {safe.map((link, idx) => (
          <Link
            key={`${link.to}-${idx}`}
            to={link.to}
            onClick={(e) => {
              e.preventDefault();
              handleClose();
              navigate(link.to);
            }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              isDark
                ? 'border-zinc-600 text-ivory hover:bg-gold hover:border-gold hover:text-white'
                : 'border-gold/40 text-gold hover:bg-gold hover:text-white'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 md:bottom-8 md:left-8 bg-gold text-white p-3 md:p-4 rounded-full shadow-2xl hover:scale-110 transition-all z-[9999] flex items-center gap-2 cursor-pointer"
          >
            <Bot size={24} />
            <span className="hidden md:inline font-semibold text-sm">AI Assistant</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] md:hidden"
            />

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className={`fixed bottom-20 left-4 md:bottom-8 md:left-8 w-[90vw] max-w-[380px] sm:w-[420px] rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden border ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'
              }`}
              style={{ height: '70vh', maxHeight: '600px' }}
            >
              <div className={`p-4 flex items-center justify-between shrink-0 ${isDark ? 'bg-zinc-950 text-ivory' : 'bg-deep-black text-ivory'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gold/20 rounded-full">
                    <Bot size={20} className="text-gold" />
                  </div>
                  <div>
                    <span className="font-semibold block text-sm">Veil & Vogue Assistant</span>
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Online
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-ivory/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close chat"
                >
                  <X size={22} />
                </button>
              </div>

              <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDark ? 'bg-zinc-900' : 'bg-gray-50'}`}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gold text-white rounded-br-none'
                          : isDark
                            ? 'bg-zinc-800 text-ivory rounded-bl-none border border-zinc-700'
                            : 'bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.role === 'assistant' && renderLinks(msg.links)}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className={`${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-gray-100'} rounded-2xl rounded-bl-none p-3`}>
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {messages.length <= 2 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {QUICK_ACTIONS.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(action.query)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          isDark
                            ? 'border-zinc-700 text-ivory hover:bg-gold hover:text-white hover:border-gold'
                            : 'border-gold/30 text-gold hover:bg-gold hover:text-white'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className={`p-3 border-t shrink-0 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}>
                <div className="flex gap-2 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Ask: best seller abaya, hijab prices, fabric..."
                    className={`flex-1 px-4 py-2.5 rounded-full focus:ring-2 focus:ring-gold focus:outline-none text-sm ${
                      isDark
                        ? 'bg-zinc-800 text-ivory placeholder-zinc-500 border border-zinc-700'
                        : 'bg-gray-100 text-gray-900 placeholder-gray-500 border-0'
                    }`}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping}
                    className="bg-gold text-white p-2.5 rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 shrink-0 cursor-pointer"
                  >
                    <Send size={18} />
                  </button>
                </div>
                <p className={`text-xs text-center mt-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                  Ask about products, prices, fabrics, and website help
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
