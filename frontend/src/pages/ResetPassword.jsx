import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import PasswordInput from '../components/ui/PasswordInput';
import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

export default function ResetPassword() {
  usePageMeta({
    title: 'Reset Password',
    description: 'Create a new password for your Veil & Vogue account.'
  });
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!token) {
      toast.error('Invalid reset link. Please request a new password reset email.');
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/api/auth/reset-password/${encodeURIComponent(token)}`, { password });
      toast.success('Password reset successful! Please login with your new password.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-20 min-h-screen bg-gradient-to-br from-ivory via-cream to-beige dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900">
      <div className="max-w-md mx-auto px-4">
        <Link to="/login" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gold mb-8">
          <ArrowLeft size={20} />
          Back to Login
        </Link>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gold/20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Lock size={32} className="text-gold" />
            </div>
            <h1 className="font-serif text-3xl font-bold mb-2 text-gray-900 dark:text-ivory">
              Reset Password
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your new password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">
                New Password
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">
                Confirm Password
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-white py-3 rounded-full font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-10">
        <ProductsStrip
          title="Popular Products"
          subtitle="Explore best-selling products with images and prices"
          onlyBestSeller
          sortBy="sold"
          limit={4}
          viewAllTo="/shop"
        />
      </div>
    </div>
  );
}