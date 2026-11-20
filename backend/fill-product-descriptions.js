import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

const buildDescription = (p) => {
  const name = p?.name || 'This product';
  const cat = p?.category?.name || p?.subcategory || '';
  const fabric = (p?.fabric || p?.material || '').toString().trim();
  const tags = Array.isArray(p?.tags) ? p.tags.filter(Boolean) : [];
  const price = Number.isFinite(Number(p?.price)) ? Number(p.price) : null;
  const compareAt = Number.isFinite(Number(p?.compareAtPrice)) ? Number(p.compareAtPrice) : null;
  const stock = typeof p?.stock === 'number' ? p.stock : null;
  const rating = Number.isFinite(Number(p?.rating)) ? Number(p.rating) : null;
  const reviews = Number.isFinite(Number(p?.numReviews)) ? Number(p.numReviews) : null;
  const sold = Number.isFinite(Number(p?.sold)) ? Number(p.sold) : null;

  const parts = [];
  parts.push(`${name}${cat ? ` is a premium ${String(cat).toLowerCase().replace(/s$/, '')}` : ' is a premium product'} from Veil & Vogue, designed for comfort, elegance, and modest style.`);
  if (fabric) parts.push(`Fabric/Material: ${fabric}.`);
  if (tags.length) parts.push(`Highlights: ${tags.slice(0, 10).join(', ')}.`);
  if (price !== null) {
    parts.push(compareAt && compareAt > price
      ? `Price: PKR ${price.toLocaleString()} (was PKR ${compareAt.toLocaleString()}).`
      : `Price: PKR ${price.toLocaleString()}.`);
  }
  if (stock !== null) parts.push(stock > 0 ? `Availability: In stock (${stock} available).` : 'Availability: Currently out of stock.');
  const meta = [];
  if (sold !== null && sold > 0) meta.push(`${sold} sold`);
  if (rating !== null && rating > 0) meta.push(`${rating}/5 rating${reviews ? ` (${reviews} reviews)` : ''}`);
  if (p?.isBestSeller) meta.push('best seller');
  if (p?.isNewArrival) meta.push('new arrival');
  if (p?.isFeatured) meta.push('featured');
  if (meta.length) parts.push(`Product details: ${meta.join(', ')}.`);
  parts.push('Please check product images and details on the page for color, styling, and the latest information.');
  return parts.join(' ');
};

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in backend/.env');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const products = await Product.find({}).populate('category', 'name slug');
    let updated = 0;
    let skipped = 0;

    for (const p of products) {
      const desc = (p.description || '').toString().trim();
      if (desc.length >= 20) {
        skipped += 1;
        continue;
      }
      p.description = buildDescription(p);
      await p.save();
      updated += 1;
      console.log(`Updated description: ${p.name}`);
    }

    console.log(`Done. Updated: ${updated}, Skipped (already had description): ${skipped}, Total: ${products.length}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to fill product descriptions:', error);
    process.exit(1);
  }
};

run();