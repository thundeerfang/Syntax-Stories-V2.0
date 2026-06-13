import { LegalPolicyModel } from './models/legal.models.js';

/** §47 — authoritative DB clock for legal comparisons. */
export async function getLegalDbNow(): Promise<Date> {
  const rows = await LegalPolicyModel.aggregate<{ now: Date }>([
    { $limit: 1 },
    { $addFields: { now: '$$NOW' } },
    { $project: { _id: 0, now: 1 } },
  ]);
  return rows[0]?.now ?? new Date();
}
