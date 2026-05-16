import type { ReferenceEntityKind } from '../../models/ReferenceEntity.js';
import { ReferenceEntityModel } from '../../models/ReferenceEntity.js';
import { TechStackReferenceModel } from '../../models/TechStackReference.js';
import {
  COMPANY_REFERENCE_SEED,
  ORGANIZATION_REFERENCE_SEED,
  SCHOOL_REFERENCE_SEED,
} from './seedData/referenceEntities.seed.js';
import { TECH_STACK_REFERENCE_SEED } from './seedData/techStackReference.seed.js';

function entityRows(kind: ReferenceEntityKind) {
  const source =
    kind === 'company'
      ? COMPANY_REFERENCE_SEED
      : kind === 'school'
        ? SCHOOL_REFERENCE_SEED
        : ORGANIZATION_REFERENCE_SEED;
  return source.map((row) => ({
    kind,
    name: row.name.trim(),
    domain: row.domain.trim().toLowerCase(),
  }));
}

/**
 * Idempotent CMS reference seeds on Mongo connect.
 * Inserts once when collections are empty; never re-runs bulk insert afterward.
 */
export async function ensureCmsReferenceSeeds(): Promise<void> {
  const entityCount = await ReferenceEntityModel.countDocuments();
  if (entityCount === 0) {
    const rows = [
      ...entityRows('company'),
      ...entityRows('school'),
      ...entityRows('organization'),
    ];
    await ReferenceEntityModel.insertMany(rows, { ordered: false });
    console.log(`[seed] CMS reference entities: ${rows.length} rows`);
  }

  const techCount = await TechStackReferenceModel.countDocuments();
  if (techCount === 0) {
    await TechStackReferenceModel.insertMany(TECH_STACK_REFERENCE_SEED, { ordered: false });
    console.log(`[seed] CMS tech stack references: ${TECH_STACK_REFERENCE_SEED.length} rows`);
  }
}
