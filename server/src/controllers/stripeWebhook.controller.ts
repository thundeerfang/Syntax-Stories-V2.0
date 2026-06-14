import type { Request, Response } from "express";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { getRedis } from "../config/redis.js";
import { redisKeys } from "../shared/redis/keys.js";
import { StripeWebhookEventModel } from "../models/StripeWebhookEvent.js";
import { dispatchStripeWebhookEvent } from "../services/stripe/webhook.service.js";
import {
  STRIPE_WEBHOOK_DEDUP_SEC,
  STRIPE_WEBHOOK_RETRY_BACKOFF_MS,
} from "../variable/constants.js";
function backoffMs(retry: number): number {
  const i = Math.min(retry, STRIPE_WEBHOOK_RETRY_BACKOFF_MS.length - 1);
  return (
    STRIPE_WEBHOOK_RETRY_BACKOFF_MS[i] ??
    STRIPE_WEBHOOK_RETRY_BACKOFF_MS.at(-1)!
  );
}
export async function handleStripeWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const sig = req.headers["stripe-signature"];
  if (!env.STRIPE_WEBHOOK_SECRET || typeof sig !== "string") {
    res.status(400).send("Webhook not configured");
    return;
  }
  let event: Stripe.Event;
  try {
    const raw = req.body as Buffer;
    event = Stripe.webhooks.constructEvent(raw, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe webhook] signature", err);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }
  const redis = getRedis();
  if (redis) {
    try {
      const rKey = redisKeys.billing.webhookDedup(event.id);
      const nx = await redis.set(rKey, "1", {
        NX: true,
        EX: STRIPE_WEBHOOK_DEDUP_SEC,
      });
      if (nx !== "OK") {
        res.json({ received: true, duplicate: true });
        return;
      }
    } catch {}
  }
  try {
    await StripeWebhookEventModel.create({
      eventId: event.id,
      type: event.type,
      status: "pending",
      retryCount: 0,
    });
  } catch (e) {
    const code = (
      e as {
        code?: number;
      }
    ).code;
    if (code === 11000) {
      res.json({ received: true, duplicate: true });
      return;
    }
    throw e;
  }
  try {
    await dispatchStripeWebhookEvent(event);
    await StripeWebhookEventModel.updateOne(
      { eventId: event.id },
      { $set: { status: "processed", lastError: undefined } },
    );
    res.json({ received: true });
  } catch (err) {
    const msg = String((err as Error).message ?? err).slice(0, 2000);
    const doc = await StripeWebhookEventModel.findOne({ eventId: event.id });
    const retry = (doc?.retryCount ?? 0) + 1;
    const max = env.BILLING_WEBHOOK_MAX_RETRIES;
    const nextRetryAt = new Date(Date.now() + backoffMs(retry));
    if (retry >= max) {
      await StripeWebhookEventModel.updateOne(
        { eventId: event.id },
        {
          $set: {
            status: "dead",
            lastError: msg,
            retryCount: retry,
          },
        },
      );
      console.error("[stripe webhook] dead letter", event.id, msg);
    } else {
      await StripeWebhookEventModel.updateOne(
        { eventId: event.id },
        {
          $set: {
            status: "failed",
            lastError: msg,
            retryCount: retry,
            nextRetryAt,
          },
        },
      );
    }
    res.json({ received: true, processingFailed: true });
  }
}
