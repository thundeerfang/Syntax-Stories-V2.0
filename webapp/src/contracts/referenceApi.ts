/**
 * Reference data JSON API — `/api/reference/*`.
 * Keep in sync with `server/src/routes/reference.routes.ts`.
 */

export type ReferenceEntityKind = 'company' | 'school' | 'organization';

export interface EntityOption {
  name: string;
  domain: string;
}

export type TechStackCategory =
  | 'Frontend'
  | 'Backend'
  | 'Mobile'
  | 'Database'
  | 'DevOps'
  | 'Cloud'
  | 'Library'
  | 'Tool'
  | 'Language'
  | 'Design';

export interface TechStackItem {
  name: string;
  slug: string;
  category: TechStackCategory;
  iconSlug: string;
  iconUrl: string;
}

export interface TechStackResolveRequest {
  names: string[];
}

export interface TechStackResolveResponse {
  success: boolean;
  items: TechStackItem[];
}

export interface ReferenceEntitiesResponse {
  success: boolean;
  entities: EntityOption[];
}

export interface TechStackSearchResponse {
  success: boolean;
  items: TechStackItem[];
}
