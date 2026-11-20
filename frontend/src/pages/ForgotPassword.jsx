import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

export default function ForgotPassword() {
  usePageMeta({
    title: 'Forgot Password',
    description: 'Reset your Veil & Vogue account password securely.'
  });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email: email.trim().toLowerCase() });
      setSent(true);
      setResetUrl(data.resetUrl || ''); // shown if backend provides it
      toast.success(data.message || 'Password reset link sent');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset link. Please make sure the server is running.');
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
          {!sent ? (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gold/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Mail size={32} className="text-gold" />
                </div>
                <h1 className="font-serif text-3xl font-bold mb-2 text-gray-900 dark:text-ivory">
                  Forgot Password?
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter your email and we'll send you a reset link
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold text-white py-3 rounded-full font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Mail size={32} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="font-serif text-2xl font-bold mb-4 text-gray-900 dark:text-ivory">
                Check Your Email
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              
              {/* Remove this in production - just for testing */}
              {resetUrl && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-2 font-semibold">
                    Demo Mode - Reset Link:
                  </p>
                  <a 
                    href={resetUrl} 
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {resetUrl}
                  </a>
                </div>
              )}

              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="text-gold hover:underline"
              >
                Send to different email
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-10">
        <ProductsStrip
          title="Popular Products"
          subtitle="Browse best-selling abayas, hijabs, and accessories"
          onlyBestSeller
          sortBy="sold"
          limit={4}
          viewAllTo="/shop"
        />
      </div>
    </div>
  );
}