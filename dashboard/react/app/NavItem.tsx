import type { ReactNode } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import type { Surface } from './surfaces';
import { isReactSurface, readUiFlags } from './uiFlags';

export interface NavItemProps {
  /** Surface the link targets; its flag decides whether the change can stay client-side. */
  surface: Surface;
  href: string;
  className?: string;
  ariaCurrent?: 'page';
  children: ReactNode;
}

// Cross-surface navigation element shared by every shell nav (dashboard TopBar, digest header, …).
//
// It renders a react-router <Link> only when BOTH hold: the target surface is React-owned (so the SPA
// has a route for it) AND we are actually inside the SPA router. Otherwise it renders a plain
// <a href>, so the browser performs a normal document load — which is exactly what a legacy surface
// needs, and what unit tests / the standalone snapshot get when there is no router around.
//
// Both branches emit the same attributes, so markup, classes and visual design are unchanged.
export function NavItem({ surface, href, className, ariaCurrent, children }: NavItemProps) {
  const inRouter = useInRouterContext();
  if (inRouter && isReactSurface(readUiFlags(), surface)) {
    return <Link to={href} className={className} aria-current={ariaCurrent}>{children}</Link>;
  }
  return <a href={href} className={className} aria-current={ariaCurrent}>{children}</a>;
}
