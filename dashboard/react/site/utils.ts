import type { SiteVars } from './types';

export function mailtoHref({ contactEmail }: SiteVars): string {
  return `mailto:${contactEmail}`;
}

export function supportHref({ contactEmail, appNameUrl }: SiteVars): string {
  return `mailto:${contactEmail}?subject=${appNameUrl}%20support`;
}

export function feedbackHref({ contactEmail, appNameUrl }: SiteVars): string {
  return `mailto:${contactEmail}?subject=${appNameUrl}%20feedback`;
}

export function deleteAccountHref({ contactEmail, appNameUrl }: SiteVars): string {
  return `mailto:${contactEmail}?subject=Delete%20my%20${appNameUrl}%20account`;
}
