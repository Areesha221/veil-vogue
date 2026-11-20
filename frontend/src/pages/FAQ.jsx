import ProductsStrip from '../components/shop/ProductsStrip';
import usePageMeta from '../hooks/usePageMeta';

export default function FAQ() {
  usePageMeta({
    title: 'FAQs',
    description: 'Frequently asked questions about Veil & Vogue delivery, payments, exchanges, and customer support in Pakistan.'
  });
  const faqs = [
    {
      q: 'Do you deliver all over Pakistan?',
      a: 'Yes, we offer nationwide delivery across Pakistan.',
    },
    {
      q: 'How long does delivery take?',
      a: 'Standard delivery usually takes 3-5 business days. Express options may be available in selected areas.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept Cash on Delivery, Bank Transfer, JazzCash, and other available methods shown at checkout.',
    },
    {
      q: 'Can I exchange an item?',
      a: 'Yes, eligible items can be exchanged within 7 days of delivery if they are unused and in original condition.',
    },
    {
      q: 'How can I contact support?',
      a: 'You can reach us via the Contact page, email, or WhatsApp for order and product support.',
    },
  ];

  return (
    <div className="min-h-screen bg-ivory dark:bg-zinc-950 pt-32 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 dark:text-ivory mb-8 text-center">
            Frequently Asked Questions
          </h1>
          <div className="space-y-4">
            {faqs.map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-5 md:p-6">
                <h2 className="font-semibold text-lg text-gray-900 dark:text-ivory mb-2">{item.q}</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <ProductsStrip
          title="Frequently Loved Products"
          subtitle="Best sellers from our hijab and abaya collections"
          onlyBestSeller
          sortBy="sold"
          limit={4}
          viewAllTo="/shop"
        />
      </div>
    </div>
  );
}
