import type { PropsWithChildren, ReactNode } from 'react';

export type SiteKind = 'marketing' | 'support' | 'privacy' | 'terms';

export interface SiteVars {
  appName: string;
  appNameUrl: string;
  operator: string;
  contactEmail: string;
  jurisdiction: string;
  postalAddressLine: ReactNode;
  storeLinks: ReactNode;
  year: string;
  title: string;
  docTitle: string;
  description: string;
  meta: ReactNode;
}

export interface PageProps {
  vars: SiteVars;
}

export type LayoutProps = PropsWithChildren<PageProps>;
