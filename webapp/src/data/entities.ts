/**
 * Entity suggestions for company, school, and organization search.
 * Logos via Clearbit: https://logo.clearbit.com/{domain}
 * If domain has no logo, UI shows default icon.
 */

export interface EntityOption {
  name: string;
  domain: string;
}

export function getLogoUrl(domain: string): string {
  if (!domain?.trim()) return '';
  const d = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  return d ? `https://logo.clearbit.com/${d}` : '';
}

const COMPANIES: EntityOption[] = [
  { name: 'Microsoft', domain: 'microsoft.com' },
  { name: 'Google', domain: 'google.com' },
  { name: 'Apple', domain: 'apple.com' },
  { name: 'Amazon', domain: 'amazon.com' },
  { name: 'Meta', domain: 'meta.com' },
  { name: 'Facebook', domain: 'facebook.com' },
  { name: 'Tesla', domain: 'tesla.com' },
  { name: 'Netflix', domain: 'netflix.com' },
  { name: 'Adobe', domain: 'adobe.com' },
  { name: 'Salesforce', domain: 'salesforce.com' },
  { name: 'Oracle', domain: 'oracle.com' },
  { name: 'IBM', domain: 'ibm.com' },
  { name: 'Intel', domain: 'intel.com' },
  { name: 'Nvidia', domain: 'nvidia.com' },
  { name: 'Spotify', domain: 'spotify.com' },
  { name: 'Uber', domain: 'uber.com' },
  { name: 'Airbnb', domain: 'airbnb.com' },
  { name: 'Stripe', domain: 'stripe.com' },
  { name: 'Slack', domain: 'slack.com' },
  { name: 'GitHub', domain: 'github.com' },
  { name: 'Atlassian', domain: 'atlassian.com' },
  { name: 'LinkedIn', domain: 'linkedin.com' },
  { name: 'Twitter', domain: 'x.com' },
  { name: 'PayPal', domain: 'paypal.com' },
  { name: 'VMware', domain: 'vmware.com' },
  { name: 'Cisco', domain: 'cisco.com' },
  { name: 'SAP', domain: 'sap.com' },
  { name: 'Shopify', domain: 'shopify.com' },
  { name: 'Zoom', domain: 'zoom.us' },
  { name: 'Dropbox', domain: 'dropbox.com' },
  { name: 'Twitch', domain: 'twitch.tv' },
  { name: 'Red Hat', domain: 'redhat.com' },
  { name: 'Dell', domain: 'dell.com' },
  { name: 'HP', domain: 'hp.com' },
  { name: 'Accenture', domain: 'accenture.com' },
  { name: 'Deloitte', domain: 'deloitte.com' },
  { name: 'TCS', domain: 'tcs.com' },
  { name: 'Infosys', domain: 'infosys.com' },
  { name: 'Wipro', domain: 'wipro.com' },
];

const SCHOOLS: EntityOption[] = [
  { name: 'MIT', domain: 'mit.edu' },
  { name: 'Stanford University', domain: 'stanford.edu' },
  { name: 'Harvard University', domain: 'harvard.edu' },
  { name: 'California Institute of Technology', domain: 'caltech.edu' },
  { name: 'University of Oxford', domain: 'ox.ac.uk' },
  { name: 'University of Cambridge', domain: 'cam.ac.uk' },
  { name: 'Carnegie Mellon University', domain: 'cmu.edu' },
  { name: 'University of California, Berkeley', domain: 'berkeley.edu' },
  { name: 'Georgia Institute of Technology', domain: 'gatech.edu' },
  { name: 'University of Washington', domain: 'uw.edu' },
  { name: 'Princeton University', domain: 'princeton.edu' },
  { name: 'Yale University', domain: 'yale.edu' },
  { name: 'Columbia University', domain: 'columbia.edu' },
  { name: 'University of Michigan', domain: 'umich.edu' },
  { name: 'University of Texas at Austin', domain: 'utexas.edu' },
  { name: 'Purdue University', domain: 'purdue.edu' },
  { name: 'University of Illinois', domain: 'illinois.edu' },
  { name: 'Cornell University', domain: 'cornell.edu' },
  { name: 'University of Southern California', domain: 'usc.edu' },
  { name: 'New York University', domain: 'nyu.edu' },
  { name: 'Boston University', domain: 'bu.edu' },
  { name: 'Northwestern University', domain: 'northwestern.edu' },
  { name: 'Duke University', domain: 'duke.edu' },
  { name: 'University of Edinburgh', domain: 'ed.ac.uk' },
  { name: 'ETH Zurich', domain: 'ethz.ch' },
  { name: 'IIT Bombay', domain: 'iitb.ac.in' },
  { name: 'IIT Delhi', domain: 'iitd.ac.in' },
  { name: 'BITS Pilani', domain: 'bits-pilani.ac.in' },
  { name: 'Indian Institute of Science', domain: 'iisc.ac.in' },
  { name: 'Delhi Technological University', domain: 'dtu.ac.in' },
];

const ORGANIZATIONS: EntityOption[] = [
  { name: 'AWS', domain: 'aws.amazon.com' },
  { name: 'Google Cloud', domain: 'cloud.google.com' },
  { name: 'Microsoft Learn', domain: 'microsoft.com' },
  { name: 'Coursera', domain: 'coursera.org' },
  { name: 'edX', domain: 'edx.org' },
  { name: 'Udemy', domain: 'udemy.com' },
  { name: 'LinkedIn Learning', domain: 'linkedin.com' },
  { name: 'CompTIA', domain: 'comptia.org' },
  { name: 'ISC2', domain: 'isc2.org' },
  { name: 'PMI', domain: 'pmi.org' },
  { name: 'IEEE', domain: 'ieee.org' },
  { name: 'ACM', domain: 'acm.org' },
  { name: 'Linux Foundation', domain: 'linuxfoundation.org' },
  { name: 'Free Code Camp', domain: 'freecodecamp.org' },
  { name: 'Codecademy', domain: 'codecademy.com' },
  { name: 'Pluralsight', domain: 'pluralsight.com' },
  { name: 'HackerRank', domain: 'hackerrank.com' },
  { name: 'LeetCode', domain: 'leetcode.com' },
  { name: 'IBM Skills Build', domain: 'ibm.com' },
  { name: 'Oracle University', domain: 'oracle.com' },
  { name: 'Salesforce Trailhead', domain: 'trailhead.salesforce.com' },
  { name: 'HashiCorp', domain: 'hashicorp.com' },
  { name: 'Red Hat Training', domain: 'redhat.com' },
  { name: 'Cisco NetAcad', domain: 'netacad.com' },
  { name: 'AWS Training', domain: 'aws.amazon.com' },
  { name: 'Google Developers', domain: 'developers.google.com' },
  { name: 'Microsoft Certification', domain: 'microsoft.com' },
  { name: 'Meta Blueprint', domain: 'facebook.com' },
  { name: 'Adobe Credential Program', domain: 'adobe.com' },
];

export function searchCompanies(query: string): EntityOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMPANIES.slice(0, 15);
  return COMPANIES.filter((c) => c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q)).slice(0, 15);
}

/** Company search via OpenCorporates API (backend proxy). Falls back to static list if API returns empty or errors. */
export async function searchCompaniesWithApi(query: string): Promise<EntityOption[]> {
  const q = query.trim();
  if (!q || q.length < 2) return searchCompanies(query);
  try {
    const { searchCompaniesApi } = await import('@/api/companies');
    const companies = await searchCompaniesApi(q);
    if (companies.length > 0) return companies;
  } catch {
    /* fall through to static */
  }
  return searchCompanies(query);
}

export function searchSchools(query: string): EntityOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return SCHOOLS.slice(0, 15);
  return SCHOOLS.filter((s) => s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q)).slice(0, 15);
}

export function searchOrganizations(query: string): EntityOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return ORGANIZATIONS.slice(0, 15);
  return ORGANIZATIONS.filter((o) => o.name.toLowerCase().includes(q) || o.domain.toLowerCase().includes(q)).slice(0, 15);
}
