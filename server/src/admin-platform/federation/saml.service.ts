import { env } from '../../config/env.js';

export function samlMetadataXml(apiOrigin: string): string {
  const entityId = env.SAML_ENTITY_ID ?? `${apiOrigin}/api/v1/admin/saml/metadata`;
  const acs = env.SAML_ACS_URL ?? `${apiOrigin}/api/v1/admin/saml/acs`;
  return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acs}" index="1" isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
}

export function samlLoginRedirectUrl(): string | null {
  if (!env.FEATURE_SAML_SSO || !env.SAML_IDP_SSO_URL) return null;
  return env.SAML_IDP_SSO_URL;
}

/** Dev/test: extract email-like NameID from base64 SAMLResponse payload. */
export function extractEmailFromSamlResponseBase64(raw: string): string | null {
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const emailMatch =
      decoded.match(/<saml:NameID[^>]*>([^<]+@[^<]+)<\/saml:NameID>/i) ??
      decoded.match(/<NameID[^>]*>([^<]+@[^<]+)<\/NameID>/i);
    return emailMatch?.[1]?.trim().toLowerCase() ?? null;
  } catch {
    return null;
  }
}
