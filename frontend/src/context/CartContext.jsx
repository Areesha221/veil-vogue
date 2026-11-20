import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import axios from 'axios';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, loading } = useAuth();
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('vv-cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Sync wishlist with auth state. Keep guest cart intact for guest checkout.
  useEffect(() => {
    if (loading) return;

    if (user) {
      fetchWishlist();
    } else {
      setWishlist([]);
      // Do not clear cart here; guests need cart persistence and users may continue as guest after logout.
    }
  }, [user, loading]);

  useEffect(() => {
    localStorage.setItem('vv-cart', JSON.stringify(cart));
  }, [cart]);

  const fetchWishlist = async () => {
    if (!user) {
      setWishlist([]);
      return;
    }

    setWishlistLoading(true);
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token')) || localStorage.getItem('token');
      const { data } = await axios.get('/api/wishlist', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setWishlist(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error?.response?.status === 401) setWishlist([]);
      else console.error('Error fetching wishlist:', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  const addToCart = (product, variant = null, qty = 1) => {
    if (!product.price || isNaN(product.price)) {
      toast.error('Product price is invalid');
      return;
    }

    setCart(prev => {
      const key = `${product._id}-${variant || 'default'}`;
      const existing = prev.find(i => i.key === key);
      if (existing) {
        toast.success('Quantity updated');
        return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + qty } : i);
      }
      toast.success('Added to cart');
      return [...prev, { key, product, variant, quantity: qty }];
    });
  };

  const removeFromCart = (key) => {
    setCart(prev => prev.filter(i => i.key !== key));
    toast.success('Removed from cart');
  };

  const updateQty = (key, qty) => {
    if (qty < 1) return removeFromCart(key);
    setCart(prev => prev.map(i => i.key === key ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => {
    setCart([]);
    toast.success('Cart cleared');
  };

  const addToWishlist = async (product) => {
    if (!user) {
      toast.error('Please login to add items to wishlist');
      return false;
    }

    const productId = product?._id || product;
    if (!productId) return false;

    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token')) || localStorage.getItem('token');
      const { data } = await axios.post(
        '/api/wishlist/add',
        { productId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setWishlist(Array.isArray(data) ? data : []);
      toast.success('Added to wishlist');
      return true;
    } catch (error) {
      if (error.response?.status === 400) {
        // Already in wishlist on server; sync local state
        await fetchWishlist();
        return true;
      }
      toast.error(error.response?.data?.message || 'Failed to add to wishlist');
      return false;
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!user) {
      toast.error('Please login');
      return false;
    }

    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token')) || localStorage.getItem('token');
      const { data } = await axios.post(
        '/api/wishlist/remove',
        { productId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setWishlist(Array.isArray(data) ? data : []);
      toast.success('Removed from wishlist');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove from wishlist');
      return false;
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some((item) =>
      String(item?.product?._id || item?._id || item?.product || '') === String(productId || '')
    );
  };

  const toggleWishlist = async (product) => {
    if (!user) {
      toast.error('Please login to add items to wishlist');
      return false;
    }
    const productId = product?._id || product;
    if (!productId) return false;
    if (isInWishlist(productId)) return removeFromWishlist(productId);
    return addToWishlist(product);
  };

  // ✅ Safe subtotal/pricing calculation (kept consistent with backend offers)
  const subtotal = cart.reduce((sum, item) => {
    const price = item.product?.price || 0;
    const quantity = item.quantity || 1;
    return sum + (price * quantity);
  }, 0);

  const discount = subtotal > 10000 ? Math.round(subtotal * 0.1) : 0;
  const shipping = subtotal > 3000 ? 0 : 200;
  const total = Math.max(0, subtotal - discount + shipping);

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <CartContext.Provider value={{
      cart, addToCart, removeFromCart, updateQty, clearCart,
      wishlist, addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist,
      wishlistLoading,
      subtotal,
      discount,
      shipping,
      total,
      cartCount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);