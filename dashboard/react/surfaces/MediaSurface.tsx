import { MediaApp, type MediaAppProps } from '../features/media/MediaApp';

// Lazy chunk boundary for the Live media surface (see DashboardSurface for the rationale).
export default function MediaSurface(props: MediaAppProps) {
  return <MediaApp {...props} />;
}
