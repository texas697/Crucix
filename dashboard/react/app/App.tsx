import { SURFACE_TITLES, type Surface } from './surfaces';

// P1 placeholder. Proves the toolchain, manifest wiring, per-surface entry split and the UI_*
// flag-based selection end to end. Real surfaces replace this in P3–P7.
export function App({ surface }: { surface: Surface }) {
  return (
    <main className="surface-placeholder" data-surface={surface}>
      <h1>{SURFACE_TITLES[surface]}</h1>
      <p>React surface placeholder.</p>
    </main>
  );
}
