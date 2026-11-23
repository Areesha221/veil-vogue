import { Heart, Award, Truck, Shield } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';

export default function About() {
  usePageMeta({
    title: 'About Us',
    description: 'Learn about Veil & Vogue, our story, quality standards, and premium modest fashion collections including hijabs and abayas.'
  });
  const features = [
    { icon: Heart, title: 'Premium Quality', desc: 'Only the finest fabrics and materials' },
    { icon: Award, title: 'Elegant Designs', desc: 'Curated by expert fashion stylists' },
    { icon: Truck, title: 'Fast Delivery', desc: 'Nationwide delivery in 3-5 days' },
    { icon: Shield, title: 'Secure Shopping', desc: '100% safe and encrypted payments' }
  ];

  return (
    <div className="pt-28 md:pt-32 pb-20 min-h-screen bg-ivory dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="font-serif text-5xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-ivory">
            About <span className="text-gold">Veil & Vogue</span>
          </h1>
          <p className="font-serif italic text-2xl text-gold mb-4">
            Where Modesty Meets Elegance
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            We are a premium modest fashion brand dedicated to empowering modern women
            with elegant, high-quality hijabs, abayas, and accessories that celebrate
            both tradition and contemporary style.
          </p>
        </div>

        {/* Story */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <img
              src="https://images.unsplash.com/photo-1611042553484-d61f84d22784?w=800"
              alt="Our Story"
              className="rounded-2xl shadow-2xl"
            />
          </div>
          <div>
            <h2 className="font-serif text-4xl font-bold mb-6 text-gray-900 dark:text-ivory">
              Our Story
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Founded with a passion for modest fashion, Veil & Vogue has grown from a
              small boutique to a leading name in premium modest wear. We believe that
              every woman deserves to feel confident, elegant, and true to her values.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Our collections are carefully curated to offer the perfect blend of
              tradition and modernity, using only the finest fabrics and craftsmanship
              from around the world.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg text-center hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-gold/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Icon size={32} className="text-gold" />
                </div>
                <h3 className="font-serif text-xl font-bold mb-2 text-gray-900 dark:text-ivory">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <h2 className="font-serif text-3xl font-bold mb-4 text-gray-900 dark:text-ivory">
            Ready to Experience Elegance?
          </h2>
          <a
            href="/shop"
            className="inline-block bg-gold text-white px-8 py-4 rounded-full font-semibold hover:bg-yellow-600 transition-colors"
          >
            Shop Now
          </a>
        </div>
      </div>
    </div>
  );
}