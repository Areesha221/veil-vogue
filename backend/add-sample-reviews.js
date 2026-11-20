import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

const SAMPLE_REVIEWERS = [
  { name: 'Ayesha K.', comment: 'Beautiful quality and exactly as shown in pictures. Fabric feels premium and delivery was on time.', rating: 5 },
  { name: 'Fatima R.', comment: 'Loved it! The color and finishing are really nice. I would definitely order again from Veil & Vogue.', rating: 5 },
  { name: 'Hira S.', comment: 'Very elegant and comfortable. Packaging was neat and the product matched the description well.', rating: 4 },
  { name: 'Mariam A.', comment: 'Great value for money. Stitching and material quality are better than I expected.', rating: 5 },
  { name: 'Noor J.', comment: 'Nice product overall. Looks classy and the fit/fall is good. Recommended.', rating: 4 }
];

const pickSamples = (idx) => {
  const a = SAMPLE_REVIEWERS[idx % SAMPLE_REVIEWERS.length];
  const b = SAMPLE_REVIEWERS[(idx + 2) % SAMPLE_REVIEWERS.length];
  const c = SAMPLE_REVIEWERS[(idx + 4) % SAMPLE_REVIEWERS.length];
  return [a, b, idx % 2 === 0 ? c : null].filter(Boolean);
};

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in backend/.env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const products = await Product.find({}).sort({ isBestSeller: -1, sold: -1, createdAt: -1 });
    if (!products.length) {
      console.log('No products found. Skipping sample reviews.');
      await mongoose.disconnect();
      process.exit(0);
    }

    let updated = 0;
    let skipped = 0;
    const targetCount = Math.min(products.length, 8);

    for (let i = 0; i < targetCount; i++) {
      const product = products[i];
      const existing = Array.isArray(product.reviews) ? product.reviews : [];

      // Avoid duplicating on repeated runs
      const hasSample = existing.some((r) => SAMPLE_REVIEWERS.some((s) => s.name === r.name && s.comment === r.comment));
      if (hasSample || existing.length >= 3) {
        skipped += 1;
        continue;
      }

      const samples = pickSamples(i).slice(0, Math.max(0, 3 - existing.length));
      const now = Date.now();
      samples.forEach((s, j) => {
        existing.push({
          user: new mongoose.Types.ObjectId(),
          name: s.name,
          rating: s.rating,
          comment: s.comment,
          createdAt: new Date(now - (j + i + 1) * 86400000)
        });
      });

      product.reviews = existing;
      product.numReviews = existing.length;
      product.rating = Number(
        (existing.reduce((sum, r) => sum + Number(r.rating || 0), 0) / existing.length).toFixed(1)
      );

      await product.save();
      updated += 1;
      console.log(`Added sample reviews: ${product.name} (${product.numReviews} reviews, ${product.rating}/5)`);
    }

    console.log(`Done. Updated: ${updated}, Skipped: ${skipped}, Total products scanned: ${targetCount}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to add sample reviews:', error);
    process.exit(1);
  }
};

run();
