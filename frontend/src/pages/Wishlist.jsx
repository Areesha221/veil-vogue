import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';
import toast from 'react-hot-toast';

export default function Wishlist() {
  const { user } = useAuth();
  const { wishlist, removeFromWishlist, addToCart, wishlistLoading } = useCart();

  usePageMeta({
    title: 'Wishlist',
    description: 'Save your favorite Veil & Vogue hijabs, abayas, and accessories to your wishlist.'
  });

  useEffect(() => {
    // Wishlist is fetched by CartContext when user logs in
  }, [user]);

  const wishlistProducts = useMemo(() => wishlist.map((item) => item?.product || item).filter(Boolean), [wishlist]);

  const handleAddAllToCart = () => {
    if (!wishlistProducts.length) return;
    wishlistProducts.forEach((product) => addToCart(product));
    toast.success('All wishlist items added to cart');
  };

  if (!user) {
    return (
      <div className="pt-32 pb-20 min-h-screen flex items-center justify-center bg-ivory dark:bg-zinc-950">
        <div className="text-center">
          <Heart className="mx-auto mb-4 text-gold" size={64} />
          <h1 className="font-serif text-3xl mb-2 text-gray-900 dark:text-ivory">
            Please Login
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Login to view and manage your wishlist
          </p>
          <Link
            to="/login"
            className="inline-block bg-gold text-white px-8 py-3 rounded-full font-semibold"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (wishlistLoading) {
    return (
      <div className="pt-32 pb-20 min-h-screen bg-ivory dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="font-serif text-4xl font-bold mb-8 text-gray-900 dark:text-ivory">My Wishlist</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse">
                <div className="h-64 bg-gray-200 dark:bg-zinc-800" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 min-h-screen bg-ivory dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-4xl font-bold text-gray-900 dark:text-ivory">
              My Wishlist
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {wishlistProducts.length} saved item{wishlistProducts.length === 1 ? '' : 's'}
            </p>
          </div>
          {wishlistProducts.length > 0 && (
            <button
              onClick={handleAddAllToCart}
              className="inline-flex items-center justify-center gap-2 bg-gold text-white px-5 py-2.5 rounded-full font-semibold hover:bg-yellow-600 transition-colors"
            >
              <ShoppingCart size={16} /> Add All to Cart
            </button>
          )}
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={64} />
            <h2 className="font-serif text-2xl mb-2 text-gray-900 dark:text-ivory">
              Your wishlist is empty
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add products you love to your wishlist
            </p>
            <Link
              to="/shop"
              className="inline-block bg-gold text-white px-8 py-3 rounded-full font-semibold"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlist.map((item) => {
              const product = item.product || item;
              return (
                <div
                  key={product._id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow"
                >
                  <Link to={`/product/${product._id}`}>
                    <img
                      src={product.images?.[0] || 'https://via.placeholder.com/300'}
                      alt={product.name}
                      className="w-full h-64 object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </Link>
                  <div className="p-4">
                    <Link to={`/product/${product._id}`}>
                      <h3 className="font-semibold text-gray-900 dark:text-ivory mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-gold font-bold text-lg mb-4">
                      PKR {product.price?.toLocaleString()}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addToCart(product)}
                        className="flex-1 bg-gold text-white px-4 py-2 rounded-full font-semibold hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingCart size={16} />
                        Add to Cart
                      </button>
                      <button
                        onClick={() => removeFromWishlist(product._id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                        title="Remove from wishlist"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ProductsStrip
          title="Abayas You May Like"
          subtitle="Popular abayas with images, fabrics, and prices"
          category="abayas"
          sortBy="sold"
          limit={4}
          viewAllTo="/shop/abayas"
        />
        <ProductsStrip
          title="Hijabs & More for You"
          subtitle="Recommended hijabs and accessories"
          category="hijabs"
          sortBy="newest"
          limit={4}
          viewAllTo="/shop/hijabs"
        />
      </div>
    </div>
  );
}
