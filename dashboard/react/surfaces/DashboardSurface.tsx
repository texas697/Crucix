import { DashboardApp, type DashboardAppProps } from '../features/dashboard/DashboardApp';

// Lazy chunk boundary for the dashboard surface. The SPA entry (entries/app.tsx) imports this module
// dynamically so the dashboard (and its MapLibre payload) stays in its own chunk; the feature module
// itself stays unaware of routing.
export default function DashboardSurface(props: DashboardAppProps) {
  return <DashboardApp {...props} />;
}
