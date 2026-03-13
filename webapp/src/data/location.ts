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
  let countryCode = '';
  let stateCode = '';
  let city = '';

  if (parts.length === 1) {
    const match = countries.find((c) => c.name === parts[0]);
    if (match) countryCode = match.isoCode;
    else city = parts[0];
  } else if (parts.length === 2) {
    const last = parts[1];
    const countryMatch = countries.find((c) => c.name === last);
    if (countryMatch) {
      countryCode = countryMatch.isoCode;
      city = parts[0];
    } else {
      city = parts[0];
      countryCode = last;
    }
  } else {
    const last = parts[parts.length - 1];
    const countryMatch = countries.find((c) => c.name === last);
    if (countryMatch) {
      countryCode = countryMatch.isoCode;
      const statePart = parts[parts.length - 2];
      const states = State.getStatesOfCountry(countryMatch.isoCode);
      const stateMatch = states.find((s) => s.name === statePart);
      if (stateMatch) {
        stateCode = stateMatch.isoCode;
        city = parts.slice(0, -2).join(', ');
      } else {
        city = parts.slice(0, -1).join(', ');
      }
    } else {
      city = parts[0];
      stateCode = parts[1] ?? '';
      countryCode = parts[2] ?? '';
    }
  }

  return { city, stateCode, countryCode };
}
