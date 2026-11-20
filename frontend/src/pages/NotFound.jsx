import { Link } from 'react-router-dom';
import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

export default function NotFound() {
  usePageMeta({
    title: 'Page Not Found',
    description: 'The page you are looking for could not be found on Veil & Vogue.'
  });
  return (
    <div className="min-h-screen bg-ivory dark:bg-zinc-950 pt-32 pb-20 px-4">
      <div className="flex items-center justify-center">
        <div className="text-center max-w-xl">
          <h1 className="font-serif text-6xl md:text-7xl font-bold text-gold mb-4">404</h1>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-gray-900 dark:text-ivory mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Sorry, the page you are looking for does not exist or has been moved.
          </p>
          <Link
            to="/"
            className="inline-block bg-gold text-white px-8 py-3 rounded-full font-semibold hover:bg-yellow-600 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <ProductsStrip
          title="Explore Abayas & Best Sellers"
          subtitle="Browse available products with images and prices"
          category="abayas"
          sortBy="sold"
          limit={4}
          viewAllTo="/shop/abayas"
        />
      </div>
    </div>
  );
}
