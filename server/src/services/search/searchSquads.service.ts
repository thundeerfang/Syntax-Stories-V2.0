import { SquadModel } from "../../models/Squad.js";
import type { SearchHit } from "./search.types.js";
import { escapeRegex } from "./searchQuery.util.js";
export async function searchSquadsForUnified(
  q: string,
  limit: number,
): Promise<SearchHit[]> {
  const regex = new RegExp(escapeRegex(q), "i");
  const squads = await SquadModel.find({
    visibility: "public",
    $or: [{ name: regex }, { slug: regex }, { description: regex }],
  })
    .select("slug name description iconUrl memberCount")
    .sort({ memberCount: -1, name: 1 })
    .limit(limit)
    .lean();
  return squads.map((s) => ({
    id: String(s._id),
    type: "squad" as const,
    label: s.name,
    sublabel: s.description?.trim()
      ? s.description.trim().slice(0, 80)
      : `@${s.slug}`,
    href: `/squads/${s.slug}`,
    imageUrl: s.iconUrl?.trim() || undefined,
    meta: { memberCount: s.memberCount ?? 0 },
  }));
}
