import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

(() => {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env'),
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
    break;
  }
})();

import { User } from '../models/User';
import { Category, Brand, Subcategory } from '../models/Category';
import { Product } from '../models/Product';
import { Coupon } from '../models/Coupon';

const PLACEHOLDER =
  'https://res.cloudinary.com/demo/image/upload/sample.jpg';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  await mongoose.connection.dropDatabase();
  console.log('Dropped existing database');

  const admin = await User.create({
    email: process.env.ADMIN_EMAIL || 'admin@ayezacosmetics.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123!',
    firstName: 'Ayeza',
    lastName: 'Admin',
    role: 'admin',
    isEmailVerified: true,
    isActive: true,
  });

  const customer = await User.create({
    email: 'customer@ayezacosmetics.com',
    password: 'Customer@123!',
    firstName: 'Sara',
    lastName: 'Khan',
    role: 'customer',
    isEmailVerified: true,
    isActive: true,
    phone: '+923001234567',
  });

  const brands = await Brand.insertMany([
    { name: 'Ayeza Luxe', slug: 'ayeza-luxe', description: 'Signature house brand', isActive: true, logo: { url: PLACEHOLDER, publicId: 'demo' } },
    { name: 'Rose Atelier', slug: 'rose-atelier', description: 'Rose-gold inspired beauty', isActive: true, logo: { url: PLACEHOLDER, publicId: 'demo' } },
    { name: 'Noir Beauty', slug: 'noir-beauty', description: 'Bold evening looks', isActive: true, logo: { url: PLACEHOLDER, publicId: 'demo' } },
  ]);

  const categories = await Category.insertMany([
    { name: 'Skincare', slug: 'skincare', description: 'Glow essentials', isActive: true, order: 1, image: { url: PLACEHOLDER, publicId: 'demo' } },
    { name: 'Makeup', slug: 'makeup', description: 'Luxury colour cosmetics', isActive: true, order: 2, image: { url: PLACEHOLDER, publicId: 'demo' } },
    { name: 'Fragrances', slug: 'fragrances', description: 'Signature scents', isActive: true, order: 3, image: { url: PLACEHOLDER, publicId: 'demo' } },
    { name: 'Hair Care', slug: 'hair-care', description: 'Silken hair rituals', isActive: true, order: 4, image: { url: PLACEHOLDER, publicId: 'demo' } },
  ]);

  const subcategories = await Subcategory.insertMany([
    { name: 'Serums', slug: 'serums', category: categories[0]._id, isActive: true, order: 1 },
    { name: 'Lipstick', slug: 'lipstick', category: categories[1]._id, isActive: true, order: 1 },
    { name: 'Eau de Parfum', slug: 'eau-de-parfum', category: categories[2]._id, isActive: true, order: 1 },
  ]);

  const products = [
    {
      name: 'Radiant Rose Serum',
      slug: 'radiant-rose-serum',
      description: 'A lightweight rosehip and vitamin C serum that brightens, hydrates, and restores luminosity for a refined glass-skin finish.',
      shortDescription: 'Brightening rosehip vitamin C serum',
      sku: 'AYZ-SK-001',
      category: categories[0]._id,
      subcategory: subcategories[0]._id,
      brand: brands[0]._id,
      images: [{ url: PLACEHOLDER, publicId: 'demo', alt: 'Radiant Rose Serum', isMain: true }],
      basePrice: 4500,
      compareAtPrice: 5500,
      stock: 48,
      lowStockThreshold: 8,
      tags: ['serum', 'skincare', 'vitamin-c'],
      isFeatured: true,
      isActive: true,
      rating: 4.8,
      reviewCount: 0,
      soldCount: 120,
      discount: { type: 'percentage' as const, value: 15 },
      variants: [
        { name: 'Size', value: '30ml', sku: 'AYZ-SK-001-30', price: 4500, stock: 30, isActive: true },
        { name: 'Size', value: '50ml', sku: 'AYZ-SK-001-50', price: 6200, stock: 18, isActive: true },
      ],
    },
    {
      name: 'Velvet Rose Lipstick',
      slug: 'velvet-rose-lipstick',
      description: 'A creamy matte lipstick with rose-gold undertones and 12-hour wear. Enriched with jojoba for a comfortable, non-drying finish.',
      shortDescription: 'Long-wear matte lipstick',
      sku: 'AYZ-MK-002',
      category: categories[1]._id,
      subcategory: subcategories[1]._id,
      brand: brands[1]._id,
      images: [{ url: PLACEHOLDER, publicId: 'demo', alt: 'Velvet Rose Lipstick', isMain: true }],
      basePrice: 2800,
      compareAtPrice: 3200,
      stock: 75,
      tags: ['lipstick', 'makeup', 'matte'],
      isFeatured: true,
      isActive: true,
      rating: 4.6,
      reviewCount: 0,
      soldCount: 210,
      variants: [
        { name: 'Shade', value: 'Rose Blush', sku: 'AYZ-MK-002-RB', price: 2800, stock: 25, isActive: true },
        { name: 'Shade', value: 'Berry Noir', sku: 'AYZ-MK-002-BN', price: 2800, stock: 25, isActive: true },
        { name: 'Shade', value: 'Nude Silk', sku: 'AYZ-MK-002-NS', price: 2800, stock: 25, isActive: true },
      ],
    },
    {
      name: 'Midnight Orchid Perfume',
      slug: 'midnight-orchid-perfume',
      description: 'An elegant eau de parfum with notes of orchid, sandalwood, and warm amber. A lasting signature scent for evening wear.',
      shortDescription: 'Orchid sandalwood eau de parfum',
      sku: 'AYZ-FR-003',
      category: categories[2]._id,
      subcategory: subcategories[2]._id,
      brand: brands[2]._id,
      images: [{ url: PLACEHOLDER, publicId: 'demo', alt: 'Midnight Orchid Perfume', isMain: true }],
      basePrice: 8900,
      compareAtPrice: 9900,
      stock: 32,
      tags: ['perfume', 'fragrance'],
      isFeatured: true,
      isActive: true,
      rating: 4.9,
      reviewCount: 0,
      soldCount: 88,
      variants: [
        { name: 'Size', value: '50ml', sku: 'AYZ-FR-003-50', price: 8900, stock: 20, isActive: true },
        { name: 'Size', value: '100ml', sku: 'AYZ-FR-003-100', price: 12900, stock: 12, isActive: true },
      ],
    },
    {
      name: 'Silk Repair Hair Mask',
      slug: 'silk-repair-hair-mask',
      description: 'Intensive weekly hair mask with argan oil and silk proteins that restores shine and softness to dry, colour-treated hair.',
      shortDescription: 'Argan silk repair mask',
      sku: 'AYZ-HR-004',
      category: categories[3]._id,
      brand: brands[0]._id,
      images: [{ url: PLACEHOLDER, publicId: 'demo', alt: 'Silk Repair Hair Mask', isMain: true }],
      basePrice: 3600,
      stock: 40,
      tags: ['hair', 'mask'],
      isFeatured: false,
      isActive: true,
      rating: 4.5,
      reviewCount: 0,
      soldCount: 54,
      variants: [],
    },
    {
      name: 'Luminous Foundation SPF 25',
      slug: 'luminous-foundation-spf-25',
      description: 'Buildable medium coverage foundation with a luminous finish and SPF 25. Blurs imperfections while keeping skin breathable.',
      shortDescription: 'Luminous medium coverage foundation',
      sku: 'AYZ-MK-005',
      category: categories[1]._id,
      brand: brands[1]._id,
      images: [{ url: PLACEHOLDER, publicId: 'demo', alt: 'Luminous Foundation', isMain: true }],
      basePrice: 5200,
      compareAtPrice: 6000,
      stock: 60,
      tags: ['foundation', 'makeup'],
      isFeatured: true,
      isActive: true,
      rating: 4.7,
      reviewCount: 0,
      soldCount: 160,
      discount: { type: 'fixed' as const, value: 500 },
      variants: [
        { name: 'Shade', value: 'Ivory', sku: 'AYZ-MK-005-IV', price: 5200, stock: 20, isActive: true },
        { name: 'Shade', value: 'Beige', sku: 'AYZ-MK-005-BG', price: 5200, stock: 20, isActive: true },
        { name: 'Shade', value: 'Tan', sku: 'AYZ-MK-005-TN', price: 5200, stock: 20, isActive: true },
      ],
    },
    {
      name: 'Hydra Glow Moisturizer',
      slug: 'hydra-glow-moisturizer',
      description: 'A ceramide-rich daily moisturizer that locks in hydration for 24 hours and strengthens the skin barrier.',
      shortDescription: 'Ceramide daily moisturizer',
      sku: 'AYZ-SK-006',
      category: categories[0]._id,
      brand: brands[0]._id,
      images: [{ url: PLACEHOLDER, publicId: 'demo', alt: 'Hydra Glow Moisturizer', isMain: true }],
      basePrice: 3900,
      stock: 55,
      tags: ['moisturizer', 'skincare'],
      isFeatured: false,
      isActive: true,
      rating: 4.4,
      reviewCount: 0,
      soldCount: 97,
      variants: [],
    },
  ];

  await Product.insertMany(products);

  await Coupon.create({
    code: 'AYEZA15',
    type: 'percentage',
    value: 15,
    minOrderAmount: 3000,
    maxDiscountAmount: 2000,
    usageLimit: 1000,
    usageCount: 0,
    isActive: true,
  });

  await Coupon.create({
    code: 'FREESHIP',
    type: 'free_shipping',
    value: 0,
    minOrderAmount: 2000,
    usageCount: 0,
    isActive: true,
  });

  console.log('Seed complete');
  console.log({
    admin: admin.email,
    customer: customer.email,
    brands: brands.length,
    categories: categories.length,
    products: products.length,
  });

  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
