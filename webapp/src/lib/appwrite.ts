import { Account, Client, Databases } from 'appwrite';

const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.trim() ?? 'https://nyc.cloud.appwrite.io/v1';
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID?.trim() ?? 'syntaxstoriesv2';

export const client = new Client().setEndpoint(endpoint).setProject(projectId);

export const account = new Account(client);
export const databases = new Databases(client);

/** True when both Appwrite env vars are set (optional checks / UI). */
export function isAppwriteConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.trim() &&
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID?.trim()
  );
}
