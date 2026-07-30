import express, { Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { STORE_CONTACT } from '../shared';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const router = express.Router();

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional(),
  subject: z.string().min(3).max(150),
  message: z.string().min(10).max(2000),
});

router.post('/', validate(contactSchema), async (req: Request, res: Response) => {
  const { name, email, phone, subject, message } = req.body;

  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASSWORD || '').replace(/\s+/g, '');

  if (!user || !pass) {
    logger.warn('Contact form submitted but SMTP not configured');
    return res.status(503).json({
      success: false,
      message: 'Contact form is temporarily unavailable. Please call us directly.',
    });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || user,
    to: process.env.ADMIN_EMAIL || STORE_CONTACT.email,
    replyTo: email,
    subject: `[AYEZA Contact] ${subject}`,
    html: `
      <h2>New Contact Message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
      <p><strong>Subject:</strong> ${subject}</p>
      <hr/>
      <p>${message.replace(/\n/g, '<br/>')}</p>
    `,
  });

  res.status(201).json({ success: true, message: 'Message sent successfully. We will reply soon.' });
});

export default router;
