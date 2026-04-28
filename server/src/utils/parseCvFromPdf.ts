/**
 * Parse CV/Resume text extracted from PDF and return structured profile data
 * plus a list of missing field keys for the frontend to prompt the user.
 */

import { STACK_AND_TOOLS_MAX } from '../constants/profileLimits.js';

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
    .replaceAll(/[^a-z0-9\s]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function flushSectionContent(sections: Map<string, string>, header: string, content: string[]): void {
  if (content.length === 0) return;
  const existing = sections.get(header) ?? '';
  sections.set(header, (existing + '\n' + content.join('\n')).trim());
}

const SECTION_HEADER_SHORT = /^(education|experience|skills|summary|projects?|certifications?|about|contact)$/;

function looksLikeSectionHeader(trimmed: string, normalized: string): boolean {
  if (normalized.length >= 50 || trimmed.length >= 80) return false;
  if (SECTION_HEADERS.some((h) => normalized.startsWith(h) || normalized === h)) return true;
  return SECTION_HEADER_SHORT.test(normalized);
}

function canonicalSectionKey(token: string, normalizedLine: string): string {
  let key = token;
  if (key === 'work') key = 'experience';
  if (key === 'certificate' || key === 'licenses') key = 'certifications';
  if (key === 'academic') key = 'education';
  if (key === 'employment' || key === 'professional') key = 'experience';
  if (key === 'technical' || key === 'technologies') key = 'skills';
  if ((key === 'core' || key === 'programming') && normalizedLine.includes('language')) key = 'skills';
  if (key === 'languages') key = 'skills';
  return key;
}

function findSections(text: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  let currentHeader = 'preamble';
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const normalized = normalizeSectionTitle(trimmed);
    if (looksLikeSectionHeader(trimmed, normalized)) {
      flushSectionContent(sections, currentHeader, currentContent);
      const token = normalized.split(/\s+/)[0] ?? 'other';
      currentHeader = canonicalSectionKey(token, normalized);
      currentContent = [];
    } else {
      currentContent.push(trimmed);
    }
  }
  flushSectionContent(sections, currentHeader, currentContent);
  return sections;
}

const RE_MONTH_NAME_YEAR_A = /(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may)\s*\d{4}/i;
const RE_MONTH_NAME_YEAR_B = /(?:jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?)\s*\d{4}/i;
const RE_MONTH_NAME_YEAR_C = /(?:oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d{4}/i;
const RE_YEAR_TO_PRESENT = /\d{4}\s*[-–—]\s*(?:present|current|now)/i;
const RE_SLASHY_YEAR_RANGE = /(?:\d{1,2}\/)?\d{4}\s*[-–—]\s*(?:\d{1,2}\/)?\d{4}/;
const YEAR_RANGE = /\b(19|20)\d{2}\s*[-–—]\s*((?:19|20)\d{2}|present|current|now)\b/i;

function firstDateFragmentInBlock(block: string): string {
  return (
    RE_MONTH_NAME_YEAR_A.exec(block)?.[0] ??
    RE_MONTH_NAME_YEAR_B.exec(block)?.[0] ??
    RE_MONTH_NAME_YEAR_C.exec(block)?.[0] ??
    RE_YEAR_TO_PRESENT.exec(block)?.[0] ??
    RE_SLASHY_YEAR_RANGE.exec(block)?.[0] ??
    ''
  );
}

function parseYearRange(str: string): { startDate?: string; endDate?: string; current?: boolean } {
  const re = /(19|20)\d{2}/g;
  const years: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) years.push(m[0]);
  if (years.length === 0) return {};
  const start = years[0];
  const end = /present|current|now/i.test(str) ? undefined : years[1];
  return {
    startDate: `${start}-01`,
    endDate: end ? `${end}-12` : undefined,
    current: /present|current|now/i.test(str),
  };
}

/** Parse "MM/YYYY" or "M/YYYY" to "YYYY-MM". */
function monthYearToIso(str: string): string {
  const t = str.trim().replaceAll(/\s/g, '');
  const myRe = /^(\d{1,2})\/(\d{4})$/;
  const match = myRe.exec(t);
  if (!match) return '';
  const month = Math.max(1, Math.min(12, Number.parseInt(match[1], 10)));
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
  const parenRe =
    /\s*\((\d{1,2}\/\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|present|current|now)\s*\)\s*$/i;
  const parenMatch = parenRe.exec(line);
  if (!parenMatch) return null;
  const dateStart = parenMatch[1];
  const dateEnd = parenMatch[2];
  const current = /present|current|now/i.test(dateEnd);
  const startDate = monthYearToIso(dateStart);
  const endDate = current ? undefined : monthYearToIso(dateEnd);
  const beforeParen = line.slice(0, line.indexOf('(')).trim();
  const dashRe = /\s*[–-]\s*(.+)$/;
  const dashMatch = dashRe.exec(beforeParen);
  if (!dashMatch) return null;
  const jobTitle = beforeParen.slice(0, beforeParen.length - dashMatch[0].length).trim();
  const company = dashMatch[1].trim();
  if (!jobTitle || !company) return null;
  return { jobTitle, company, startDate: startDate || undefined, endDate, current };
}

/** True if the line looks like a role header: "Title – Company (MM/YYYY" (may lack closing paren). */
function looksLikeWorkExperienceHeader(line: string): boolean {
  return /^.+\s+[–-]\s+.+\s*\(\s*\d{1,2}\/\d{4}/.test(line.trim());
}

/**
 * Relaxed parse for "Title – Company (06/2024" or "Title – Company (06/2024 – 08/2024)" with optional closing paren.
 */
function parseWorkExperienceFirstLineRelaxed(
  titleLine: string
): { jobTitle: string; company: string; startDate?: string; endDate?: string; current?: boolean } | null {
  const line = titleLine.trim();
  const relaxedClosed =
    /\s*\((\d{1,2}\/\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|present|current|now)\s*\)\s*$/i;
  const relaxedOpen =
    /\s*\((\d{1,2}\/\d{4})\s*[-–—]?\s*(\d{1,2}\/\d{4}|present|current|now)?\s*$/i;
  const relaxed = relaxedClosed.exec(line) ?? relaxedOpen.exec(line);
  if (!relaxed) return null;
  const beforeParen = line.slice(0, line.indexOf('(')).trim();
  const dashRe2 = /\s*[–-]\s*(.+)$/;
  const dashMatch = dashRe2.exec(beforeParen);
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
  const liRe = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i;
  const m = liRe.exec(text);
  if (m) return m[0].startsWith('http') ? m[0].trim() : `https://${m[0].trim()}`;
  return undefined;
}

function extractGitHub(text: string): string | undefined {
  const ghRe = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+\/?/i;
  const m = ghRe.exec(text);
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
  const separators = /[,;|•·-]\s*|\n+/g;
  const tokens = block
    .split(separators)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 50 && !/^\d+$/.test(s));
  const KNOWN_LANG = /javascript|typescript|react|node|python|java|c\+\+|go|rust|sql/i;
  const KNOWN_PLATFORM =
    /aws|docker|kubernetes|html|css|git|redux|angular|vue|mongodb|postgres|graphql|rest|api|linux|agile|scrum/i;
  const TITLE_CASE_TOKEN = /^[A-Z][a-z]+(?:\s*[/&]\s*[A-Za-z]+)*$/;
  for (const t of tokens) {
    const s = trunc(t, MAX.skillItem);
    if (s && (KNOWN_LANG.test(s) || KNOWN_PLATFORM.test(s) || TITLE_CASE_TOKEN.test(s))) skills.push(s);
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
const PAREN_YEAR_CLOSED = /\s*\((\d{4})\s*[-–—]\s*(\d{4}|present|current|now)\s*\)?\s*$/i;
const YEAR_PAIR_INSIDE_PAREN = /(\d{4})\s*[-–—]\s*(\d{4}|present|current|now)?/i;

function parseEducationSchoolLine(
  line: string
): { schoolName: string; startDate?: string; endDate?: string; current?: boolean } {
  const trimmed = line.trim();
  const parenMatch = PAREN_YEAR_CLOSED.exec(trimmed);
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
    const yearMatch = YEAR_PAIR_INSIDE_PAREN.exec(inside);
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

const DEG_UNDERGRAD = /(?:b\.?s\.?|b\.?a\.?)[\s\w,.-]*/gi;
const DEG_GRAD = /(?:m\.?s\.?|m\.?a\.?|ph\.?d\.?)[\s\w,.-]*/gi;
const DEG_ENG = /(?:b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?)[\s\w,.-]*/gi;
const DEG_WORD = /(?:bachelor|master|associate|diploma)[\s\w,.-]*/gi;

function firstDegreeInBlock(block: string): string | undefined {
  DEG_UNDERGRAD.lastIndex = 0;
  const u = DEG_UNDERGRAD.exec(block);
  if (u) return u[0];
  DEG_GRAD.lastIndex = 0;
  const g = DEG_GRAD.exec(block);
  if (g) return g[0];
  DEG_ENG.lastIndex = 0;
  const eng = DEG_ENG.exec(block);
  if (eng) return eng[0];
  DEG_WORD.lastIndex = 0;
  return DEG_WORD.exec(block)?.[0];
}

function extractEducation(text: string): ExtractedProfile['education'] {
  const section = findSections(text).get('education') ?? '';
  if (!section.trim()) return undefined;
  const entries: NonNullable<ExtractedProfile['education']> = [];
  const blocks = section.split(/\n\s*\n/).filter((b) => b.trim().length > 20);
  for (const block of blocks) {
    const degreeRaw = firstDegreeInBlock(block);
    const degree = degreeRaw?.trim() ?? 'Degree';
    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const firstLine = lines.at(0) ?? 'School';
    let schoolLine = firstLine;
    const dm0 = degreeRaw?.trim();
    if (dm0?.length && firstLine.toLowerCase().startsWith(dm0.toLowerCase())) {
      schoolLine = lines.at(1) ?? firstLine;
    }
    const parsed = parseEducationSchoolLine(schoolLine);
    const dateRange = YEAR_RANGE.exec(block)?.[0] ?? firstDateFragmentInBlock(block);
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

function isNextLineNewWorkRole(nextLine: string): boolean {
  return (
    !!(parseWorkExperienceFirstLine(nextLine) ?? parseWorkExperienceFirstLineRelaxed(nextLine)) ||
    looksLikeWorkExperienceHeader(nextLine)
  );
}

function isLikelyWorkDescriptionLine(nextLine: string): boolean {
  return (
    nextLine.length > 10 &&
    !/^\d{1,2}\/\d{4}\)?\s*$/i.test(nextLine) &&
    !/^\d{4}\s*[-–—]/.test(nextLine)
  );
}

function gatherWorkDescriptionLines(lines: string[], startJ: number): { desc: string[]; endJ: number } {
  const desc: string[] = [];
  let j = startJ;
  while (j < lines.length) {
    const nextLine = lines[j];
    if (isNextLineNewWorkRole(nextLine)) break;
    if (isLikelyWorkDescriptionLine(nextLine)) desc.push(nextLine);
    j++;
  }
  return { desc, endJ: j };
}

const MM_SLASH_RANGE = /\d{1,2}\/\d{4}\s*[-–—]\s*(?:\d{1,2}\/\d{4}|present|current)/i;

function parseHeuristicWorkRow(
  lines: string[],
  i: number,
  titleLine: string
): {
  jobTitle: string;
  company: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  nextI: number;
  descLines: string[];
} {
  const combined = titleLine + (i + 1 < lines.length ? ' ' + lines[i + 1] : '');
  const rangeStr = YEAR_RANGE.exec(combined)?.[0] ?? MM_SLASH_RANGE.exec(combined)?.[0] ?? '';
  const parsed = parseYearRange(rangeStr);
  let jobTitle = trunc(titleLine.replace(/\s*[–-].*$/, '').trim(), MAX.jobTitle);
  let company = '';
  let nextI: number;

  if (i + 1 < lines.length) {
    const companyLine = lines[i + 1];
    const looksLikeDateFragment = /^\d{1,2}\/\d{4}\)?\s*$/i.test(companyLine) || /^\)\s*$/.test(companyLine);
    if (isNextLineNewWorkRole(companyLine)) {
      nextI = i + 1;
    } else if (looksLikeDateFragment) {
      nextI = i + 2;
    } else {
      company = trunc(companyLine.replace(/\s*[-–—|].*$/, '').replace(/\)\s*$/, '').trim(), MAX.company);
      nextI = i + 2;
    }
  } else {
    nextI = i + 1;
  }

  if (!company && titleLine.includes(' – ')) {
    const parts = titleLine.split(/\s+[–-]\s+/);
    if (parts.length >= 2) {
      jobTitle = trunc(parts[0].trim(), MAX.jobTitle);
      company = trunc(parts[1].replace(/\s*\(.*$/, '').trim(), MAX.company);
    }
  }

  const { desc, endJ } = gatherWorkDescriptionLines(lines, nextI);
  return {
    jobTitle,
    company,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    current: parsed.current,
    nextI: endJ,
    descLines: desc,
  };
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
    let descLines: string[];
    let nextI: number;

    if (parsedFirst) {
      jobTitle = trunc(parsedFirst.jobTitle, MAX.jobTitle);
      company = trunc(parsedFirst.company.replace(/\s*[-–—|].*$/, '').trim(), MAX.company);
      startDate = parsedFirst.startDate;
      endDate = parsedFirst.endDate;
      current = parsedFirst.current;
      const gathered = gatherWorkDescriptionLines(lines, i + 1);
      descLines = gathered.desc;
      nextI = gathered.endJ;
    } else {
      const h = parseHeuristicWorkRow(lines, i, titleLine);
      jobTitle = h.jobTitle;
      company = h.company;
      startDate = h.startDate;
      endDate = h.endDate;
      current = h.current;
      descLines = h.descLines;
      nextI = h.nextI;
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
  const secMap = findSections(text);
  const section = secMap.get('certifications') ?? secMap.get('licenses') ?? '';
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
      if (missing.length) {
        const list = hints.workExperiences ?? [];
        list.push({ index: i, title: we.jobTitle, missing });
        hints.workExperiences = list;
      }
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
      if (missing.length) {
        const list = hints.education ?? [];
        list.push({ index: i, title: ed.school, missing });
        hints.education = list;
      }
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
      if (missing.length) {
        const list = hints.certifications ?? [];
        list.push({ index: i, title: c.name, missing });
        hints.certifications = list;
      }
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
