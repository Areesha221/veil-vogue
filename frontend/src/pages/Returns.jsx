import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

export default function Returns() {
  usePageMeta({
    title: 'Returns & Exchanges',
    description: 'Veil & Vogue returns and exchange policy, eligibility conditions, and how to contact support for damaged or wrong items.'
  });
  return (
    <div className="min-h-screen bg-ivory dark:bg-zinc-950 pt-32 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-gray-100 dark:border-zinc-800 p-6 md:p-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 dark:text-ivory mb-6">Returns & Exchanges</h1>
          <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>Your satisfaction matters to us. If there is an issue with your order, we are here to help.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Exchange Window:</strong> Requests can be made within 7 days of delivery.</li>
              <li><strong>Condition:</strong> Items must be unused, unwashed, and in original packaging with tags.</li>
              <li><strong>Non-returnable items:</strong> Used items, sale/clearance items, or items damaged due to misuse may not be eligible.</li>
              <li><strong>Damaged/Wrong item:</strong> Please contact us with your order number and photos so we can resolve it quickly.</li>
            </ul>
            <p>To start a return or exchange, contact us at <a href="mailto:veilandvogue5320@gmail.com" className="text-gold hover:underline">veilandvogue5320@gmail.com</a> or WhatsApp.</p>
          </div>
        </div>

        <ProductsStrip
          title="Popular Picks"
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
