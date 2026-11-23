import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  // AI Assistant ko open karne ka function
  const openAIAssistant = () => {
    // Custom event dispatch karein jo AIAssistant component sun raha hai
    window.dispatchEvent(new CustomEvent('openAIAssistant'));

    // Smooth scroll thora neeche taake AI button dikh jaye
    setTimeout(() => {
      window.scrollTo({
        top: window.innerHeight * 0.7,
        behavior: 'smooth'
      });
    }, 300);
  };

  return (
    <section className="relative min-h-screen flex items-center pt-16 md:pt-19 lg:pt-23 overflow-hidden bg-gradient-to-br from-ivory via-cream to-beige dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900">
      {/* Decorative circles */}
      <div className="absolute top-20 left-10 w-48 sm:w-56 md:w-72 h-48 sm:h-56 md:h-72 bg-gold/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-56 sm:w-72 md:w-96 h-56 sm:h-72 md:h-96 bg-soft-gold/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-2 gap-8 md:gap-12 items-center relative z-10 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="px-2 sm:px-0"
        >
          {/* Badge - Responsive */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gold/10 border border-gold/30 mb-4 sm:mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-xs sm:text-sm font-medium text-gold">New Summer Collection 2026</span>
          </motion.div>

          {/* Title - Responsive */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight mb-4 sm:mb-6 text-gray-900 dark:text-ivory whitespace-nowrap">
            <span>Veil & </span>
            <span className="text-gold">Vogue</span>
          </h1>

          {/* Subtitle - Responsive */}
          <p className="font-serif italic text-lg sm:text-xl md:text-2xl text-gold mb-4 sm:mb-6">
            Where Modesty Meets Elegance
          </p>

          {/* Description - Responsive */}
          <p className="text-sm sm:text-base md:text-lg text-gray-700 dark:text-ivory/80 mb-6 sm:mb-8 max-w-xl leading-relaxed px-2 sm:px-0">
            Discover premium hijabs, elegant abayas, stylish accessories, and timeless modest fashion designed for the modern woman.
          </p>

          {/* Buttons - Responsive */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 px-2 sm:px-0">
            <Link
              to="/shop"
              className="group inline-flex items-center justify-center gap-2 bg-deep-black dark:bg-ivory text-ivory dark:text-deep-black px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold hover:scale-105 transition-transform shadow-xl text-sm sm:text-base"
            >
              Shop Now
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={openAIAssistant}
              className="group inline-flex items-center justify-center gap-2 border-2 border-gold text-gold px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold hover:bg-gold hover:text-white transition-all shadow-xl hover:scale-105 text-sm sm:text-base"
            >
              <Sparkles size={18} className="group-hover:animate-pulse" />
              Try AI Assistant
            </button>
          </div>

          {/* Stats - Responsive */}
          <div className="flex gap-4 sm:gap-6 md:gap-8 mt-8 sm:mt-12 px-2 sm:px-0">
            <div>
              <div className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-gold">500+</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-ivory/70">Products</div>
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-gold">10K+</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-ivory/70">Happy Customers</div>
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-gold">4.9★</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-ivory/70">Rating</div>
            </div>
          </div>
        </motion.div>

        {/* Image - Responsive */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative flex justify-center px-4 sm:px-0"
        >
          <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-float">
            <div className="absolute inset-0 gold-gradient opacity-20" />
            <img
              src="https://images.unsplash.com/photo-1611042553484-d61f84d22784?w=800&q=80"
              alt="Premium modest fashion"
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
          {/* Badges - Responsive */}
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-2 sm:-top-4 -right-2 sm:-right-4 glass rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-xl"
          >
            <div className="font-serif text-lg sm:text-xl font-bold text-gold">-30%</div>
            <div className="text-xs">Summer Sale</div>
          </motion.div>
          <motion.div
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute -bottom-2 sm:-bottom-4 -left-2 sm:-left-4 glass rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-xl"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400">Free Shipping</div>
            <div className="font-semibold text-xs sm:text-sm">Over PKR 3000</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}