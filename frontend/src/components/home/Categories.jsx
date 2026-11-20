import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get('/api/categories');
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="text-2xl font-serif">Loading Categories...</div>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-xl text-gray-500">No categories available</div>
      </div>
    );
  }

  const categoryData = [
    { name: 'Hijabs', image: 'https://images.unsplash.com/photo-1611042553484-d61f84d22784?w=600', slug: 'hijabs' },
    { name: 'Abayas', image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600', slug: 'abayas' },
    { name: 'Hijab Pins', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600', slug: 'pins' },
    { name: 'Scrunchies', image: 'https://images.unsplash.com/photo-1596468138838-6d09a1c1b45b?w=600', slug: 'scrunchies' },
    { name: 'Hijab Caps', image: 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=600', slug: 'caps' },
    { name: 'Accessories', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600', slug: 'accessories' }
  ];

  return (
    <section className="py-16 px-4 bg-cream dark:bg-zinc-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-serif text-4xl font-bold text-center mb-12 text-gray-900 dark:text-ivory">
          Shop by Category
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categoryData.map((category, index) => (
            <Link
              key={index}
              to={`/shop/${category.slug}`}
              className="group"
            >
              <div className="relative overflow-hidden rounded-xl aspect-square mb-3">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-serif text-lg font-semibold">
                    {category.name}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;