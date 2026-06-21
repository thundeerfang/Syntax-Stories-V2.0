import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
const legalPolicySchema = new Schema(
  {
    kind: { type: String, enum: ["terms", "privacy", "udd"], required: true },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    body: { type: String, default: "" },
    bodyFormat: {
      type: String,
      enum: ["markdown", "mdx", "richtext"],
      default: "markdown",
    },
    status: {
      type: String,
      enum: ["draft", "in_review", "approved", "published", "archived"],
      default: "draft",
    },
    version: { type: Number, default: 1 },
    draftRevisionId: { type: String },
    changeLog: { type: String },
    isMajor: { type: Boolean },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewedById: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    approvedById: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    publishedRevisionId: { type: String },
    publishedAt: { type: Date },
    effectiveAt: { type: Date },
    region: {
      type: String,
      enum: ["global", "EU", "IN", "US"],
      default: "global",
    },
    locale: { type: String, default: "en" },
    countryOverrides: [{ type: String }],
    contactEmail: { type: String },
    companyName: { type: String },
    companyAddress: { type: String },
    dataProtectionOfficer: {
      name: { type: String },
      email: { type: String },
    },
    grievanceOfficer: {
      name: { type: String },
      email: { type: String },
    },
    tenantId: { type: Schema.Types.ObjectId, default: null },
    productId: { type: String, default: null },
    acknowledgementTypeDefault: {
      type: String,
      enum: ["checkbox", "implicit", "scroll_required"],
    },
    visibility: {
      type: String,
      enum: ["public", "internal"],
      default: "public",
    },
    searchIndex: { type: String },
    readTimeMinutes: { type: Number },
    gracePeriodDays: { type: Number },
    lockedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lockedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    schemaVersion: { type: Number, default: 1 },
  },
  { timestamps: true, collection: "legal_policies" },
);
legalPolicySchema.index(
  { kind: 1, region: 1, locale: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deletedAt: null,
      tenantId: null,
      productId: null,
    },
  },
);
legalPolicySchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
legalPolicySchema.index({ status: 1 });
const legalPolicyRevisionSchema = new Schema(
  {
    revisionId: { type: String, required: true, unique: true },
    policyId: {
      type: Schema.Types.ObjectId,
      ref: "LegalPolicy",
      required: true,
    },
    kind: { type: String, enum: ["terms", "privacy", "udd"], required: true },
    version: { type: Number, required: true },
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    body: { type: String, required: true },
    bodyFormat: {
      type: String,
      enum: ["markdown", "mdx", "richtext"],
      default: "markdown",
    },
    changeLog: { type: String, default: "" },
    isMajor: { type: Boolean, default: false },
    previousRevisionId: { type: String, default: null },
    contentHash: { type: String, required: true },
    publishedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    publishTransactionId: { type: String },
    requiresPolicyVersions: {
      terms: { type: Number },
      privacy: { type: Number },
      udd: { type: Number },
    },
    status: {
      type: String,
      enum: ["approved", "published", "superseded"],
      required: true,
    },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewedById: { type: Schema.Types.ObjectId, ref: "User" },
    approvedById: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    publishedAt: { type: Date },
    effectiveAt: { type: Date },
    region: { type: String, default: "global" },
    locale: { type: String, default: "en" },
    contactEmail: { type: String },
    companyName: { type: String },
    companyAddress: { type: String },
    dataProtectionOfficer: {
      name: { type: String },
      email: { type: String },
    },
    grievanceOfficer: {
      name: { type: String },
      email: { type: String },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "legal_policy_revisions",
  },
);
legalPolicyRevisionSchema.index({ policyId: 1, version: -1 });
legalPolicyRevisionSchema.index({ kind: 1, region: 1, locale: 1, version: -1 });
const userLegalAcceptanceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    policyKind: { type: String, enum: ["terms", "privacy"], required: true },
    version: { type: Number, required: true },
    revisionId: { type: String, required: true },
    contentHash: { type: String, required: true },
    acknowledgementType: {
      type: String,
      enum: ["checkbox", "implicit", "scroll_required"],
    },
    acceptedAt: { type: Date, required: true },
    ipAddress: { type: String },
    ipAddressHash: { type: String },
    userAgent: { type: String },
    source: {
      type: String,
      enum: ["signup", "settings", "forced_prompt", "api"],
      required: true,
    },
  },
  { timestamps: false, collection: "user_legal_acceptances" },
);
userLegalAcceptanceSchema.index({ userId: 1, policyKind: 1, acceptedAt: -1 });
userLegalAcceptanceSchema.index({ userId: 1, policyKind: 1, version: 1 });
userLegalAcceptanceSchema.index(
  { userId: 1, policyKind: 1, revisionId: 1 },
  { unique: true },
);
const dataDeletionRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["requested", "processing", "completed", "rejected", "cancelled"],
      default: "requested",
    },
    requestedAt: { type: Date, required: true },
    completedAt: { type: Date },
    notes: { type: String },
    reason: { type: String },
    lastStatusChangeById: { type: Schema.Types.ObjectId, ref: "User" },
    legalHold: { type: Boolean, default: false },
    legalHoldReason: { type: String },
    legalHoldSetById: { type: Schema.Types.ObjectId, ref: "User" },
    legalHoldSetAt: { type: Date },
    legalHoldClearedAt: { type: Date },
    slaDeadline: { type: Date },
    slaBreached: { type: Boolean, default: false },
    executionSteps: { type: Schema.Types.Mixed, default: undefined },
    compensationStatus: {
      type: String,
      enum: ["none", "partially_completed", "manual_recovery_required"],
      default: "none",
    },
    userNote: { type: String },
  },
  { timestamps: false, collection: "data_deletion_requests" },
);
dataDeletionRequestSchema.index({ userId: 1, status: 1 });
dataDeletionRequestSchema.index({ userId: 1, requestedAt: -1 });
dataDeletionRequestSchema.index({ slaDeadline: 1 });
const legalPreviewTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    revisionId: { type: String, required: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "legal_preview_tokens",
  },
);
legalPreviewTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const legalIdempotencyKeySchema = new Schema(
  {
    key: { type: String, required: true },
    route: { type: String, required: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: "User" },
    requestHash: { type: String, required: true },
    responseStatus: { type: Number, required: true },
    responseBody: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "legal_idempotency_keys" },
);
legalIdempotencyKeySchema.index({ key: 1, route: 1 }, { unique: true });
legalIdempotencyKeySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 72 * 3600 },
);
const legalAcceptIntentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    revisionId: { type: String, required: true },
    nonce: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "legal_accept_intents",
  },
);
legalAcceptIntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export type LegalPolicyDoc = InferSchemaType<typeof legalPolicySchema> & {
  _id: mongoose.Types.ObjectId;
};
export type LegalPolicyRevisionDoc = InferSchemaType<
  typeof legalPolicyRevisionSchema
> & {
  _id: mongoose.Types.ObjectId;
};
export type UserLegalAcceptanceDoc = InferSchemaType<
  typeof userLegalAcceptanceSchema
> & {
  _id: mongoose.Types.ObjectId;
};
export type DataDeletionRequestDoc = InferSchemaType<
  typeof dataDeletionRequestSchema
> & {
  _id: mongoose.Types.ObjectId;
};
export const LegalPolicyModel: Model<LegalPolicyDoc> =
  mongoose.models.LegalPolicy ??
  mongoose.model<LegalPolicyDoc>("LegalPolicy", legalPolicySchema);
export const LegalPolicyRevisionModel: Model<LegalPolicyRevisionDoc> =
  mongoose.models.LegalPolicyRevision ??
  mongoose.model<LegalPolicyRevisionDoc>(
    "LegalPolicyRevision",
    legalPolicyRevisionSchema,
  );
export const UserLegalAcceptanceModel: Model<UserLegalAcceptanceDoc> =
  mongoose.models.UserLegalAcceptance ??
  mongoose.model<UserLegalAcceptanceDoc>(
    "UserLegalAcceptance",
    userLegalAcceptanceSchema,
  );
export const DataDeletionRequestModel: Model<DataDeletionRequestDoc> =
  mongoose.models.DataDeletionRequest ??
  mongoose.model<DataDeletionRequestDoc>(
    "DataDeletionRequest",
    dataDeletionRequestSchema,
  );
export const LegalPreviewTokenModel =
  mongoose.models.LegalPreviewToken ??
  mongoose.model("LegalPreviewToken", legalPreviewTokenSchema);
export const LegalIdempotencyKeyModel =
  mongoose.models.LegalIdempotencyKey ??
  mongoose.model("LegalIdempotencyKey", legalIdempotencyKeySchema);
export const LegalAcceptIntentModel =
  mongoose.models.LegalAcceptIntent ??
  mongoose.model("LegalAcceptIntent", legalAcceptIntentSchema);
