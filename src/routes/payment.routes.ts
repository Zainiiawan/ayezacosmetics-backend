import express, { Request, Response } from 'express';
import { authenticate, adminOnly, requireEmailVerification } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { submitPaymentProofSchema, verifyPaymentSchema, MANUAL_PAYMENT_ACCOUNTS } from '../shared';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { createNotification, notifyAdmins } from '../utils/notifications';
import { sendPaymentStatusEmail } from '../utils/email';

const router = express.Router();

router.get('/accounts', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Manual payment accounts',
    data: MANUAL_PAYMENT_ACCOUNTS,
  });
});

router.get('/pending', adminOnly, async (req: Request, res: Response) => {
  const page = Number((req.query as any).page ?? 1);
  const limit = Number((req.query as any).limit ?? 20);

  const filter = {
    paymentMethod: { $in: ['jazzcash', 'easypaisa'] },
    paymentStatus: { $in: ['waiting_verification', 'rejected'] },
  };

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .populate('user', 'firstName lastName email phone')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  res.json({
    success: true,
    message: 'Pending payments fetched',
    data: {
      orders,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    },
  });
});

router.post(
  '/:orderId/proof',
  authenticate,
  requireEmailVerification,
  validate(submitPaymentProofSchema),
  async (req: Request, res: Response) => {
    const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
    const { transactionId, paidAmount, screenshotUrl, screenshotPublicId, note } = req.body;

    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError('Order');
    if (String(order.user) !== String(req.user!._id)) throw new ForbiddenError('Not allowed');
    if (!['jazzcash', 'easypaisa'].includes(order.paymentMethod)) {
      throw new BadRequestError('Payment proof is only required for JazzCash / Easypaisa orders');
    }
    if (order.paymentStatus === 'paid') {
      throw new BadRequestError('Payment already approved for this order');
    }

    order.paymentProof = {
      transactionId: String(transactionId).trim(),
      paidAmount: Number(paidAmount),
      screenshotUrl,
      screenshotPublicId,
      note,
      submittedAt: new Date(),
      rejectionReason: undefined,
      verifiedAt: undefined,
      verifiedBy: undefined,
    };
    order.paymentStatus = 'waiting_verification';
    order.trackingHistory = [
      ...(order.trackingHistory ?? []),
      {
        status: 'pending',
        message: 'Payment proof submitted. Waiting for admin verification.',
        timestamp: new Date(),
      },
    ];
    await order.save();

    await createNotification({
      userId: String(order.user),
      type: 'payment_received',
      title: 'Payment Received',
      message: `We received your payment proof for order ${order.orderNumber}. Verification is in progress.`,
      orderId: order._id,
      link: `/account/orders/${order._id}`,
    });

    void notifyAdmins({
      type: 'general',
      title: 'Payment Proof Submitted',
      message: `Order ${order.orderNumber} — payment proof awaiting verification.`,
      orderId: order._id,
      link: `/admin/payments`,
    });

    res.status(201).json({
      success: true,
      message: 'Payment proof submitted successfully',
      data: order,
    });
  }
);

router.patch(
  '/:orderId/verify',
  adminOnly,
  validate(verifyPaymentSchema),
  async (req: Request, res: Response) => {
    const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
    const { action, rejectionReason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError('Order');
    if (!order.paymentProof) throw new BadRequestError('No payment proof submitted');
    if (order.paymentStatus === 'paid') throw new BadRequestError('Payment already approved');

    if (action === 'approve') {
      order.paymentStatus = 'paid';
      order.status = 'processing';
      order.paymentProof.verifiedAt = new Date();
      order.paymentProof.verifiedBy = req.user!._id as any;
      order.paymentProof.rejectionReason = undefined;
      order.trackingHistory = [
        ...(order.trackingHistory ?? []),
        {
          status: 'processing',
          message: 'Payment approved. Order confirmed and being prepared.',
          timestamp: new Date(),
        },
      ];
      await order.save();

      await createNotification({
        userId: String(order.user),
        type: 'payment_approved',
        title: 'Payment Approved',
        message: `Payment for order ${order.orderNumber} was approved. Your order is being prepared.`,
        orderId: order._id,
        link: `/account/orders/${order._id}`,
      });

      const user = await User.findById(order.user);
      if (user) {
        try {
          await sendPaymentStatusEmail(
            user.email,
            user.firstName,
            order.orderNumber,
            order._id.toString(),
            true
          );
        } catch {
          // ignore
        }
      }
    } else {
      order.paymentStatus = 'rejected';
      order.paymentProof.verifiedAt = new Date();
      order.paymentProof.verifiedBy = req.user!._id as any;
      order.paymentProof.rejectionReason =
        rejectionReason || 'Payment proof rejected. Please resubmit with a valid transaction ID and screenshot.';
      order.trackingHistory = [
        ...(order.trackingHistory ?? []),
        {
          status: 'pending',
          message: `Payment rejected. ${order.paymentProof.rejectionReason}`,
          timestamp: new Date(),
        },
      ];
      await order.save();

      await createNotification({
        userId: String(order.user),
        type: 'payment_rejected',
        title: 'Payment Rejected',
        message: order.paymentProof.rejectionReason || 'Your payment was rejected. Please resubmit proof.',
        orderId: order._id,
        link: `/account/orders/${order._id}/pay`,
      });

      const user = await User.findById(order.user);
      if (user) {
        try {
          await sendPaymentStatusEmail(
            user.email,
            user.firstName,
            order.orderNumber,
            order._id.toString(),
            false,
            order.paymentProof.rejectionReason
          );
        } catch {
          // ignore
        }
      }
    }

    res.json({
      success: true,
      message: action === 'approve' ? 'Payment approved' : 'Payment rejected',
      data: order,
    });
  }
);

export default router;
