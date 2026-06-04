import { env } from '../../config/env.js';

export type FederationStatus = {
  saml: {
    enabled: boolean;
    entityId: string | null;
    idpSsoUrl: string | null;
    acsUrl: string | null;
    metadataPath: string;
    loginPath: string;
  };
  scim: {
    enabled: boolean;
    baseUrl: string | null;
    usersPath: string;
    tokenConfigured: boolean;
  };
  configured: boolean;
};

/** Federation status for admin UI (Phase 6). */
export function getFederationStatus(apiOrigin?: string): FederationStatus {
  const samlEnabled = env.FEATURE_SAML_SSO;
  const scimEnabled = env.FEATURE_SCIM_PROVISIONING;
  const origin = apiOrigin ?? '';
  return {
    saml: {
      enabled: samlEnabled,
      entityId: env.SAML_ENTITY_ID ?? null,
      idpSsoUrl: env.SAML_IDP_SSO_URL ?? null,
      acsUrl: env.SAML_ACS_URL ?? (origin ? `${origin}/api/v1/admin/saml/acs` : null),
      metadataPath: '/api/v1/admin/saml/metadata',
      loginPath: '/api/v1/admin/saml/login',
    },
    scim: {
      enabled: scimEnabled,
      baseUrl: env.SCIM_BASE_URL ?? (origin ? `${origin}/api/v1/admin/scim/v2` : null),
      usersPath: '/api/v1/admin/scim/v2/Users',
      tokenConfigured: Boolean(env.SCIM_BEARER_TOKEN),
    },
    configured: samlEnabled || scimEnabled,
  };
}
