import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger';

export const configureCloudinary = (): void => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  logger.info('☁️ Cloudinary configured');
};

export const deleteCloudinaryImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`🗑️ Deleted Cloudinary image: ${publicId}`);
  } catch (error) {
    logger.error(`Failed to delete Cloudinary image ${publicId}:`, error);
    throw error;
  }
};

export const getOptimizedUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    format?: string;
    quality?: string | number;
    crop?: string;
  } = {}
): string => {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    ...options,
  });
};

export { cloudinary };
