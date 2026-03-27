/**
 * Parse CV/Resume text extracted from PDF and return structured profile data
 * plus a list of missing field keys for the frontend to prompt the user.
 */

import { STACK_AND_TOOLS_MAX } from '../constants/profileLimits';

export type ExtractedProfile = {
  bio?: string;
  linkedin?: string;
  github?: string;
  stackAndTools?: string[];
  workExperiences?: Array<{
    jobTitle: string;
    company: string;
    employmentType?: string;
    currentPosition?: boolean;
    startDate?: string;
    endDate?: string;
    location?: string;
    locationType?: string;
    description?: string;
    skills?: string[];
  }>;
  education?: Array<{
    school: string;
    degree: string;
    fieldOfStudy?: string;
    currentEducation?: boolean;
    startDate?: string;
    endDate?: string;
    grade?: string;
    description?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuingOrganization: string;
    issueDate?: string;
    expirationDate?: string;
    credentialId?: string;
    credentialUrl?: string;
    description?: string;
  }>;
  /** Projects are not extracted from CV; add manually in Settings. */
};

export type MissingFieldKey =
  | 'bio'
  | 'linkedin'
  | 'github'
  | 'stackAndTools'
  | 'workExperiences'
  | 'education'
  | 'certifications';

/** Per-item hints for the frontend: which fields to ask the user to add (e.g. project missing publicationDate). */
export type IncompleteItemHints = {
  workExperiences?: Array<{ index: number; title?: string; missing: string[] }>;
  education?: Array<{ index: number; title?: string; missing: string[] }>;
  certifications?: Array<{ index: number; title?: string; missing: string[] }>;
};

/** Backend validation max lengths — truncate extracted strings to these so validation passes. */
const MAX = {
  jobTitle: 120,
  company: 200,
  workDescription: 5000,
  school: 200,
  degree: 80,
  fieldOfStudy: 120,
  educationDescription: 2000,
  certName: 120,
  certIssuer: 120,
  bio: 500,
  skillItem: 80,
} as const;

function trunc(s: string | undefined, max: number): string {
  if (s == null || typeof s !== 'string') return '';
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

const SECTION_HEADERS = [
  'education',
  'academic',
  'work experience',
  'experience',
  'employment',
  'professional experience',
  'certifications',
  'certificate',
  'licenses',
  'skills',
  'technical skills',
  'technologies',
  'languages',
  'core languages',
  'programming languages',
  'summary',
  'about',
  'about me',
  'profile',
  'objective',
  'linkedin',
  'github',
  'contact',
];

function normalizeSectionTitle(line: string): string {
  return line
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findSections(text: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  let currentHeader = 'preamble';
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    const normalized = normalizeSectionTitle(trimmed);
    const isHeader =
      normalized.length < 50 &&
      (SECTION_HEADERS.some((h) => normalized.startsWith(h) || normalized === h) ||
        /^(education|experience|skills|summary|projects?|certifications?|about|contact)$/.test(normalized));

    if (isHeader && trimmed.length < 80) {
      if (currentContent.length > 0) {
        const existing = sections.get(currentHeader) ?? '';
        sections.set(currentHeader, (existing + '\n' + currentContent.join('\n')).trim());
      }
      currentHeader = normalized.split(/\s+/)[0] ?? 'other';
      if (currentHeader === 'work') currentHeader = 'experience';
      if (currentHeader === 'certificate' || currentHeader === 'licenses') currentHeader = 'certifications';
      if (currentHeader === 'academic') currentHeader = 'education';
      if (currentHeader === 'employment' || currentHeader === 'professional') currentHeader = 'experience';
      if (currentHeader === 'technical' || currentHeader === 'technologies') currentHeader = 'skills';
      if ((currentHeader === 'core' || currentHeader === 'programming') && normalized.includes('language')) currentHeader = 'skills';
      if (currentHeader === 'languages') currentHeader = 'skills';
      currentContent = [];
    } else {
      currentContent.push(trimmed);
    }
  }
  if (currentContent.length > 0) {
    const existing = sections.get(currentHeader) ?? '';
    sections.set(currentHeader, (existing + '\n' + currentContent.join('\n')).trim());
  }
  return sections;
}

const MONTHS =
  /(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d{4}|\d{4}\s*[-–—]\s*(?:present|current|now)|(?:\d{1,2}\/)?\d{4}\s*[-–—]\s*(?:\d{1,2}\/)?\d{4}/gi;
const YEAR_RANGE = /\b(19|20)\d{2}\s*[-–—]\s*((?:19|20)\d{2}|present|current|now)\b/gi;

function parseYearRange(str: string): { startDate?: string; endDate?: string; current?: boolean } {
  const m = str.match(/(19|20)\d{2}/g);
  if (!m || m.length === 0) return {};
  const start = m[0];
  const end = /present|current|now/i.test(str) ? undefined : m[1];
  return {
    startDate: `${start}-01`,
    endDate: end ? `${end}-12` : undefined,
    current: /present|current|now/i.test(str),
  };
}

/** Parse "MM/YYYY" or "M/YYYY" to "YYYY-MM". */
function monthYearToIso(str: string): string {
  const t = str.trim().replace(/\s/g, '');
  const match = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) return '';
  const month = Math.max(1, Math.min(12, parseInt(match[1], 10)));
  const year = match[2];
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * When the first line is "Job Title – Company (05/2025 – 07/2025)" or "Title - Company (05/2025 - Present)",
 * parse it so job title and company don't get merged or swapped with the next line.
 */
function parseWorkExperienceFirstLine(
  titleLine: string
): { jobTitle: string; company: string; startDate?: string; endDate?: string; current?: boolean } | null {
  const line = titleLine.trim();
  const parenMatch = line.match(/\s*\((\d{1,2}\/\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|present|current|now)\s*\)\s*$/i);
  if (!parenMatch) return null;
  const dateStart = parenMatch[1];
  const dateEnd = parenMatch[2];
  const current = /present|current|now/i.test(dateEnd);
  const startDate = monthYearToIso(dateStart);
  const endDate = current ? undefined : monthYearToIso(dateEnd);
  const beforeParen = line.slice(0, line.indexOf('(')).trim();
  const dashMatch = beforeParen.match(/\s*[–\-]\s*(.+)$/);
  if (!dashMatch) return null;
  const jobTitle = beforeParen.slice(0, beforeParen.length - dashMatch[0].length).trim();
  const company = dashMatch[1].trim();
  if (!jobTitle || !company) return null;
  return { jobTitle, company, startDate: startDate || undefined, endDate, current };
}

/** True if the line looks like a role header: "Title – Company (MM/YYYY" (may lack closing paren). */
function looksLikeWorkExperienceHeader(line: string): boolean {
  return /^.+\s+[–\-]\s+.+\s*\(\s*\d{1,2}\/\d{4}/.test(line.trim());
}

/**
 * Relaxed parse for "Title – Company (06/2024" or "Title – Company (06/2024 – 08/2024)" with optional closing paren.
 */
function parseWorkExperienceFirstLineRelaxed(
  titleLine: string
): { jobTitle: string; company: string; startDate?: string; endDate?: string; current?: boolean } | null {
  const line = titleLine.trim();
  const relaxed = line.match(/\s*\((\d{1,2}\/\d{4})\s*[-–—]?\s*(\d{1,2}\/\d{4}|present|current|now)?\s*\)?\s*$/i);
  if (!relaxed) return null;
  const beforeParen = line.slice(0, line.indexOf('(')).trim();
  const dashMatch = beforeParen.match(/\s*[–\-]\s*(.+)$/);
  if (!dashMatch) return null;
  const jobTitle = beforeParen.slice(0, beforeParen.length - dashMatch[0].length).trim();
  const company = dashMatch[1].trim();
  if (!jobTitle || !company) return null;
  const dateStart = relaxed[1];
  const dateEnd = relaxed[2];
  const current = !dateEnd || /present|current|now/i.test(dateEnd);
  const startDate = monthYearToIso(dateStart);
  const endDate = dateEnd && !/present|current|now/i.test(dateEnd) ? monthYearToIso(dateEnd) : undefined;
  return { jobTitle, company, startDate: startDate || undefined, endDate, current };
}

function extractLinkedIn(text: string): string | undefined {
  const m = text.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i
  );
  if (m) return m[0].startsWith('http') ? m[0].trim() : `https://${m[0].trim()}`;
  return undefined;
}

function extractGitHub(text: string): string | undefined {
  const m = text.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+\/?/i
  );
  if (m) return m[0].startsWith('http') ? m[0].trim() : `https://${m[0].trim()}`;
  return undefined;
}

function extractSkills(text: string): string[] {
  const skills: string[] = [];
  const skillsSection =
    findSections(text).get('skills') ??
    findSections(text).get('technical') ??
    findSections(text).get('technologies') ??
    findSections(text).get('languages') ??
    '';
  const block = skillsSection || text;
  const separators = /[,;|•·\-]\s*|\n+/g;
  const tokens = block
    .split(separators)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 50 && !/^\d+$/.test(s));
  const knownTech =
    /javascript|typescript|react|node|python|java|c\+\+|go|rust|sql|aws|docker|kubernetes|html|css|git|redux|angular|vue|mongodb|postgres|graphql|rest|api|linux|agile|scrum/i;
  for (const t of tokens) {
    const s = trunc(t, MAX.skillItem);
    if (s && (knownTech.test(s) || /^[A-Z][a-z]+(?:\s*[\/&]\s*[A-Za-z]+)*$/.test(s)))
      skills.push(s);
    if (skills.length >= 15) break;
  }
  return [...new Set(skills)].slice(0, 15);
}

function extractBio(text: string): string | undefined {
  const summary = findSections(text).get('summary') ?? findSections(text).get('about') ?? findSections(text).get('profile') ?? findSections(text).get('objective') ?? '';
  if (summary) {
    const first = summary.split(/\n+/)[0]?.trim() ?? '';
    return first.length > 10 ? trunc(first, MAX.bio) : undefined;
  }
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.length > 40 && !/^[\d\s\-•·]+$/.test(line) && !/^(education|experience|skills|http)/i.test(line))
      return trunc(line, MAX.bio);
  }
  return undefined;
}

/**
 * When a line is "School Name (2022 – 2026)" or "School Name (2022 – Present)", strip the
 * parenthetical and use it for dates so the school field is just "School Name".
 */
function parseEducationSchoolLine(
  line: string
): { schoolName: string; startDate?: string; endDate?: string; current?: boolean } {
  const trimmed = line.trim();
  const parenMatch = trimmed.match(/\s*\((\d{4})\s*[-–—]\s*(\d{4}|present|current|now)\s*\)?\s*$/i);
  if (parenMatch) {
    const schoolName = trimmed.slice(0, trimmed.indexOf('(')).trim();
    const yearStart = parenMatch[1];
    const yearEnd = parenMatch[2];
    const current = /present|current|now/i.test(yearEnd);
    return {
      schoolName: schoolName || trimmed,
      startDate: `${yearStart}-01`,
      endDate: current ? undefined : `${yearEnd}-12`,
      current,
    };
  }
  const openParen = trimmed.indexOf('(');
  if (openParen > 0 && /\(\s*\d{4}\s*[-–—]/.test(trimmed)) {
    const schoolName = trimmed.slice(0, openParen).trim();
    const inside = trimmed.slice(openParen + 1);
    const yearMatch = inside.match(/(\d{4})\s*[-–—]\s*(\d{4}|present|current|now)?/i);
    if (yearMatch) {
      const current = !yearMatch[2] || /present|current|now/i.test(yearMatch[2]);
      return {
        schoolName: schoolName || trimmed,
        startDate: `${yearMatch[1]}-01`,
        endDate: current || !yearMatch[2] ? undefined : `${yearMatch[2]}-12`,
        current,
      };
    }
  }
  return { schoolName: trimmed };
}

function extractEducation(text: string): ExtractedProfile['education'] {
  const section = findSections(text).get('education') ?? '';
  if (!section.trim()) return undefined;
  const entries: NonNullable<ExtractedProfile['education']> = [];
  const blocks = section.split(/\n\s*\n/).filter((b) => b.trim().length > 20);
  const degreePattern = /(?:b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|ph\.?d\.?|bachelor|master|associate|diploma|b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?)[\s\w,.-]*/gi;
  for (const block of blocks) {
    const degreeMatch = block.match(degreePattern);
    const degree = degreeMatch?.[0]?.trim() ?? 'Degree';
    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
    let schoolLine = lines[0] ?? 'School';
    if (degreeMatch && lines[0] && degreeMatch[0].toLowerCase() === lines[0].toLowerCase().slice(0, degreeMatch[0].length))
      schoolLine = lines[1] ?? lines[0];
    const parsed = parseEducationSchoolLine(schoolLine);
    const dateRange = block.match(YEAR_RANGE)?.[0] ?? block.match(MONTHS)?.[0] ?? '';
    const blockDates = parseYearRange(dateRange);
    entries.push({
      school: trunc((parsed.schoolName || schoolLine).replace(/\s*\([^)]*$/, '').trim(), MAX.school),
      degree: trunc(degree, MAX.degree),
      startDate: parsed.startDate ?? blockDates.startDate,
      endDate: parsed.endDate ?? blockDates.endDate,
      currentEducation: parsed.current ?? blockDates.current,
    });
    if (entries.length >= 5) break;
  }
  return entries.length > 0 ? entries : undefined;
}

function extractWorkExperience(text: string): ExtractedProfile['workExperiences'] {
  const section = findSections(text).get('experience') ?? '';
  if (!section.trim()) return undefined;
  const entries: NonNullable<ExtractedProfile['workExperiences']> = [];
  const lines = section.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let i = 0;
  while (i < lines.length) {
    const titleLine = lines[i];
    const parsedFirst = parseWorkExperienceFirstLine(titleLine) ?? parseWorkExperienceFirstLineRelaxed(titleLine);
    let jobTitle: string;
    let company: string;
    let startDate: string | undefined;
    let endDate: string | undefined;
    let current: boolean | undefined;
    let descLines: string[] = [];
    let nextI: number;

    if (parsedFirst) {
      jobTitle = trunc(parsedFirst.jobTitle, MAX.jobTitle);
      company = trunc(parsedFirst.company.replace(/\s*[-–—|].*$/, '').trim(), MAX.company);
      startDate = parsedFirst.startDate;
      endDate = parsedFirst.endDate;
      current = parsedFirst.current;
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (parseWorkExperienceFirstLine(nextLine) ?? parseWorkExperienceFirstLineRelaxed(nextLine) ?? looksLikeWorkExperienceHeader(nextLine)) break;
        if (nextLine.length > 10 && !/^\d{1,2}\/\d{4}\)?\s*$/i.test(nextLine) && !/^\d{4}\s*[-–—]/.test(nextLine))
          descLines.push(nextLine);
        j++;
      }
      nextI = j;
    } else {
      const combined = titleLine + (i + 1 < lines.length ? ' ' + lines[i + 1] : '');
      const rangeStr = combined.match(YEAR_RANGE)?.[0] ?? combined.match(/\d{1,2}\/\d{4}\s*[-–—]\s*(?:\d{1,2}\/\d{4}|present|current)/i)?.[0] ?? '';
      const parsed = parseYearRange(rangeStr);
      startDate = parsed.startDate;
      endDate = parsed.endDate;
      current = parsed.current;
      jobTitle = trunc(titleLine.replace(/\s*[–\-].*$/, '').trim(), MAX.jobTitle);
      if (i + 1 < lines.length) {
        const companyLine = lines[i + 1];
        const looksLikeDateFragment = /^\d{1,2}\/\d{4}\)?\s*$/i.test(companyLine) || /^\)\s*$/.test(companyLine);
        const looksLikeNextRole = parseWorkExperienceFirstLine(companyLine) ?? parseWorkExperienceFirstLineRelaxed(companyLine) ?? looksLikeWorkExperienceHeader(companyLine);
        if (looksLikeNextRole) {
          company = '';
          nextI = i + 1;
        } else if (looksLikeDateFragment) {
          company = '';
          nextI = i + 2;
        } else {
          company = trunc(companyLine.replace(/\s*[-–—|].*$/, '').replace(/\)\s*$/, '').trim(), MAX.company);
          nextI = i + 2;
        }
      } else {
        company = '';
        nextI = i + 1;
      }
      if (!company && titleLine.includes(' – ')) {
        const parts = titleLine.split(/\s+[–\-]\s+/);
        if (parts.length >= 2) {
          jobTitle = trunc(parts[0].trim(), MAX.jobTitle);
          company = trunc(parts[1].replace(/\s*\(.*$/, '').trim(), MAX.company);
        }
      }
      let j = nextI;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (parseWorkExperienceFirstLine(nextLine) ?? parseWorkExperienceFirstLineRelaxed(nextLine) ?? looksLikeWorkExperienceHeader(nextLine)) break;
        if (nextLine.length > 10 && !/^\d{1,2}\/\d{4}\)?\s*$/i.test(nextLine) && !/^\d{4}\s*[-–—]/.test(nextLine))
          descLines.push(nextLine);
        j++;
      }
      nextI = j;
    }

    entries.push({
      jobTitle: jobTitle || 'Job Title',
      company: company || 'Company',
      startDate,
      endDate,
      currentPosition: current,
      description: descLines.length > 0 ? trunc(descLines.join('\n'), MAX.workDescription) : undefined,
    });
    if (entries.length >= 5) break;
    i = nextI;
  }
  return entries.length > 0 ? entries : undefined;
}

function extractCertifications(text: string): ExtractedProfile['certifications'] {
  const section =
    findSections(text).get('certifications') ?? findSections(text).get('licenses') ?? '';
  if (!section.trim()) return undefined;
  const entries: NonNullable<ExtractedProfile['certifications']> = [];
  const lines = section.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/certified|certificate|license|credential/i.test(line)) {
      const name = trunc(line.replace(/\s*[-–—|].*$/, '').trim(), MAX.certName);
      const issuer = trunc(lines[i + 1]?.replace(/\s*[-–—|].*$/, '').trim(), MAX.certIssuer) || 'Issuer';
      entries.push({ name, issuingOrganization: issuer });
      i += 2;
    }
    i++;
    if (entries.length >= 10) break;
  }
  return entries.length > 0 ? entries : undefined;
}

/** Ensure all items have required fields set (use '' so validation passes) and build hints for empty expected fields. */
function normalizeAndHint(
  extracted: ExtractedProfile
): { normalized: ExtractedProfile; incompleteItemHints: IncompleteItemHints } {
  const hints: IncompleteItemHints = {};
  const normalized = { ...extracted };

  if (normalized.workExperiences?.length) {
    normalized.workExperiences = normalized.workExperiences.map((we, i) => {
      const missing: string[] = [];
      if (!we.startDate?.trim()) missing.push('startDate');
      if (!we.endDate?.trim() && !we.currentPosition) missing.push('endDate');
      if (!we.employmentType?.trim()) missing.push('employmentType');
      if (!we.locationType?.trim()) missing.push('locationType');
      if (missing.length) (hints.workExperiences = hints.workExperiences || []).push({ index: i, title: we.jobTitle, missing });
      return {
        ...we,
        jobTitle: we.jobTitle || '',
        company: we.company || '',
        startDate: we.startDate?.trim() || '',
        endDate: we.endDate?.trim() ?? '',
        employmentType: we.employmentType?.trim() || '',
        locationType: we.locationType?.trim() || '',
      };
    });
  }

  if (normalized.education?.length) {
    normalized.education = normalized.education.map((ed, i) => {
      const missing: string[] = [];
      if (!ed.startDate?.trim()) missing.push('startDate');
      if (!ed.endDate?.trim() && !ed.currentEducation) missing.push('endDate');
      if (missing.length) (hints.education = hints.education || []).push({ index: i, title: ed.school, missing });
      return {
        ...ed,
        school: ed.school || '',
        degree: ed.degree || '',
        startDate: ed.startDate?.trim() || '',
        endDate: ed.endDate?.trim() ?? '',
        currentEducation: !!ed.currentEducation,
      };
    });
  }

  if (normalized.certifications?.length) {
    normalized.certifications = normalized.certifications.map((c, i) => {
      const missing: string[] = [];
      if (!c.issueDate?.trim()) missing.push('issueDate');
      if (missing.length) (hints.certifications = hints.certifications || []).push({ index: i, title: c.name, missing });
      return {
        ...c,
        name: c.name || '',
        issuingOrganization: c.issuingOrganization || '',
        issueDate: c.issueDate?.trim() || '',
      };
    });
  }

  return { normalized, incompleteItemHints: hints };
}

export function parseCvFromText(text: string): {
  extracted: ExtractedProfile;
  missingFields: MissingFieldKey[];
  incompleteItemHints: IncompleteItemHints;
} {
  const extracted: ExtractedProfile = {};
  const missingFields: MissingFieldKey[] = [];

  if (!text || text.trim().length < 50) {
    return {
      extracted: {},
      missingFields: [
        'bio',
        'linkedin',
        'github',
        'stackAndTools',
        'workExperiences',
        'education',
        'certifications',
      ],
      incompleteItemHints: {},
    };
  }

  const linkedin = extractLinkedIn(text);
  if (linkedin) extracted.linkedin = linkedin;
  else missingFields.push('linkedin');

  const github = extractGitHub(text);
  if (github) extracted.github = github;
  else missingFields.push('github');

  const bio = extractBio(text);
  if (bio) extracted.bio = bio;
  else missingFields.push('bio');

  const skills = extractSkills(text);
  if (skills.length > 0) extracted.stackAndTools = skills.slice(0, STACK_AND_TOOLS_MAX);
  else missingFields.push('stackAndTools');

  const education = extractEducation(text);
  if (education?.length) extracted.education = education;
  else missingFields.push('education');

  const workExperiences = extractWorkExperience(text);
  if (workExperiences?.length) extracted.workExperiences = workExperiences;
  else missingFields.push('workExperiences');

  const certifications = extractCertifications(text);
  if (certifications?.length) extracted.certifications = certifications;
  else missingFields.push('certifications');

  const { normalized, incompleteItemHints } = normalizeAndHint(extracted);
  return { extracted: normalized, missingFields, incompleteItemHints };
}
