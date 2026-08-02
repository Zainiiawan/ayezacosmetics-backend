import express, { Request, Response } from 'express';
import { z } from 'zod';
import { adminOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { Settings } from '../models/Settings';

const router = express.Router();

const settingsSchema = z.object({
  defaultShippingCost: z.number().min(0),
  freeShippingThreshold: z.number().min(0),
  vipThreshold: z.number().min(0).optional(),
});

// GET settings (public)
router.get('/', async (_req: Request, res: Response) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  res.json({ success: true, message: 'Settings fetched', data: settings });
});

// PUT update settings (Admin)
router.put('/', adminOnly, validate(settingsSchema), async (req: Request, res: Response) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create(req.body);
  } else {
    settings = await Settings.findOneAndUpdate({}, req.body, { new: true, runValidators: true });
  }
  res.json({ success: true, message: 'Settings updated', data: settings });
});

export default router;
