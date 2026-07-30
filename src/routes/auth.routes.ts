import express, { Request, Response } from 'express';
import passport from 'passport';
import { z } from 'zod';

import { validate } from '../middleware/validate';
import { adminOnly, authenticate, optionalAuthenticate, requireEmailVerification } from '../middleware/auth';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { generateRandomToken, hashToken, generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { User } from '../models/User';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendOtpEmail } from '../utils/email';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, updateProfileSchema, addressSchema, changePasswordSchema, verifyOtpSchema, resendOtpSchema } from '../shared';
import crypto from 'crypto';
import { Cart } from '../models/Cart';

const router = express.Router();

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

const generateOtp = (): string => {
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 1_000_000;
  return String(num).padStart(6, '0');
};

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between resends
const OTP_MAX_ATTEMPTS = 5;

router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response) => {
    const { firstName, lastName, email, password, phone } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail }).select('+otpCode +otpExpiry +otpAttempts +otpLastSent');

    if (existing && existing.isEmailVerified) {
      throw new ConflictError('An account with this email already exists. Please sign in.');
    }

    const otp = generateOtp();
    const otpHash = hashToken(otp);

    if (existing && !existing.isEmailVerified) {
      // Update the unverified account with fresh data + new OTP
      existing.firstName = firstName;
      existing.lastName = lastName;
      existing.password = password;
      existing.phone = phone;
      existing.otpCode = otpHash;
      existing.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
      existing.otpAttempts = 0;
      existing.otpLastSent = new Date();
      await existing.save();

      // If email delivery fails, do not proceed to OTP page.
      await sendOtpEmail(normalizedEmail, firstName, otp);

      return res.status(200).json({
        success: true,
        message: 'Verification code sent to your email.',
        data: { email: normalizedEmail, requiresOtp: true },
      });
    }

    // New user
    await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password,
      phone,
      isEmailVerified: false,
      role: 'customer',
      otpCode: otpHash,
      otpExpiry: new Date(Date.now() + OTP_EXPIRY_MS),
      otpAttempts: 0,
      otpLastSent: new Date(),
      addresses: [],
      wishlist: [],
      compare: [],
      recentlyViewed: [],
    });

    // If email delivery fails, do not proceed to OTP page.
    await sendOtpEmail(normalizedEmail, firstName, otp);

    return res.status(201).json({
      success: true,
      message: 'Verification code sent to your email.',
      data: { email: normalizedEmail, requiresOtp: true },
    });
  }
);

// ==========================================
// Verify OTP — completes signup
// ==========================================
router.post(
  '/verify-otp',
  validate(verifyOtpSchema),
  async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select('+otpCode +otpExpiry +otpAttempts +refreshTokens');
    if (!user) throw new UnauthorizedError('No pending registration found for this email.');

    if (user.isEmailVerified) {
      throw new BadRequestError('Email is already verified. Please sign in.');
    }

    if (!user.otpCode || !user.otpExpiry) {
      throw new BadRequestError('No OTP was generated. Please register again.');
    }

    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      throw new ForbiddenError('Too many failed attempts. Please request a new code.');
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestError('Verification code has expired. Please request a new one.');
    }

    const otpHash = hashToken(otp);
    if (otpHash !== user.otpCode) {
      user.otpAttempts = (user.otpAttempts ?? 0) + 1;
      await user.save();
      const remaining = OTP_MAX_ATTEMPTS - user.otpAttempts;
      throw new UnauthorizedError(`Invalid verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
    }

    // OTP verified — activate account
    user.isEmailVerified = true;
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;

    const tokens = generateTokenPair({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });
    const refreshHash = hashToken(tokens.refreshToken);
    user.refreshTokens = [refreshHash];
    user.lastLogin = new Date();
    await user.save();

    // Welcome email is non-critical; OTP verification is already complete.
    void sendWelcomeEmail(user.email, user.firstName);

    return res.json({
      success: true,
      message: 'Email verified successfully. Welcome to AYEZA COSMETICS!',
      data: { user: user.toJSON(), tokens },
    });
  }
);

// ==========================================
// Resend OTP
// ==========================================
router.post(
  '/resend-otp',
  validate(resendOtpSchema),
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select('+otpCode +otpExpiry +otpAttempts +otpLastSent');

    if (!user || user.isEmailVerified) {
      // Don't leak whether account exists
      return res.json({ success: true, message: 'If a pending account exists, a new code has been sent.' });
    }

    // Rate limit: 1 minute cooldown
    if (user.otpLastSent && Date.now() - user.otpLastSent.getTime() < OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otpLastSent.getTime())) / 1000);
      throw new BadRequestError(`Please wait ${waitSec} seconds before requesting a new code.`);
    }

    const otp = generateOtp();
    user.otpCode = hashToken(otp);
    user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
    user.otpAttempts = 0;
    user.otpLastSent = new Date();
    await user.save();

    // If email delivery fails, do not pretend resend worked.
    await sendOtpEmail(normalizedEmail, user.firstName, otp);

    return res.json({
      success: true,
      message: 'A new verification code has been sent to your email.',
    });
  }
);

router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select('+password +refreshTokens');
    if (!user) {
      throw new UnauthorizedError('No account found with this email. Please sign up to create one.');
    }
    if (!user.isActive) {
      throw new ForbiddenError('Your account is inactive. Please contact support.');
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Incorrect password. Please try again or reset your password.');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenError('Please verify your email first. Check your inbox for the verification code.');
    }

    const tokens = generateTokenPair({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshHash = hashToken(tokens.refreshToken);
    user.refreshTokens = [...(user.refreshTokens ?? []), refreshHash].slice(-5);
    user.lastLogin = new Date();
    await user.save();

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        tokens,
      },
    });
  }
);

router.post(
  '/refresh',
  validate(refreshSchema),
  async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    // Verify token signature first.
    let payload: any;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (payload?.type !== 'refresh') throw new UnauthorizedError('Invalid refresh token');

    const user = await User.findById(payload.sub).select('+refreshTokens');
    if (!user) throw new UnauthorizedError('Invalid refresh token');

    const refreshHash = hashToken(refreshToken);
    const tokenExists = (user.refreshTokens ?? []).some((t) => t === refreshHash);
    if (!tokenExists) throw new UnauthorizedError('Invalid refresh token');

    // Rotate refresh token.
    const newTokens = generateTokenPair({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    user.refreshTokens = (user.refreshTokens ?? []).filter((t) => t !== refreshHash);
    user.refreshTokens = [...user.refreshTokens, hashToken(newTokens.refreshToken)].slice(-5);
    await user.save();

    return res.json({
      success: true,
      message: 'Token refreshed',
      data: {
        user: user.toJSON(),
        tokens: newTokens,
      },
    });
  }
);

router.post(
  '/logout',
  validate(logoutSchema),
  authenticate,
  async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    const userId = req.user!._id;
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) throw new NotFoundError('User');

    const refreshHash = hashToken(refreshToken);
    user.refreshTokens = (user.refreshTokens ?? []).filter((t) => t !== refreshHash);
    await user.save();

    return res.json({ success: true, message: 'Logged out' });
  }
);

router.get('/verify-email', async (req: Request, res: Response) => {
  const token = String(req.query.token ?? '').trim();
  if (!token) throw new BadRequestError('token is required');

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpiry: { $gt: new Date() },
  });

  if (!user) throw new UnauthorizedError('Invalid or expired verification token');

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save();

  await sendWelcomeEmail(user.email, user.firstName);

  // Frontend can redirect based on this response.
  return res.json({
    success: true,
    message: 'Email verified successfully',
    data: { user: user.toJSON() },
  });
});

router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    // Avoid leaking which emails exist.
    if (user) {
      const token = generateRandomToken(32);
      user.passwordResetToken = hashToken(token);
      user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await user.save();
      await sendPasswordResetEmail(user.email, user.firstName, token);
    }

    return res.json({
      success: true,
      message: 'If that email exists, a reset link has been sent.',
    });
  }
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req: Request, res: Response) => {
    const { token, password } = req.body;

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) throw new UnauthorizedError('Invalid or expired reset token');

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successful. Please log in.',
    });
  }
);

router.get('/me', optionalAuthenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(200).json({ success: true, message: 'Not authenticated', data: null });
  }
  return res.json({ success: true, message: 'Current user', data: req.user });
});

router.put('/profile', authenticate, requireEmailVerification, validate(updateProfileSchema), async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');

  user.firstName = req.body.firstName ?? user.firstName;
  user.lastName = req.body.lastName ?? user.lastName;
  user.phone = req.body.phone ?? user.phone;
  await user.save();

  return res.json({ success: true, message: 'Profile updated', data: user.toJSON() });
});

router.post('/addresses', authenticate, requireEmailVerification, validate(addressSchema), async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');

  const isDefault = Boolean(req.body.isDefault);

  if (isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  user.addresses.push({
    ...req.body,
    isDefault,
  });
  await user.save();

  return res.status(201).json({ success: true, message: 'Address added', data: user.addresses });
});

router.delete('/addresses/:addressId', authenticate, requireEmailVerification, async (req: Request, res: Response) => {
  const { addressId } = req.params;
  if (!addressId) throw new BadRequestError('addressId is required');

  const userId = req.user!._id;
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');

  const before = user.addresses?.length ?? 0;
  user.addresses = (user.addresses ?? []).filter((a) => String((a as any)._id ?? '') !== addressId);
  const after = user.addresses?.length ?? 0;
  if (before === after) throw new NotFoundError('Address');

  await user.save();
  return res.json({ success: true, message: 'Address deleted', data: user.addresses });
});

router.post('/change-password', authenticate, requireEmailVerification, validate(changePasswordSchema), async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!._id;

  const user = await User.findById(userId).select('+password');
  if (!user) throw new NotFoundError('User');
  if (!user.password) throw new BadRequestError('Password not set');

  const ok = await user.comparePassword(currentPassword);
  if (!ok) throw new UnauthorizedError('Current password is incorrect');

  user.password = newPassword;
  await user.save();

  return res.json({ success: true, message: 'Password updated successfully' });
});

// =========================================================
// Google OAuth
// =========================================================
router.get(
  '/google',
  (req: Request, res: Response, next) => {
    passport.authenticate('google', { session: false })(req, res, next);
  }
);

router.get(
  '/google/callback',
  (req: Request, res: Response, next) => {
    passport.authenticate('google', { session: false }, async (err: any, _user: any) => {
      if (err) return next(err);
      try {
        const user = _user as any;
        if (!user) throw new UnauthorizedError('Google authentication failed');

        const dbUser = await User.findById(user._id).select('+refreshTokens');
        if (!dbUser) throw new NotFoundError('User');

        const tokens = generateTokenPair({
          sub: dbUser._id.toString(),
          email: dbUser.email,
          role: dbUser.role,
        });

        const refreshHash = hashToken(tokens.refreshToken);
        dbUser.refreshTokens = [...(dbUser.refreshTokens ?? []), refreshHash].slice(-5);
        dbUser.lastLogin = new Date();
        await dbUser.save();

        // Ensure cart exists for new users.
        await Cart.findOneAndUpdate(
          { user: dbUser._id },
          { $setOnInsert: { user: dbUser._id, items: [], subtotal: 0, itemCount: 0, couponDiscount: 0 } },
          { upsert: true, new: true }
        );

        res.json({
          success: true,
          message: 'Google login successful',
          data: { user: dbUser.toJSON(), tokens },
        });
      } catch (e) {
        return next(e);
      }
    })(req, res, next);
  }
);

// =========================================================
// Admin helpers (optional)
// =========================================================
router.get('/admin/health', adminOnly, (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Admin OK' });
});

export default router;

