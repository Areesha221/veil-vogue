import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

export default function Cart() {
  usePageMeta({
    title: 'Cart',
    description: 'Review your Veil & Vogue cart, update quantities, and proceed to secure checkout.'
  });
  const { cart, updateQty, removeFromCart, subtotal: rawSubtotal, discount: rawDiscount, shipping: rawShipping, total: rawTotal } = useCart();
  const subtotal = rawSubtotal || 0;
  const discount = rawDiscount || 0;
  const shipping = rawShipping ?? (subtotal > 3000 ? 0 : 200);
  const total = rawTotal ?? Math.max(0, subtotal - discount + shipping);
  const freeShippingTarget = 3000;
  const discountTarget = 10000;
  const remainingForFreeShipping = Math.max(0, freeShippingTarget - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingTarget) * 100));
  const remainingForDiscount = Math.max(0, discountTarget - subtotal + 1);

  if (cart.length === 0) {
    return (
      <div className="pt-32 pb-20 min-h-screen flex items-center justify-center bg-ivory dark:bg-zinc-950 transition-colors">
        <div className="text-center bg-white dark:bg-zinc-900 p-12 rounded-3xl shadow-xl max-w-md">
          <div className="w-24 h-24 bg-gold/20 rounded-full mx-auto mb-6 flex items-center justify-center">
            <ShoppingBag className="text-gold" size={48} />
          </div>
          <h1 className="font-serif text-3xl mb-3 text-gray-900 dark:text-ivory">
            Your cart is empty
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add some elegant pieces to get started
          </p>
          <Link
            to="/shop"
            className="inline-block bg-gold text-white px-8 py-3 rounded-full font-semibold hover:bg-yellow-600 transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 min-h-screen bg-ivory dark:bg-zinc-950 transition-colors">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-10">
          <Link
            to="/shop"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-700 dark:text-ivory"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 dark:text-ivory">
            Shopping Cart
          </h1>
          <span className="text-gray-500 dark:text-gray-400 text-lg">
            ({cart.length} {cart.length === 1 ? 'item' : 'items'})
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map(item => (
              <motion.div
                key={item.key}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-md hover:shadow-xl transition-shadow border border-gray-100 dark:border-zinc-800"
              >
                <Link to={`/product/${item.product._id}`}>
                  <img
                    src={item.product.images?.[0] || 'https://via.placeholder.com/100'}
                    alt={item.product.name}
                    className="w-24 h-28 object-cover rounded-xl"
                  />
                </Link>
                <div className="flex-1">
                  <Link to={`/product/${item.product._id}`}>
                    <h3 className="font-semibold text-gray-900 dark:text-ivory hover:text-gold transition-colors">
                      {item.product.name}
                    </h3>
                  </Link>
                  {item.variant && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Variant: {item.variant}
                    </p>
                  )}
                  <p className="text-gold font-bold text-lg mt-2">
                    PKR {(item.product.price || 0).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => updateQty(item.key, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-700 dark:text-ivory hover:bg-gold hover:text-white hover:border-gold transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-semibold w-8 text-center text-gray-900 dark:text-ivory">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.key, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-700 dark:text-ivory hover:bg-gold hover:text-white hover:border-gold transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.key)}
                      className="ml-auto p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Subtotal: <span className="font-semibold text-gold">
                      PKR {((item.product.price || 0) * item.quantity).toLocaleString()}
                    </span>
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Continue Shopping Link */}
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gold dark:hover:text-gold transition-colors font-medium mt-4"
            >
              <ArrowLeft size={18} />
              Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 h-fit sticky top-24 shadow-lg border border-gray-100 dark:border-zinc-800">
            <h2 className="font-serif text-2xl mb-6 text-gray-900 dark:text-ivory">
              Order Summary
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal</span>
                <span className="font-medium">PKR {subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-700 dark:text-green-400">
                  <span>Discount (10% off)</span>
                  <span className="font-medium">- PKR {discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Shipping</span>
                <span className="font-medium">
                  {shipping === 0 ? (
                    <span className="text-green-600 dark:text-green-400">FREE</span>
                  ) : (
                    `PKR ${shipping}`
                  )}
                </span>
              </div>

              {discount > 0 ? (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs p-2 rounded-lg text-center">
                  🎉 10% discount applied on shopping over PKR 10,000!
                </div>
              ) : (
                <div className="bg-gold/10 text-gray-700 dark:text-gray-300 text-xs p-3 rounded-lg">
                  <div className="flex justify-between mb-1"><span>Get 10% off</span><span className="font-medium text-gold">Add PKR {remainingForDiscount.toLocaleString()}</span></div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">10% off on shopping over PKR 10,000</p>
                </div>
              )}

              {shipping === 0 ? (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs p-2 rounded-lg text-center">
                  🎉 You qualified for free shipping!
                </div>
              ) : (
                <div className="bg-gold/10 text-gray-700 dark:text-gray-300 text-xs p-3 rounded-lg">
                  <div className="flex justify-between mb-1"><span>Add more for free shipping</span><span className="font-medium text-gold">PKR {remainingForFreeShipping.toLocaleString()} left</span></div>
                  <div className="h-2 bg-white dark:bg-zinc-800 rounded-full overflow-hidden border border-gold/20">
                    <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${freeShippingProgress}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Free shipping on orders over PKR {freeShippingTarget.toLocaleString()}</p>
                </div>
              )}
              <div className="border-t border-gold/20 pt-3 mt-3 flex justify-between font-bold text-lg">
                <span className="text-gray-900 dark:text-ivory">Total</span>
                <span className="text-gold">PKR {total.toLocaleString()}</span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="block mt-6 bg-deep-black dark:bg-gold text-ivory dark:text-white text-center py-3 rounded-full font-semibold hover:scale-105 transition-transform"
            >
              Proceed to Checkout
            </Link>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
              🔒 Secure checkout • Free shipping over PKR 3,000 • 10% off over PKR 10,000
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link to="/build-hamper" className="text-center px-3 py-2 rounded-full border border-gold/40 text-gold text-xs font-semibold hover:bg-gold/10 transition">Build Hamper</Link>
              <Link to="/track-order" className="text-center px-3 py-2 rounded-full border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:border-gold hover:text-gold transition">Track Order</Link>
            </div>

            {/* Trust Badges */}
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl mb-1">🚚</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Fast Delivery</p>
              </div>
              <div>
                <div className="text-2xl mb-1">🔒</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Secure Payment</p>
              </div>
              <div>
                <div className="text-2xl mb-1">↩️</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Easy Returns</p>
              </div>
            </div>
          </div>
        </div>
        <ProductsStrip
          title="You May Also Like"
          subtitle="Popular abayas, hijabs, and accessories to add to your cart"
          onlyBestSeller
          sortBy="sold"
          limit={4}
          viewAllTo="/shop"
        />
      </div>
    </div>
  );
}