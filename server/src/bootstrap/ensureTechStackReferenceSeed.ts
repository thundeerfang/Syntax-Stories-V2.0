import { TechStackReferenceModel } from "../models/TechStackReference.js";
import { TECH_STACK_REFERENCE_SEED } from "./techStackReferenceSeed.data.js";
export async function ensureTechStackReferenceSeed(): Promise<void> {
  if (TECH_STACK_REFERENCE_SEED.length === 0) return;
  const ops = TECH_STACK_REFERENCE_SEED.map((row) => ({
    updateOne: {
      filter: { slug: row.slug },
      update: {
        $set: {
          name: row.name,
          slug: row.slug,
          category: row.category,
          ...(row.iconSlug ? { iconSlug: row.iconSlug } : {}),
        },
      },
      upsert: true,
    },
  }));
  const result = await TechStackReferenceModel.bulkWrite(ops, {
    ordered: false,
  });
  const upserted = result.upsertedCount ?? 0;
  const modified = result.modifiedCount ?? 0;
  if (upserted > 0 || modified > 0) {
    console.info(
      `[TechStackReference] Seed sync — upserted ${upserted}, updated ${modified} (${TECH_STACK_REFERENCE_SEED.length} catalog rows)`,
    );
  }
}
