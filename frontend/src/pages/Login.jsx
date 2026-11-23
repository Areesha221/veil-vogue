import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import PasswordInput from '../components/ui/PasswordInput';
import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';
import { getRememberedEmail, setRememberedEmail } from '../utils/authStorage';

export default function Login() {
  usePageMeta({
    title: 'Login',
    description: 'Login to your Veil & Vogue account to manage orders, profile, and wishlist. Guest checkout is also available.'
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Load remembered email on mount (prefill convenience; user can still uncheck "Remember me")
  useEffect(() => {
    const savedEmail = getRememberedEmail();
    if (savedEmail) {
      setEmail((prev) => prev || savedEmail);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // rememberMe controls auth session persistence (localStorage vs sessionStorage)
      const loggedInUser = await login(email, password, rememberMe);
      if (!loggedInUser) return;

      // Keep remembered-email convenience for next visit; rememberMe controls session persistence only
      setRememberedEmail(email);

      navigate(loggedInUser.role === 'admin' ? '/admin' : '/');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Enter key on email field - move focus to password
  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const passwordInput = document.getElementById('password-input');
      if (passwordInput) {
        passwordInput.focus();
      }
    }
  };

  return (
    <div className="pt-32 pb-20 min-h-screen bg-gradient-to-br from-ivory via-cream to-beige dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold mb-2 text-gray-900 dark:text-ivory">Welcome Back</h1>
            <p className="text-gray-600 dark:text-gray-400">Login to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Email</label>
              <div className="relative">
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleEmailKeyDown}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 pl-12 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                  required
                  autoComplete="email"
                />
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Password</label>
              <PasswordInput
                id="password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pl-12 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-gold focus:ring-gold w-4 h-4"
                />
                <span className="text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-gold hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-white py-3 rounded-full font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-gold hover:underline font-semibold">
              Register
            </Link>
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-10">
        <ProductsStrip
          title="Abayas Collection"
          subtitle="Shop abayas and other products as guest or after login"
          category="abayas"
          sortBy="sold"
          limit={4}
          viewAllTo="/shop/abayas"
        />
      </div>
    </div>
  );
}