import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ProductsStrip from '../components/shop/ProductsStrip';
import RecentlyViewed from '../components/shop/RecentlyViewed';
import usePageMeta from '../hooks/usePageMeta';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, isInWishlist, toggleWishlist } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewName, setReviewName] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const getDisplayDescription = (p) => {
    if (p?.description && String(p.description).trim()) return String(p.description).trim();
    const parts = [];
    const cat = p?.category?.name || '';
    const fabric = (p?.fabric || p?.material || '').trim();
    parts.push(`${p?.name || 'This product'}${cat ? ` is a ${cat.toLowerCase().replace(/s$/, '')} product` : ' is a product'} from Veil & Vogue.`);
    if (fabric) parts.push(`Fabric/Material: ${fabric}.`);
    if (Array.isArray(p?.tags) && p.tags.length) parts.push(`Highlights: ${p.tags.slice(0, 8).join(', ')}.`);
    if (typeof p?.price === 'number') parts.push(`Price: PKR ${p.price.toLocaleString()}.`);
    if (typeof p?.stock === 'number') parts.push(p.stock > 0 ? `Available in stock (${p.stock} units).` : 'Currently out of stock.');
    return parts.join(' ');
  };

  usePageMeta({
    title: product?.name || 'Product Details',
    description: product
      ? String(getDisplayDescription(product)).slice(0, 155)
      : 'View product details, price, fabric, and availability at Veil & Vogue.'
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await axios.get(`/api/products/${id}`);
        setProduct(data);
        try {
          const item = {
            _id: data?._id,
            name: data?.name,
            price: data?.price,
            images: Array.isArray(data?.images) ? data.images.slice(0, 1) : [],
            category: data?.category || null,
            fabric: data?.fabric || data?.material || '',
            slug: data?.slug || ''
          };
          if (item._id) {
            const prev = JSON.parse(localStorage.getItem('vv-recently-viewed') || '[]');
            const next = [item, ...(Array.isArray(prev) ? prev.filter((x) => String(x?._id) !== String(item._id)) : [])].slice(0, 12);
            localStorage.setItem('vv-recently-viewed', JSON.stringify(next));
          }
        } catch {}
      } catch (error) {
        console.error('Error:', error);
        toast.error('Product not found');
        navigate('/shop');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  const handleWishlist = async () => {
    if (!user) {
      toast.error('Please login to add items to wishlist');
      navigate('/login');
      return;
    }
    if (!product?._id) return;
    await toggleWishlist(product);
  };

  const inWishlist = product ? isInWishlist(product._id) : false;

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, null, quantity);
    }
  };

  const userHasReviewed = !!(user && product?.reviews?.some((r) => String(r?.user?._id || r?.user) === String(user?._id || user?.id)));

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewRating || !reviewComment.trim()) {
      toast.error('Please select a rating and write your review');
      return;
    }
    if (!user && !reviewName.trim()) {
      toast.error('Please enter your name to submit a review');
      return;
    }
    try {
      setSubmittingReview(true);
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token')) || localStorage.getItem('token');
      const payload = {
        rating: reviewRating,
        comment: reviewComment.trim(),
        ...(user ? {} : { name: reviewName.trim() })
      };
      const { data } = await axios.post(
        `/api/products/${id}/reviews`,
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (data?.product) setProduct(data.product);
      setReviewComment('');
      setReviewRating(5);
      if (!user) setReviewName('');
      toast.success(data?.message || 'Review submitted successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleImageMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ active: true, x, y });
  };

  if (loading) {
    return (
      <div className="pt-32 min-h-screen flex items-center justify-center">
        <div className="text-2xl font-serif">Loading...</div>
      </div>
    );
  }

  if (!product) return null;

  const productJsonLd = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: getDisplayDescription(product),
    image: Array.isArray(product.images) ? product.images : [],
    sku: product._id,
    category: product?.category?.name || 'Veil & Vogue',
    brand: { '@type': 'Brand', name: 'Veil & Vogue' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: Number(product.price) || 0,
      availability: Number(product.stock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: typeof window !== 'undefined' ? window.location.href : ''
    }
  } : null;

  return (
    <div className="pt-32 pb-20 min-h-screen bg-ivory dark:bg-zinc-950 transition-colors">
      {productJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      )}
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div
              className="aspect-[3/4] overflow-hidden rounded-2xl bg-white relative cursor-zoom-in"
              onMouseEnter={() => setZoom((z) => ({ ...z, active: true }))}
              onMouseLeave={() => setZoom({ active: false, x: 50, y: 50 })}
              onMouseMove={handleImageMouseMove}
            >
              <img
                src={product.images?.[selectedImage] || product.images?.[0]}
                alt={product.name}
                className={`w-full h-full object-cover select-none ${zoom.active ? 'scale-[2]' : 'scale-100'}`}
                style={{
                  transformOrigin: `${zoom.x}% ${zoom.y}%`,
                  transition: zoom.active ? 'transform 80ms ease-out' : 'transform 200ms ease-out'
                }}
                decoding="async"
                draggable={false}
              />
              <div className="pointer-events-none absolute bottom-3 right-3 bg-black/55 text-white text-xs px-2.5 py-1.5 rounded-full">
                Hover to zoom
              </div>
            </div>
            {product.images?.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedImage(idx);
                      setZoom({ active: false, x: 50, y: 50 });
                    }}
                    className={`aspect-square rounded-lg overflow-hidden border-2 ${selectedImage === idx ? 'border-gold' : 'border-gray-200'}`}
                  >
                    <img
                      src={img || 'https://via.placeholder.com/400x500?text=Product'}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x500?text=No+Image';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">{product.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      fill={i < (product.rating || 0) ? 'currentColor' : 'none'}
                      className={i < (product.rating || 0) ? '' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span className="text-gray-500">({product.numReviews || 0} reviews)</span>
              </div>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold text-gold">PKR {product.price?.toLocaleString()}</span>
              {product.compareAtPrice && (
                <span className="text-xl text-gray-400 line-through">
                  PKR {product.compareAtPrice.toLocaleString()}
                </span>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Description</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{getDisplayDescription(product)}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {(product.fabric || product.material) && (
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3">
                  <p className="text-gray-500 dark:text-gray-400">Fabric / Material</p>
                  <p className="font-semibold text-gray-900 dark:text-ivory">{product.fabric || product.material}</p>
                </div>
              )}
              {product.category?.name && (
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3">
                  <p className="text-gray-500 dark:text-gray-400">Category</p>
                  <p className="font-semibold text-gray-900 dark:text-ivory">{product.category.name}</p>
                </div>
              )}
              {typeof product.sold === 'number' && (
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3">
                  <p className="text-gray-500 dark:text-gray-400">Sold</p>
                  <p className="font-semibold text-gray-900 dark:text-ivory">{product.sold}</p>
                </div>
              )}
              {Array.isArray(product.tags) && product.tags.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 sm:col-span-2">
                  <p className="text-gray-500 dark:text-gray-400 mb-1">Tags</p>
                  <p className="font-medium text-gray-900 dark:text-ivory">{product.tags.join(', ')}</p>
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
              {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full border-2 border-gold flex items-center justify-center hover:bg-gold hover:text-white transition-colors"
                >
                  -
                </button>
                <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-10 h-10 rounded-full border-2 border-gold flex items-center justify-center hover:bg-gold hover:text-white transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 bg-deep-black text-ivory py-4 rounded-full font-bold text-lg hover:bg-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShoppingBag size={20} />
                Add to Cart
              </button>

              <button
                onClick={handleWishlist}
                className={`px-6 py-4 rounded-full border-2 transition-colors ${inWishlist
                    ? 'border-red-500 text-red-500 bg-red-50'
                    : 'border-gold text-gold hover:bg-gold hover:text-white'
                  }`}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart size={24} fill={inWishlist ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Additional Info */}
            <div className="border-t pt-6 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>- Free shipping on orders over PKR 3,000</p>
              <p>- 7-day exchange policy</p>
              <p>- Secure payment options</p>
            </div>
          </div>
        </div>

        <div className="mt-14 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
            <div>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 dark:text-ivory">Customer Reviews</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {product.numReviews || product.reviews?.length || 0} review{(product.numReviews || product.reviews?.length || 0) === 1 ? '' : 's'}
                {typeof product.rating === 'number' && (product.numReviews || product.reviews?.length) ? ` • Average ${Number(product.rating).toFixed(1)}/5` : ''}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
            <div className="border border-gray-200 dark:border-zinc-800 rounded-xl p-4 md:p-5 bg-ivory/50 dark:bg-zinc-950/40">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-ivory mb-1">Write a Review</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Share your experience with this product. You can review as a guest or logged-in customer.</p>

              {user && userHasReviewed ? (
                <div className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 rounded-lg p-3">
                  You have already reviewed this product. Thank you for your feedback!
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {!user && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Name</label>
                      <input
                        type="text"
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        maxLength={80}
                        placeholder="Enter your name"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Guest reviews are allowed. Login is optional.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Rating</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-0.5"
                          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        >
                          <Star
                            size={22}
                            className={star <= (hoverRating || reviewRating) ? 'text-yellow-500' : 'text-gray-300'}
                            fill={star <= (hoverRating || reviewRating) ? 'currentColor' : 'none'}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{hoverRating || reviewRating}/5</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Review</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={4}
                      maxLength={1000}
                      placeholder="Tell others about the fabric, quality, fit, and your experience..."
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{reviewComment.length}/1000</p>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full bg-deep-black dark:bg-gold text-ivory dark:text-white py-2.5 rounded-full font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                  {user && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Logged in as {user.name}.</p>
                  )}
                </form>
              )}
            </div>

            <div className="space-y-4">
              {Array.isArray(product?.reviews) && product.reviews.length > 0 ? (
                product.reviews.slice().reverse().map((review, idx) => (
                  <div key={review?._id || idx} className="border border-gray-100 dark:border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="font-semibold text-gray-900 dark:text-ivory">{review?.name || review?.user?.name || 'Customer'}</p>
                      <div className="flex items-center gap-1 text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < Number(review?.rating || 0) ? 'currentColor' : 'none'} className={i < Number(review?.rating || 0) ? '' : 'text-gray-300'} />
                        ))}
                      </div>
                    </div>
                    {review?.comment && <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{review.comment}</p>}
                    {review?.createdAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{new Date(review.createdAt).toLocaleDateString()}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-6 text-center text-gray-600 dark:text-gray-400">
                  No reviews yet. Be the first customer to review this product.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-gold/20 bg-gold/5 dark:bg-gold/10 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-ivory">Create a Custom Gift Hamper</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Apni marzi se products choose karein aur personalized hamper bana kar gift dein.</p>
          </div>
          <Link to="/build-hamper" className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gold text-white font-semibold hover:opacity-90 transition">Build Your Own Hamper</Link>
        </div>

        <ProductsStrip
          title={product?.category?.name ? `More ${product.category.name}` : 'More Products You May Like'}
          subtitle="Browse similar products with images, prices, and details"
          limit={4}
          excludeId={id}
          category={product?.category?.slug || product?.subcategory || ''}
          sortBy="sold"
          viewAllTo={product?.category?.slug ? `/shop/${product.category.slug}` : '/shop'}
        />
        <ProductsStrip
          title="Best Sellers"
          subtitle="Popular picks from Veil & Vogue"
          limit={4}
          onlyBestSeller
          sortBy="sold"
          excludeId={id}
        />
        <RecentlyViewed excludeId={id} limit={4} />
      </div>
    </div>
  );
};

export default ProductDetail;