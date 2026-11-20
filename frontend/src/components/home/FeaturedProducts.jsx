import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import ProductCard from '../shop/ProductCard';

const FeaturedProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/products`);
        const list = Array.isArray(data) ? data : (Array.isArray(data?.products) ? data.products : []);
        if (!cancelled) setProducts(list);
      } catch (error) {
        console.error('Error fetching products:', error);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProducts();
    return () => { cancelled = true; };
  }, []);

  const featured = useMemo(() => {
    if (!products.length) return [];
    const picked = products.filter((p) => p?.isFeatured || p?.isBestSeller || p?.isNewArrival);
    return (picked.length ? picked : products).slice(0, 8);
  }, [products]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="text-2xl font-serif">Loading Products...</div>
      </div>
    );
  }

  if (!featured.length) {
    return (
      <div className="py-16 text-center">
        <div className="text-xl text-gray-500">No products available</div>
      </div>
    );
  }

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-10">
          <h2 className="font-serif text-4xl font-bold text-gray-900 dark:text-ivory">
            Featured Collection
          </h2>
          <Link to="/shop" className="text-gold font-semibold hover:underline">View All Products</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {featured.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;