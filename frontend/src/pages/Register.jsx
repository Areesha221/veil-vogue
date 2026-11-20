import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import PasswordInput from '../components/ui/PasswordInput';
import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

export default function Register() {
  usePageMeta({
    title: 'Register',
    description: 'Create a Veil & Vogue account for order history, profile management, and registered-user updates.'
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const ok = await register(name, email, password);
      if (ok) navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Enter key - move focus to next field
  const handleKeyDown = (e, nextId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.getElementById(nextId);
      if (nextInput) nextInput.focus();
    }
  };

  return (
    <div className="pt-32 pb-20 min-h-screen bg-gradient-to-br from-ivory via-cream to-beige dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold mb-2 text-gray-900 dark:text-ivory">Create Account</h1>
            <p className="text-gray-600 dark:text-gray-400">Join Veil & Vogue today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Full Name</label>
              <div className="relative">
                <input
                  id="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'email-input')}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 pl-12 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                  required
                />
                <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Email</label>
              <div className="relative">
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'password-input')}
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
                onKeyDown={(e) => handleKeyDown(e, 'confirm-password-input')}
                placeholder="Create a password"
                className="w-full px-4 py-3 pl-12 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Confirm Password</label>
              <PasswordInput
                id="confirm-password-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 pl-12 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-white py-3 rounded-full font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-gold hover:underline font-semibold">
              Login
            </Link>
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-10">
        <ProductsStrip
          title="Discover Abayas & Hijabs"
          subtitle="Popular abayas and hijabs with images, fabrics, and prices"
          category="abayas"
          sortBy="sold"
          limit={4}
          viewAllTo="/shop/abayas"
        />
      </div>
    </div>
  );
}