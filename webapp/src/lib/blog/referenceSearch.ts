import { searchCompaniesApi } from '@/api/companies';
import {
  searchReferenceEntitiesApi,
  searchTechStackApi,
  resolveTechStackApi,
  type EntityOption,
  type TechStackItem,
} from '@/api/reference';

export type { EntityOption, TechStackItem, TechStackCategory } from '@/api/reference';

export async function searchCompaniesWithApi(query: string): Promise<EntityOption[]> {
  const q = query.trim();
  if (q.length >= 2) {
    try {
      const companies = await searchCompaniesApi(q);
      if (companies.length > 0) return companies;
    } catch {
      /* fall through to seeded CMS list */
    }
  }
  return searchReferenceEntitiesApi('company', q);
}

export async function searchSchools(query: string): Promise<EntityOption[]> {
  return searchReferenceEntitiesApi('school', query);
}

export async function searchOrganizations(query: string): Promise<EntityOption[]> {
  return searchReferenceEntitiesApi('organization', query);
}

export async function searchTechStack(query: string, limit = 15): Promise<TechStackItem[]> {
  return searchTechStackApi(query, limit);
}

export async function resolveTechStack(names: string[]): Promise<TechStackItem[]> {
  return resolveTechStackApi(names);
}
