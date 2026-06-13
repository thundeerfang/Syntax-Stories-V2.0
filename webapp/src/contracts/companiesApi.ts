/**
 * Company search proxy JSON API — `GET /api/companies/search`.
 * Keep in sync with `server/src/routes/companies.routes.ts`.
 */

export interface CompanyOption {
  name: string;
  domain: string;
}

export interface CompaniesSearchResponse {
  success: boolean;
  companies: CompanyOption[];
}
