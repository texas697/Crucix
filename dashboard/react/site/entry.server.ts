// SSR entry for the public-site pages. Bundled by vite.site.config.ts into
// dashboard/dist/site/server.js, which server.mjs imports at runtime when UI_SITE=react. The page
// components are .tsx, so plain node cannot load dashboard/server/site.mjs directly — this entry is
// the plan's "separately built server entry".
export { buildSitePages, buildSiteVars } from '../../server/site.mjs';
