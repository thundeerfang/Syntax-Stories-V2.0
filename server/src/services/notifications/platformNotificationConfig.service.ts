import {
  DEFAULT_PLATFORM_NOTIFICATION_CONFIG,
  PlatformNotificationConfigModel,
  type IPlatformNotificationConfig,
} from "../../models/PlatformNotificationConfig.js";
export type PlatformNotificationConfigPublic = {
  webhookEnabled: boolean;
  webhookUrl: string;
  hasWebhookSecret: boolean;
  updatedAt: string | null;
};
export type PlatformNotificationConfigAdmin =
  PlatformNotificationConfigPublic & {
    webhookSecret: string;
  };
async function ensureConfig(): Promise<IPlatformNotificationConfig> {
  let doc = await PlatformNotificationConfigModel.findOne({
    singleton: "default",
  })
    .select("+webhookSecret")
    .exec();
  if (!doc) {
    doc = await PlatformNotificationConfigModel.create({
      singleton: "default",
      ...DEFAULT_PLATFORM_NOTIFICATION_CONFIG,
    });
  }
  return doc;
}
export function serializePlatformNotificationConfig(
  doc: IPlatformNotificationConfig,
  includeSecret = false,
): PlatformNotificationConfigPublic | PlatformNotificationConfigAdmin {
  const base: PlatformNotificationConfigPublic = {
    webhookEnabled: doc.webhookEnabled,
    webhookUrl: doc.webhookUrl ?? "",
    hasWebhookSecret: Boolean(doc.webhookSecret?.trim()),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
  if (!includeSecret) return base;
  return { ...base, webhookSecret: doc.webhookSecret ?? "" };
}
export async function getPlatformNotificationConfig(
  includeSecret = false,
): Promise<PlatformNotificationConfigPublic | PlatformNotificationConfigAdmin> {
  const doc = await ensureConfig();
  return serializePlatformNotificationConfig(doc, includeSecret);
}
export async function getActivePlatformWebhook(): Promise<{
  enabled: boolean;
  url: string;
  secret?: string;
} | null> {
  const doc = await PlatformNotificationConfigModel.findOne({
    singleton: "default",
  })
    .select("+webhookSecret webhookEnabled webhookUrl")
    .lean();
  if (!doc?.webhookEnabled || !doc.webhookUrl?.trim()) return null;
  return {
    enabled: true,
    url: doc.webhookUrl.trim(),
    secret: doc.webhookSecret?.trim() || undefined,
  };
}
export async function patchPlatformNotificationConfig(patch: {
  webhookEnabled?: boolean;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
}): Promise<PlatformNotificationConfigAdmin> {
  const doc = await ensureConfig();
  if (typeof patch.webhookEnabled === "boolean")
    doc.webhookEnabled = patch.webhookEnabled;
  if (patch.webhookUrl !== undefined) {
    doc.webhookUrl = patch.webhookUrl?.trim().slice(0, 2000) ?? "";
  }
  if (patch.webhookSecret !== undefined) {
    doc.webhookSecret = patch.webhookSecret?.trim().slice(0, 256) ?? "";
  }
  await doc.save();
  return serializePlatformNotificationConfig(
    doc,
    true,
  ) as PlatformNotificationConfigAdmin;
}
