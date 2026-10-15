import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import type { SweepData } from '../../dashboard/react/api/types';
import {
  DisastersPanel,
  OutagesPanel,
  RowB,
  SignalCore,
  SweepDelta,
  type QuakeItem,
} from '../../dashboard/react/features/dashboard/panels/RowB';
import minimal from '../fixtures/synthesized/minimal.json';
import partial from '../fixtures/synthesized/partial.json';
import hostile from '../fixtures/synthesized/hostile.json';

afterEach(cleanup);

// The synthesized fixtures are the authoritative payload shape; the component reads them loosely.
const asSweep = (value: unknown): SweepData => value as unknown as SweepData;

function renderRowB(data: unknown, quakes?: QuakeItem[]): HTMLElement {
  return render(<RowB data={asSweep(data)} quakes={quakes} />).container;
}

describe('RowB', () => {
  it('renders the four legacy panels with their ids', () => {
    const container = renderRowB(minimal);
    expect(container.querySelector('#pCore')).not.toBeNull();
    expect(container.querySelector('#pDelta')).not.toBeNull();
    expect(container.querySelector('#pQuakes')).not.toBeNull();
    expect(container.querySelector('#pOutages')).not.toBeNull();
  });

  it('derives the signal-core counts from the payload', () => {
    const container = renderRowB(minimal);
    const core = container.querySelector('#pCore') as HTMLElement;
    expect(core.querySelectorAll('.sm')).toHaveLength(6);
    expect(within(core).getByText('Signal core')).toBeInTheDocument();
    expect(within(core).getByText('Thermal spikes')).toBeInTheDocument();
    // thermal hc 340, sdr total 640, chokepoints 2, outbreaks 1.
    expect(within(core).getByText('340')).toBeInTheDocument();
    expect(within(core).getByText('640')).toBeInTheDocument();
    expect(within(core).getByText('Hot metrics')).toBeInTheDocument();
  });

  it('shows the delta empty state and Baseline badge when there is no delta', () => {
    const container = renderRowB(partial);
    const delta = container.querySelector('#pDelta') as HTMLElement;
    expect(within(delta).getByText('No changes since last sweep')).toBeInTheDocument();
    expect(within(delta).getByText('Baseline')).toBeInTheDocument();
  });

  it('renders delta stats and direction badge when changes exist', () => {
    const withDelta = asSweep({
      ...(minimal as unknown as Record<string, unknown>),
      delta: {
        summary: { totalChanges: 3, criticalChanges: 1, direction: 'risk-off', signalBreakdown: { new: 2 } },
        signals: { new: [{ label: 'New signal' }], escalated: [{ label: 'Esc', from: 1, to: 2, pctChange: 50 }] },
      },
    });
    const container = render(<RowB data={withDelta} />).container;
    const delta = container.querySelector('#pDelta') as HTMLElement;
    expect(within(delta).getByText('Changes')).toBeInTheDocument();
    expect(within(delta).getByText('RISK-OFF')).toBeInTheDocument();
    expect(within(delta).getByText('New signal')).toBeInTheDocument();
    expect(within(delta).queryByText('No changes since last sweep')).toBeNull();
  });

  it('shows the outages empty state when there are no disruptions', () => {
    const container = renderRowB(partial);
    const outages = container.querySelector('#pOutages') as HTMLElement;
    expect(within(outages).getByText(/No internet disruptions detected/)).toBeInTheDocument();
    expect(within(outages).getByText(/No national-scale outages/)).toBeInTheDocument();
    // No national-scale outage banner rows beyond the placeholder.
    expect(outages.querySelectorAll('.site-row')).toHaveLength(0);
  });

  it('renders GDACS disaster rows from the payload', () => {
    const container = renderRowB(minimal);
    const quakes = container.querySelector('#pQuakes') as HTMLElement;
    expect(quakes.querySelectorAll('.quake-row').length).toBeGreaterThanOrEqual(1);
    expect(within(quakes).getByText(/0 red · 1 orange/)).toBeInTheDocument();
    // No quakes prop yet -> loading state for the USGS half.
    expect(within(quakes).getByText(/Loading quakes/)).toBeInTheDocument();
  });

  it('renders USGS rows with magnitude colour when quakes are provided', () => {
    const quakes: QuakeItem[] = [
      { mag: 6.1, place: 'Somewhere', depth: 10.4, tsunami: 1, url: 'https://example.com/q' },
    ];
    const container = renderRowB(minimal, quakes);
    const panel = container.querySelector('#pQuakes') as HTMLElement;
    expect(within(panel).getByText('6.1')).toBeInTheDocument();
    expect(within(panel).getByText('Somewhere')).toBeInTheDocument();
    expect(within(panel).getByText(/10 km/)).toBeInTheDocument();
    expect(within(panel).getByText(/tsunami/)).toBeInTheDocument();
    expect(within(panel).getByText(/1 GDACS · 1 quakes/)).toBeInTheDocument();
  });

  it('shows the USGS empty message when the quake list is empty', () => {
    const container = renderRowB(partial, []);
    const panel = container.querySelector('#pQuakes') as HTMLElement;
    expect(within(panel).getByText('No M2.5+ quakes in the last 24h.')).toBeInTheDocument();
  });

  it('renders the outages country row and radar annotations', () => {
    const container = renderRowB(minimal);
    const outages = container.querySelector('#pOutages') as HTMLElement;
    const countryRow = outages.querySelector('.site-row') as HTMLElement;
    expect(countryRow.textContent).toContain('India');
    const radarHead = outages.querySelector('.hw-sec') as HTMLElement;
    expect(radarHead.textContent).toContain('Cloudflare Radar');
    expect(outages.querySelectorAll('.site-row').length).toBeGreaterThanOrEqual(1);
    expect(outages.querySelectorAll('.hw-row').length).toBeGreaterThanOrEqual(1);
    const radarRow = outages.querySelector('.hw-row') as HTMLElement;
    expect(radarRow.textContent).toContain('India');
    expect(radarRow.textContent).toContain('power outage');
  });

  it('never uses dangerouslySetInnerHTML', () => {
    const source = readFileSync('dashboard/react/features/dashboard/panels/RowB.tsx', 'utf8');
    expect(source).not.toContain('dangerouslySetInnerHTML');
  });

  it('renders hostile fixture text as text, never as elements', () => {
    const container = renderRowB(hostile);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('{{APP_NAME}}');
    expect(container.textContent).toContain('</script>');
  });
});

// Row-b interleaves these cards with pNuclear/pRisk, so each must also render stand-alone.
describe('RowB named panel exports', () => {
  it('SignalCore renders only #pCore with the legacy markup', () => {
    const container = render(<SignalCore data={asSweep(minimal)} />).container;
    expect(container.querySelector('#pCore')).not.toBeNull();
    expect(container.querySelector('#pDelta')).toBeNull();
    expect(container.querySelectorAll('.sm')).toHaveLength(6);
    expect(within(container).getByText('Hot metrics')).toBeInTheDocument();
  });

  it('SweepDelta renders only #pDelta with the Baseline badge', () => {
    const container = render(<SweepDelta data={asSweep(partial)} />).container;
    const delta = container.querySelector('#pDelta') as HTMLElement;
    expect(delta).not.toBeNull();
    expect(container.querySelector('#pCore')).toBeNull();
    expect(within(delta).getByText('No changes since last sweep')).toBeInTheDocument();
  });

  it('DisastersPanel renders only #pQuakes and accepts the quakes prop', () => {
    const quakes: QuakeItem[] = [{ mag: 5.5, place: 'Somewhere' }];
    const container = render(<DisastersPanel data={asSweep(minimal)} quakes={quakes} />).container;
    const panel = container.querySelector('#pQuakes') as HTMLElement;
    expect(panel).not.toBeNull();
    expect(container.querySelector('#pOutages')).toBeNull();
    expect(within(panel).getByText('Somewhere')).toBeInTheDocument();
  });

  it('OutagesPanel renders only #pOutages', () => {
    const container = render(<OutagesPanel data={asSweep(partial)} />).container;
    const panel = container.querySelector('#pOutages') as HTMLElement;
    expect(panel).not.toBeNull();
    expect(container.querySelector('#pQuakes')).toBeNull();
    expect(within(panel).getByText(/No internet disruptions detected/)).toBeInTheDocument();
  });

  it('RowB composes the four cards in legacy order', () => {
    const container = renderRowB(minimal);
    const ids = Array.from(container.querySelectorAll('.col-card')).map((el) => el.id);
    expect(ids).toEqual(['pCore', 'pDelta', 'pQuakes', 'pOutages']);
  });
});
