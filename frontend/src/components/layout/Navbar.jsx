import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { Menu, X, ShoppingBag, Heart, Search, Sun, Moon, Bell, User } from 'lucide-react';
import NotificationBell from '../NotificationBell';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { cartCount, wishlist } = useCart();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
    { to: '/shop/hijabs', label: 'Hijabs' },
    { to: '/shop/abayas', label: 'Abayas' },
    { to: '/shop/accessories', label: 'Accessories' },
    { to: '/build-hamper', label: 'Build Hamper' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled || mobileMenuOpen
          ? 'bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <style>{`@keyframes vv-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <div className="bg-deep-black text-ivory dark:bg-gold dark:text-deep-black overflow-hidden border-b border-gold/20">
        <div className="flex w-max min-w-full hover:[animation-play-state:paused]" style={{ animation: 'vv-marquee 22s linear infinite' }}>
          <div className="flex items-center gap-8 px-4 py-2 text-[11px] sm:text-xs font-medium tracking-wide whitespace-nowrap">
            <span>🚚 Free shipping on orders over PKR 3,000</span>
            <span>✨ 10% OFF on shopping over PKR 10,000</span>
            <span>🎁 Build your own custom gift hamper</span>
            <span>🧕 Premium Hijabs, Abayas & Accessories</span>
          </div>
          <div aria-hidden="true" className="flex items-center gap-8 px-4 py-2 text-[11px] sm:text-xs font-medium tracking-wide whitespace-nowrap">
            <span>🚚 Free shipping on orders over PKR 3,000</span>
            <span>✨ 10% OFF on shopping over PKR 10,000</span>
            <span>🎁 Build your own custom gift hamper</span>
            <span>🧕 Premium Hijabs, Abayas & Accessories</span>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link 
            to="/" 
            className="font-serif text-2xl sm:text-3xl font-bold text-gold whitespace-nowrap"
            onClick={() => setMobileMenuOpen(false)}
          >
            Veil & Vogue
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'text-gold'
                    : scrolled 
                      ? 'text-gray-700 dark:text-ivory hover:text-gold'
                      : 'text-gray-700 dark:text-ivory/80 hover:text-gold'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Icons */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Search */}
            <Link 
              to="/search"
              className="p-2 text-gray-700 dark:text-ivory hover:text-gold transition-colors"
              aria-label="Search"
            >
              <Search size={20} />
            </Link>

            {/* Wishlist */}
            <Link 
              to="/wishlist" 
              className="relative p-2 text-gray-700 dark:text-ivory hover:text-gold transition-colors"
              aria-label="Wishlist"
            >
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link 
              to="/cart" 
              className="relative p-2 text-gray-700 dark:text-ivory hover:text-gold transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Notification Bell */}
            {user && <NotificationBell />}

            {/* User Profile / Admin */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link 
                  to="/profile" 
                  className="flex items-center gap-2 p-2 text-gray-700 dark:text-ivory hover:text-gold transition-colors"
                >
                  <User size={20} />
                  <span className="text-sm font-medium">{user.name}</span>
                </Link>
                
                {/* Admin Badge */}
                {user.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    className="px-3 py-1 bg-gold text-white text-xs rounded-full hover:bg-yellow-600 transition-colors font-semibold"
                  >
                    Admin
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-700 dark:text-ivory hover:text-red-500 transition-colors px-2"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="px-4 py-2 bg-gold text-white rounded-full font-semibold hover:bg-yellow-600 transition-colors text-sm"
              >
                Login
              </Link>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-700 dark:text-ivory hover:text-gold transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>

          {/* Mobile quick actions + menu (always visible on small screens) */}
          <div className="flex lg:hidden items-center gap-0.5 sm:gap-1">
            <Link 
              to="/search"
              className="p-2 text-gray-700 dark:text-ivory hover:text-gold transition-colors"
              aria-label="Search"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Search size={20} />
            </Link>

            <Link 
              to="/wishlist" 
              className="relative p-2 text-gray-700 dark:text-ivory hover:text-gold transition-colors"
              aria-label="Wishlist"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Link>

            <Link 
              to="/cart" 
              className="relative p-2 text-gray-700 dark:text-ivory hover:text-gold transition-colors"
              aria-label="Cart"
              onClick={() => setMobileMenuOpen(false)}
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <Link
                to="/profile"
                className="p-2 text-gray-700 dark:text-ivory hover:text-gold transition-colors"
                aria-label="Profile"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User size={20} />
              </Link>
            ) : (
              <Link
                to="/login"
                className="ml-0.5 px-2.5 sm:px-3 py-1.5 bg-gold text-white rounded-full text-xs sm:text-sm font-semibold hover:bg-yellow-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-700 dark:text-ivory"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-medium px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === link.to
                      ? 'text-gold bg-gold/10'
                      : 'text-gray-700 dark:text-ivory hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Admin Link in Mobile */}
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium px-4 py-3 rounded-lg text-gold bg-gold/10"
                >
                  Admin Panel
                </Link>
              )}

              <div className="border-t border-gray-200 dark:border-zinc-800 pt-4 mt-2 px-4">
                {user ? (
                  <>
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-ivory">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex gap-2 mb-4">
                      <Link
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-sm text-center text-gray-700 dark:text-ivory"
                      >
                        Profile
                      </Link>
                      <Link
                        to="/wishlist"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-sm text-center text-gray-700 dark:text-ivory"
                      >
                        Wishlist ({wishlist.length})
                      </Link>
                      <Link
                        to="/cart"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-sm text-center text-gray-700 dark:text-ivory"
                      >
                        Cart ({cartCount})
                      </Link>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 bg-red-500 text-white rounded-full text-sm font-semibold"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2 mb-3">
                      <Link
                        to="/cart"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-sm text-center text-gray-700 dark:text-ivory"
                      >
                        Cart ({cartCount})
                      </Link>
                      <Link
                        to="/wishlist"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-sm text-center text-gray-700 dark:text-ivory"
                      >
                        Wishlist
                      </Link>
                    </div>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full px-4 py-2 bg-gold text-white rounded-full text-center font-semibold"
                    >
                      Login
                    </Link>
                  </>
                )}
              </div>

              {/* Theme Toggle Mobile */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-3 text-gray-700 dark:text-ivory hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                <span className="text-sm">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}