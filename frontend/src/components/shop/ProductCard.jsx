import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useState } from 'react';

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const inWishlist = isInWishlist(product._id);

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  return (
    <Link 
      to={`/product/${product._id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group block"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-zinc-800">
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-zinc-800">
          <img
            src={product.images?.[0] || 'https://via.placeholder.com/400x500'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
            decoding="async"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.compareAtPrice && (
              <span className="bg-gold text-white text-xs font-bold px-3 py-1 rounded-full">
                -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
              </span>
            )}
            {product.isNewArrival && (
              <span className="bg-deep-black text-ivory text-xs font-bold px-3 py-1 rounded-full">
                NEW
              </span>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 p-2 rounded-full shadow-lg transition-all ${
              inWishlist 
                ? 'bg-red-500 text-white' 
                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-ivory hover:bg-red-500 hover:text-white'
            }`}
          >
            <Heart size={18} fill={inWishlist ? 'currentColor' : 'none'} />
          </button>

          {/* Quick Add to Cart */}
          <div className={`absolute bottom-0 left-0 right-0 p-3 transition-all duration-300 opacity-100 translate-y-0 md:opacity-0 md:translate-y-4 ${
            isHovered ? 'md:opacity-100 md:translate-y-0' : ''
          }`}>
            <button
              onClick={handleAddToCart}
              className="w-full bg-deep-black dark:bg-gold text-ivory dark:text-white py-2.5 rounded-full font-semibold text-sm hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              <ShoppingBag size={16} />
              Add to Cart
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-serif font-semibold text-base mb-2 line-clamp-2 text-gray-900 dark:text-ivory">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gold font-bold text-lg">
              PKR {product.price?.toLocaleString()}
            </span>
            {product.compareAtPrice && (
              <span className="text-gray-400 text-sm line-through">
                PKR {product.compareAtPrice.toLocaleString()}
              </span>
            )}
          </div>
          {product.rating && (
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-yellow-500">★</span>
              <span>{product.rating}</span>
              <span className="text-gray-400">({product.numReviews || 0})</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}