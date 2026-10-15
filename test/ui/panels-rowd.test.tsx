import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import type { SweepData } from '../../dashboard/react/api/types';
import { RowD, type RowDProps } from '../../dashboard/react/features/dashboard/components/RowD';
import minimal from '../fixtures/synthesized/minimal.json';
import partial from '../fixtures/synthesized/partial.json';
import hostile from '../fixtures/synthesized/hostile.json';
import { readTreeSources } from './helpers/readTreeSources';

afterEach(cleanup);

// The synthesized fixtures are the authoritative payload shape; the component reads them loosely.
const asSweep = (value: unknown): SweepData => value as unknown as SweepData;

type RowDInput = Partial<Omit<RowDProps, 'data'>>;

function renderRowD(data: unknown, props: RowDInput = {}): HTMLElement {
  return render(<RowD data={asSweep(data)} {...props} />).container;
}

/** Scope a query to one of the four legacy panel ids. */
function panel(container: HTMLElement, id: string): HTMLElement {
  const el = container.querySelector(`#${id}`);
  if (!el) throw new Error(`missing panel #${id}`);
  return el as HTMLElement;
}

describe('RowD', () => {
  it('renders the four legacy panels with their ids', () => {
    const container = renderRowD(minimal);
    expect(container.querySelector('#pAlerts')).not.toBeNull();
    expect(container.querySelector('#pThreat')).not.toBeNull();
    expect(container.querySelector('#pTracks')).not.toBeNull();
    expect(container.querySelector('#pPoly')).not.toBeNull();
  });

  // --- Regional threat (fully derived from the fixture) ------------------------------------------

  it('derives regional threat scores from the fixture GDELT byRegion counts', () => {
    const threat = panel(renderRowD(minimal), 'pThreat');
    expect(within(threat).getByText('Regional threat')).toBeInTheDocument();
    expect(within(threat).getByText('All theaters')).toBeInTheDocument();
    // Fixture byRegion: Europe 100 -> conflict 21 (Elevated), Middle East 80 -> conflict 19 (Guarded).
    expect(within(threat).getByText('Europe')).toBeInTheDocument();
    expect(within(threat).getByText('Middle East')).toBeInTheDocument();
    expect(within(threat).getByText('21')).toBeInTheDocument();
    expect(within(threat).getByText('19')).toBeInTheDocument();
    expect(within(threat).getByText('Elevated')).toBeInTheDocument();
    expect(within(threat).getAllByText('Guarded')).toHaveLength(4);
    // The footer surfaces the GDELT window in hours.
    expect(within(threat).getByText(/last 6h/)).toBeInTheDocument();
  });

  it('renders the threat card for the degraded partial fixture too', () => {
    const threat = panel(renderRowD(partial), 'pThreat');
    expect(within(threat).getByText('Regional threat')).toBeInTheDocument();
    expect(within(threat).getByText('Europe')).toBeInTheDocument();
  });

  // --- Empty states with no props ----------------------------------------------------------------

  it('shows the loading/connecting empty states while the live feeds are absent', () => {
    const container = renderRowD(minimal);
    expect(within(panel(container, 'pAlerts')).getByText('Loading\u2026')).toBeInTheDocument();
    expect(within(panel(container, 'pTracks')).getByText('Connecting to Neptun\u2026')).toBeInTheDocument();
    expect(within(panel(container, 'pPoly')).getByText('Loading\u2026')).toBeInTheDocument();
  });

  it('shows the settled empty states for empty feed arrays', () => {
    const container = renderRowD(minimal, { alerts: [], tracks: [], markets: [] });
    expect(within(panel(container, 'pAlerts')).getByText('No active alerts in the last hour.')).toBeInTheDocument();
    expect(within(panel(container, 'pTracks')).getByText('No active tracks.')).toBeInTheDocument();
    expect(within(panel(container, 'pPoly')).getByText('No conflict markets right now.')).toBeInTheDocument();
  });

  // --- Live feeds with props ---------------------------------------------------------------------

  it('renders alert rows within the last hour with their city list', () => {
    const now = new Date().toISOString();
    const alert = panel(renderRowD(minimal, { alerts: [{ time: now, cities: ['Kyiv', 'Lviv', 'Odesa', 'Kharkiv'] }] }), 'pAlerts');
    expect(within(alert).getByText('Kyiv, Lviv, Odesa +1')).toBeInTheDocument();
    expect(alert.querySelectorAll('.alert-row')).toHaveLength(1);
  });

  it('renders track rows with type, locality/region and meta', () => {
    const track = panel(renderRowD(minimal, {
      tracks: [{ type: 'shahed', locality: 'Odesa', region: 'Odeska', confidence: 2, sourceCount: 3, updatedAt: new Date().toISOString() }],
    }), 'pTracks');
    expect(within(track).getByText('SHAHED')).toBeInTheDocument();
    expect(within(track).getByText('Odesa, Odeska')).toBeInTheDocument();
    expect(within(track).getByText(/2 \u00b7 3 src/)).toBeInTheDocument();
  });

  it('renders prediction-market rows with yes %, k-volume and an outbound Polymarket link', () => {
    const market = panel(renderRowD(minimal, {
      markets: [{ title: 'Will a ceasefire hold through Q4?', yes: 0.62, vol: 125000, slug: 'ceasefire-q4' }],
    }), 'pPoly');
    expect(within(market).getByText('Will a ceasefire hold through Q4?')).toBeInTheDocument();
    expect(within(market).getByText('62%')).toBeInTheDocument();
    expect(within(market).getByText(/\$125k 24h/)).toBeInTheDocument();
    const link = market.querySelector('a.poly-item');
    expect(link?.getAttribute('href')).toBe('https://polymarket.com/event/ceasefire-q4');
  });

  // --- Safety ------------------------------------------------------------------------------------

  it('never uses dangerouslySetInnerHTML', () => {
    const source = readTreeSources('dashboard/react/features/dashboard/components');
    expect(source).not.toContain('dangerouslySetInnerHTML');
  });

  it('renders hostile fixture and prop strings as text, never as elements', () => {
    const container = renderRowD(hostile, {
      alerts: [{ time: new Date().toISOString(), cities: ['</script>', '"><img src=x onerror=alert(1)>'] }],
      tracks: [{ type: 'uav', locality: '<script>alert(1)</script>', region: '{{APP_NAME}}', confidence: 1, sourceCount: 1, updatedAt: new Date().toISOString() }],
      markets: [{ title: '<script>alert(1)</script>', yes: 0.5, vol: 1000, slug: 'x' }],
    });
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('</script>');
    expect(container.textContent).toContain('{{APP_NAME}}');
  });
});
