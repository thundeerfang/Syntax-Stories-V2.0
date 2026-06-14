import { STACK_AND_TOOLS_MAX } from "../variable/constants.js";
import { normalizeCatalogSlug } from "../lib/skillIcons.js";
import {
  toCustomTechStackItemDto,
  toTechStackItemDto,
  type TechStackItemDto,
} from "../lib/techStackReference.mapper.js";
import { TechStackReferenceModel } from "../models/TechStackReference.js";
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeNameList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, STACK_AND_TOOLS_MAX);
}
async function resolveTechStackName(name: string): Promise<TechStackItemDto> {
  const trimmed = name.trim();
  const slugCandidate = normalizeCatalogSlug(trimmed);
  const exactRx = new RegExp(`^${escapeRegex(trimmed)}$`, "i");
  const orClauses: Record<string, unknown>[] = [{ name: exactRx }];
  if (slugCandidate) orClauses.push({ slug: slugCandidate });
  const row = await TechStackReferenceModel.findOne({ $or: orClauses })
    .select({ name: 1, slug: 1, category: 1, iconSlug: 1, _id: 0 })
    .lean();
  if (row) return toTechStackItemDto(row);
  return toCustomTechStackItemDto(trimmed);
}
export async function resolveTechStackNames(
  names: string[],
): Promise<TechStackItemDto[]> {
  const list = names
    .filter((v) => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, STACK_AND_TOOLS_MAX);
  if (list.length === 0) return [];
  return Promise.all(list.map((name) => resolveTechStackName(name)));
}
export async function enrichStackAndToolsDisplay(
  raw: unknown,
): Promise<TechStackItemDto[]> {
  return resolveTechStackNames(normalizeNameList(raw));
}
