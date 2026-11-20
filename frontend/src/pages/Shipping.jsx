import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

export default function Shipping() {
  usePageMeta({
    title: 'Shipping Information',
    description: 'Veil & Vogue shipping details: delivery times, charges, free shipping threshold, and nationwide delivery across Pakistan.'
  });
  return (
    <div className="min-h-screen bg-ivory dark:bg-zinc-950 pt-32 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-gray-100 dark:border-zinc-800 p-6 md:p-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 dark:text-ivory mb-6">Shipping Information</h1>
          <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>We deliver across Pakistan with care and reliable service.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Standard Delivery:</strong> 3-5 business days (PKR 200).</li>
              <li><strong>Express Delivery:</strong> 1-2 business days where available (PKR 400).</li>
              <li><strong>Free Shipping:</strong> On orders over PKR 3,000.</li>
              <li><strong>Processing Time:</strong> Orders are usually processed within 24-48 hours.</li>
            </ul>
            <p>Once your order is shipped, you will receive confirmation and tracking details when available.</p>
          </div>
        </div>

        <ProductsStrip
          title="Popular Products to Ship"
          subtitle="Best-selling hijabs, abayas, and accessories"
          onlyBestSeller
          sortBy="sold"
          limit={4}
          viewAllTo="/shop"
        />
      </div>
    </div>
  );
}
