import { Country, State, City } from 'country-state-city';
import type { SearchableSelectOption } from '@/components/retroui/SearchableSelect';

let countryOptions: SearchableSelectOption[] | null = null;

export function getCountryOptions(): SearchableSelectOption[] {
  if (countryOptions) return countryOptions;
  const list = Country.getAllCountries();
  countryOptions = list.map((c) => ({ value: c.isoCode, label: c.name }));
  return countryOptions;
}

export function getStateOptions(countryCode: string): SearchableSelectOption[] {
  if (!countryCode) return [];
  const list = State.getStatesOfCountry(countryCode);
  return list.map((s) => ({ value: s.isoCode, label: s.name }));
}

export function getCityOptions(countryCode: string, stateCode: string): SearchableSelectOption[] {
  if (!countryCode) return [];
  const list = stateCode
    ? City.getCitiesOfState(countryCode, stateCode)
    : (City.getCitiesOfCountry(countryCode) ?? []);
  return list.map((c) => ({ value: c.name, label: c.name }));
}

/** Build location string for backend from city, stateCode, countryCode. */
export function buildLocationString(
  city: string,
  stateCode: string,
  countryCode: string
): string {
  const country = Country.getCountryByCode(countryCode);
  const countryName = country?.name ?? countryCode;
  let stateName = stateCode;
  if (countryCode && stateCode) {
    const state = State.getStateByCodeAndCountry(stateCode, countryCode);
    if (state) stateName = state.name;
  }
  const parts = [city, stateName, countryName].filter(Boolean);
  return parts.join(', ');
}

function parseLocationOnePart(
  part: string,
  countries: ReturnType<typeof Country.getAllCountries>
): { city: string; stateCode: string; countryCode: string } {
  const match = countries.find((c) => c.name === part);
  if (match) return { city: '', stateCode: '', countryCode: match.isoCode };
  return { city: part, stateCode: '', countryCode: '' };
}

function parseLocationTwoParts(
  parts: [string, string],
  countries: ReturnType<typeof Country.getAllCountries>
): { city: string; stateCode: string; countryCode: string } {
  const [first, last] = parts;
  const countryMatch = countries.find((c) => c.name === last);
  if (countryMatch) {
    return { city: first, stateCode: '', countryCode: countryMatch.isoCode };
  }
  return { city: first, stateCode: '', countryCode: last };
}

function parseLocationThreeOrMore(
  parts: string[],
  countries: ReturnType<typeof Country.getAllCountries>
): { city: string; stateCode: string; countryCode: string } {
  const last = parts.at(-1) ?? '';
  const countryMatch = countries.find((c) => c.name === last);
  if (countryMatch) {
    const statePart = parts.at(-2) ?? '';
    const states = State.getStatesOfCountry(countryMatch.isoCode);
    const stateMatch = states.find((s) => s.name === statePart);
    if (stateMatch) {
      return {
        city: parts.slice(0, -2).join(', '),
        stateCode: stateMatch.isoCode,
        countryCode: countryMatch.isoCode,
      };
    }
    return {
      city: parts.slice(0, -1).join(', '),
      stateCode: '',
      countryCode: countryMatch.isoCode,
    };
  }
  return {
    city: parts[0] ?? '',
    stateCode: parts[1] ?? '',
    countryCode: parts[2] ?? '',
  };
}

/**
 * Parse existing location string into city, stateCode, countryCode.
 * Assumes format "City, State, Country" or "City, Country" or "Country".
 * Returns best-effort match; state/country are matched by name to get codes.
 */
export function parseLocationString(location: string): {
  city: string;
  stateCode: string;
  countryCode: string;
} {
  const trimmed = location?.trim() ?? '';
  if (!trimmed) return { city: '', stateCode: '', countryCode: '' };

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { city: '', stateCode: '', countryCode: '' };

  const countries = Country.getAllCountries();

  if (parts.length === 1) {
    const only = parts[0];
    if (only === undefined) return { city: '', stateCode: '', countryCode: '' };
    return parseLocationOnePart(only, countries);
  }
  if (parts.length === 2) {
    const a = parts[0];
    const b = parts[1];
    if (a === undefined || b === undefined) return { city: '', stateCode: '', countryCode: '' };
    return parseLocationTwoParts([a, b], countries);
  }
  return parseLocationThreeOrMore(parts, countries);
}
