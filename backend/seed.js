import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import Category from './models/Category.js';
import User from './models/User.js';

dotenv.config();

const categories = [
  { name: 'Hijabs', slug: 'hijabs', description: 'Premium quality hijabs' },
  { name: 'Abayas', slug: 'abayas', description: 'Elegant and modest abayas' },
  { name: 'Hijab Pins', slug: 'pins', description: 'Decorative hijab pins' },
  { name: 'Scrunchies', slug: 'scrunchies', description: 'Stylish scrunchies' },
  { name: 'Hijab Caps', slug: 'caps', description: 'Comfortable hijab caps' },
  { name: 'Hair Catchers', slug: 'hair-catchers', description: 'Trendy hair catchers' },
  { name: 'Gift Hampers', slug: 'gift-hampers', description: 'Premium gift hampers' },
  { name: 'Accessories', slug: 'accessories', description: 'Fashion accessories' }
];

const products = [
  {
    name: 'Premium Chiffon Hijab - Black',
    slug: 'chiffon-hijab-black',
    description: 'Soft, breathable chiffon hijab perfect for everyday wear.',
    category: null,
    price: 1200,
    compareAtPrice: 1800,
    images: ['https://images.unsplash.com/photo-1611042553484-d61f84d22784?w=600'],
    stock: 50,
    rating: 4.8,
    numReviews: 12,
    isFeatured: true,
    isNewArrival: true
  },
  {
    name: 'Elegant Georgette Abaya',
    slug: 'georgette-abaya',
    description: 'Flowy georgette abaya with intricate embroidery.',
    category: null,
    price: 8500,
    images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'],
    stock: 20,
    rating: 4.9,
    numReviews: 8,
    isBestSeller: true
  },
  {
    name: 'Pearl Decorative Pin Set',
    slug: 'pearl-pin-set',
    description: 'Set of 5 elegant pearl pins for your hijab.',
    category: null,
    price: 650,
    images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600'],
    stock: 100,
    rating: 4.5,
    numReviews: 20
  },
  {
    name: 'Satin Scrunchie - Rose Gold',
    slug: 'satin-scrunchie-rose',
    description: 'Luxury satin scrunchie that protects your hair.',
    category: null,
    price: 450,
    images: ['https://images.unsplash.com/photo-1596468138838-6d09a1c1b45b?w=600'],
    stock: 80,
    rating: 4.7,
    numReviews: 15
  },
  {
    name: 'Jersey Hijab Cap - Nude',
    slug: 'jersey-cap-nude',
    description: 'Comfortable jersey hijab cap in nude color.',
    category: null,
    price: 350,
    images: ['https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=600'],
    stock: 120,
    rating: 4.6,
    numReviews: 25
  },
  {
    name: 'Flower Hair Catcher',
    slug: 'flower-hair-catcher',
    description: 'Beautiful flower hair catcher for elegant look.',
    category: null,
    price: 550,
    images: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600'],
    stock: 60,
    rating: 4.8,
    numReviews: 18,
    isNewArrival: true
  }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected for Seeding');

    await Product.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({});
    console.log('🗑️ Old data cleared');

    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ ${createdCategories.length} Categories created`);

    products[0].category = createdCategories[0]._id;
    products[1].category = createdCategories[1]._id;
    products[2].category = createdCategories[2]._id;
    products[3].category = createdCategories[3]._id;
    products[4].category = createdCategories[4]._id;
    products[5].category = createdCategories[5]._id;

    const createdProducts = await Product.insertMany(products);
    console.log(`✅ ${createdProducts.length} Products created`);

    // ✅ ADMIN USER CREATE
    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin@veilandvogue.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log(`✅ Admin user created: ${adminUser.email}`);

    // Test user
    const testUser = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'user123',
      role: 'user'
    });
    console.log(`✅ Test user created: ${testUser.email}`);

    console.log('🎉 Seeding Complete!');
    console.log('\n📝 LOGIN CREDENTIALS:');
    console.log('Admin: admin@veilandvogue.com / admin123');
    console.log('User: user@test.com / user123');
    
    process.exit();
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedData();