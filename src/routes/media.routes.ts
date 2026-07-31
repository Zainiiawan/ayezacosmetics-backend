import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { uploadLimiter } from '../middleware/rateLimiter';
import { authenticate, requireEmailVerification, adminOnly } from '../middleware/auth';
import { MAX_IMAGE_SIZE, IMAGE_FORMATS, VIDEO_FORMATS, MAX_VIDEO_SIZE } from '../shared';
import { BadRequestError } from '../utils/errors';
import { testSmtpConnection } from '../utils/email';

const router = express.Router();

const isServerless =
  process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

/** Local disk only when not on serverless (Vercel filesystem is read-only) */
let uploadsDir: string | null = null;
if (!isServerless) {
  try {
    uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch {
    uploadsDir = null;
  }
}

const storage =
  uploadsDir && !isServerless
    ? multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadsDir!),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
        },
      })
    : multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: Math.max(MAX_IMAGE_SIZE, MAX_VIDEO_SIZE) },
  fileFilter: (_req, file, cb) => {
    const isImage = (IMAGE_FORMATS as readonly string[]).includes(file.mimetype);
    const isVideo = (VIDEO_FORMATS as readonly string[]).includes(file.mimetype);
    if (!isImage && !isVideo) {
      return cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
    cb(null, true);
  },
});

const hasRealCloudinary = () => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return Boolean(name && key && secret && name !== 'demo' && key !== 'demo');
};

const uploadToCloudinary = async (file: Express.Multer.File) => {
  const isVideo = (VIDEO_FORMATS as readonly string[]).includes(file.mimetype);
  const resourceType = isVideo ? 'video' : 'image';

  if (file.buffer) {
    return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'ayeza-cosmetics', resource_type: resourceType },
        (err, result) => {
          if (err || !result) reject(err || new Error('Cloudinary upload failed'));
          else resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );
      stream.end(file.buffer);
    });
  }
  const result = await cloudinary.uploader.upload(file.path, {
    folder: 'ayeza-cosmetics',
    resource_type: resourceType,
  });
  return { secure_url: result.secure_url, public_id: result.public_id };
};

router.post(
  '/upload',
  authenticate,
  requireEmailVerification,
  uploadLimiter,
  upload.array('files', 8),
  async (req: Request, res: Response) => {
    const files = (req.files ?? []) as Express.Multer.File[];
    if (!files.length) throw new BadRequestError('No files uploaded');

    const uploads = [];
    for (const file of files) {
      if (hasRealCloudinary()) {
        try {
          const result = await uploadToCloudinary(file);
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          uploads.push({
            url: result.secure_url,
            publicId: result.public_id,
            alt: file.originalname,
          });
          continue;
        } catch {
          // fall through to local (dev only)
        }
      }

      if (isServerless || !file.filename) {
        throw new BadRequestError(
          'Image upload requires Cloudinary in production. Configure CLOUDINARY_* env vars.'
        );
      }

      const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5001}`;
      uploads.push({
        url: `${baseUrl}/uploads/${file.filename}`,
        publicId: file.filename,
        alt: file.originalname,
      });
    }

    res.status(201).json({ success: true, message: 'Upload successful', data: uploads });
  }
);

router.get('/smtp-status', adminOnly, async (_req: Request, res: Response) => {
  const result = await testSmtpConnection();
  res.json({ success: result.ok, message: result.message, data: result });
});

export default router;
