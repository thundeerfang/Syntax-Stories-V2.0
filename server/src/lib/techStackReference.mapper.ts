import type { TechStackReferenceCategory } from "../models/TechStackReference.js";
import {
  buildIconUrl,
  normalizeCatalogSlug,
  resolveIconSlug,
} from "./skillIcons.js";
export interface TechStackItemDto {
  name: string;
  slug: string;
  category: TechStackReferenceCategory;
  iconSlug: string;
  iconUrl: string;
}
type CatalogRow = {
  name: string;
  slug: string;
  category: TechStackReferenceCategory;
  iconSlug?: string | null;
};
export function toTechStackItemDto(row: CatalogRow): TechStackItemDto {
  const iconSlug = (
    row.iconSlug?.trim() || resolveIconSlug(row.slug || row.name)
  ).trim();
  return {
    name: row.name,
    slug: row.slug,
    category: row.category,
    iconSlug,
    iconUrl: buildIconUrl(iconSlug),
  };
}
export function toCustomTechStackItemDto(
  displayName: string,
): TechStackItemDto {
  const name = displayName.trim().slice(0, 120);
  const slug = normalizeCatalogSlug(name) || resolveIconSlug(name) || "custom";
  const iconSlug = resolveIconSlug(name) || slug;
  return {
    name,
    slug,
    category: "Tool",
    iconSlug,
    iconUrl: buildIconUrl(iconSlug),
  };
}
