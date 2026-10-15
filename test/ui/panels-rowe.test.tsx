import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../../dashboard/react/theme';
import type { SweepData } from '../../dashboard/react/api/types';
import { CLASSES } from '../../dashboard/react/features/dashboard/classes';
import { MarketsPanel } from '../../dashboard/react/features/dashboard/components/MarketsPanel';
import { RowE } from '../../dashboard/react/features/dashboard/components/RowE';
import { createTranslator } from '../../dashboard/react/shared/locale';
import minimal from '../fixtures/synthesized/minimal.json';
import partial from '../fixtures/synthesized/partial.json';
import hostile from '../fixtures/synthesized/hostile.json';
import { readTreeSources } from './helpers/readTreeSources';

afterEach(cleanup);

const theme = createAppTheme('dark');

function renderThemed(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// The synthesized fixtures are the authoritative payload shape; the component reads them loosely.
const asSweep = (value: unknown): SweepData => value as unknown as SweepData;

function renderMarkets(data: unknown, t?: Parameters<typeof MarketsPanel>[0]['t']): HTMLElement {
  return renderThemed(<MarketsPanel data={asSweep(data)} t={t} />).container;
}

/** Scope a query to the legacy pMarkets panel id. */
function panel(container: HTMLElement, id: string): HTMLElement {
  const el = container.querySelector(`#${id}`);
  if (!el) throw new Error(`missing panel #${id}`);
  return el as HTMLElement;
}

describe('RowE / MarketsPanel', () => {
  it('renders the pMarkets panel, both directly and via the RowE wrapper', () => {
    expect(renderMarkets(minimal).querySelector('#pMarkets')).not.toBeNull();
    cleanup();
    expect(renderThemed(<RowE data={asSweep(minimal)} />).container.querySelector('#pMarkets')).not.toBeNull();
  });

  it('badges Live with a live timestamp and Delayed without one', () => {
    const live = panel(renderMarkets(minimal), 'pMarkets');
    expect(within(live).getByText('Live')).toBeInTheDocument();
    cleanup();
    const delayed = panel(renderMarkets(partial), 'pMarkets');
    expect(within(delayed).getByText('Delayed')).toBeInTheDocument();
  });

  it('uses the injected translator for the panel title', () => {
    const t = createTranslator({ panels: { macroMarkets: 'Macro et marches' } });
    const m = panel(renderMarkets(minimal, t), 'pMarkets');
    expect(within(m).getByText('Macro et marches')).toBeInTheDocument();
  });

  // --- Live index + crypto quotes (minimal) ------------------------------------------------------

  it('renders the INDEXES and CRYPTO quote cards from the minimal fixture', () => {
    const m = panel(renderMarkets(minimal), 'pMarkets');
    expect(within(m).getByText('INDEXES')).toBeInTheDocument();
    expect(within(m).getByText('CRYPTO')).toBeInTheDocument();
    expect(within(m).getByText('S&P 500')).toBeInTheDocument();
    expect(within(m).getByText('5,800')).toBeInTheDocument();
    expect(within(m).getByText('\u25b2 +0.35%')).toBeInTheDocument();
    expect(within(m).getByText('Bitcoin')).toBeInTheDocument();
    expect(within(m).getByText('$64,000')).toBeInTheDocument();
  });

  // --- Energy + metals + macro metrics (minimal) -------------------------------------------------

  it('renders the energy/metals/macro metrics with the legacy number formatting', () => {
    const m = panel(renderMarkets(minimal), 'pMarkets');
    expect(within(m).getByText('ENERGY + METALS + MACRO')).toBeInTheDocument();
    expect(within(m).getByText('WTI Crude')).toBeInTheDocument();
    expect(within(m).getByText('$78.5')).toBeInTheDocument();
    expect(within(m).getByText('Brent')).toBeInTheDocument();
    expect(within(m).getByText('$82.3')).toBeInTheDocument();
    expect(within(m).getByText('Gold')).toBeInTheDocument();
    expect(within(m).getByText('$2,650')).toBeInTheDocument();
    expect(within(m).getByText('+0.45% today')).toBeInTheDocument();
    expect(within(m).getByText('Silver')).toBeInTheDocument();
    expect(within(m).getByText('$31.2')).toBeInTheDocument();
    expect(within(m).getByText('+0.97% today')).toBeInTheDocument();
    expect(within(m).getByText('22.5')).toBeInTheDocument();
    expect(within(m).getByText('+7.14%')).toBeInTheDocument();
    expect(within(m).getByText('0.65')).toBeInTheDocument();
    expect(within(m).getByText('above historical average')).toBeInTheDocument();
    expect(within(m).getByText('+0.10%')).toBeInTheDocument();
    expect(within(m).getByText('4.4%')).toBeInTheDocument();
    expect(within(m).getByText('+0.1 vs prior')).toBeInTheDocument();
  });

  // --- WTI sparkline -----------------------------------------------------------------------------

  it('renders the WTI sparkline SVG when energy.wtiRecent has values', () => {
    const m = panel(renderMarkets(minimal), 'pMarkets');
    const spark = m.querySelector(`.${CLASSES.spark}`);
    expect(spark).not.toBeNull();
    expect(spark!.querySelector(`svg.${CLASSES.sparkSvg}`)).not.toBeNull();
    expect(spark!.querySelector(`polyline.${CLASSES.sparkLine}`)).not.toBeNull();
    expect(within(m).getByText('WTI 5-DAY')).toBeInTheDocument();
  });

  it('omits the WTI sparkline when wtiRecent is empty', () => {
    const m = panel(renderMarkets(partial), 'pMarkets');
    expect(m.querySelector(`.${CLASSES.spark} svg`)).toBeNull();
  });

  // --- Missing-value fallbacks (partial) ---------------------------------------------------------

  it('shows -- fallbacks and never NaN/undefined on the partial fixture', () => {
    const m = panel(renderMarkets(partial), 'pMarkets');
    expect(within(m).queryByText('INDEXES')).toBeNull();
    expect(within(m).queryByText('CRYPTO')).toBeNull();
    expect(within(m).getByText('ENERGY + METALS + MACRO')).toBeInTheDocument();
    expect(within(m).getAllByText('--').length).toBeGreaterThanOrEqual(8);
    expect(m.textContent).not.toContain('NaN');
    expect(m.textContent).not.toContain('undefined');
  });

  // --- Safety ------------------------------------------------------------------------------------

  it('never uses dangerouslySetInnerHTML', () => {
    const source = readTreeSources('dashboard/react/features/dashboard/components');
    expect(source).not.toContain('dangerouslySetInnerHTML');
  });

  it('renders hostile fixture text as text, never as elements', () => {
    const container = renderMarkets(hostile);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('</script>');
  });
});
