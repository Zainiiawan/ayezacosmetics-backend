import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AYEZA COSMETICS API',
      version,
      description: 'Enterprise luxury cosmetics e-commerce REST API',
      contact: {
        name: 'AYEZA COSMETICS Team',
        email: 'dev@ayezacosmetics.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Products', description: 'Product management' },
      { name: 'Categories', description: 'Category management' },
      { name: 'Brands', description: 'Brand management' },
      { name: 'Cart', description: 'Shopping cart' },
      { name: 'Wishlist', description: 'Customer wishlist' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Reviews', description: 'Product reviews' },
      { name: 'Coupons', description: 'Coupons and discounts' },
      { name: 'Users', description: 'User management' },
      { name: 'Analytics', description: 'Admin analytics' },
      { name: 'Media', description: 'Media upload' },
      { name: 'Payments', description: 'Payment processing' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
