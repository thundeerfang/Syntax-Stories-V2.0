import type { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { StripeWebhookEventModel } from '../models/StripeWebhookEvent.js';
import { dispatchStripeWebhookEvent } from '../services/stripe/webhook.service.js';
import { getStripe } from '../services/stripe/stripeClient.js';

const replaySchema = z.object({ eventId: z.string().min(1) });

export async function postReplayWebhook(req: Request, res: Response): Promise<void> {
  const secret = req.headers['x-internal-billing-secret'];
  if (!env.INTERNAL_BILLING_SECRET || secret !== env.INTERNAL_BILLING_SECRET) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  const parsed = replaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'eventId required' });
    return;
  }

  const stripe = getStripe();
  if (!stripe) {
    res.status(503).json({ success: false, message: 'Stripe not configured' });
    return;
  }

  const evt = await stripe.events.retrieve(parsed.data.eventId);
  try {
    await dispatchStripeWebhookEvent(evt);
    await StripeWebhookEventModel.updateOne(
      { eventId: evt.id },
      {
        $set: {
          status: 'processed',
          retryCount: 0,
          lastError: undefined,
          nextRetryAt: undefined,
        },
      }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: (e as Error).message });
  }
}
