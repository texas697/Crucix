import { DigestApp, type DigestAppProps } from '../features/digest/DigestApp';

// Lazy chunk boundary for the Readers Digest surface (see DashboardSurface for the rationale).
export default function DigestSurface(props: DigestAppProps) {
  return <DigestApp {...props} />;
}
