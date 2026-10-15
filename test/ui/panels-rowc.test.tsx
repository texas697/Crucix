import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import type { SweepData } from '../../dashboard/react/api/types';
import { RowC } from '../../dashboard/react/features/dashboard/panels/RowC';
import minimal from '../fixtures/synthesized/minimal.json';
import partial from '../fixtures/synthesized/partial.json';
import stale from '../fixtures/synthesized/stale.json';
import hostile from '../fixtures/synthesized/hostile.json';

afterEach(cleanup);

// The synthesized fixtures are the authoritative payload shape; the component reads them loosely.
const asSweep = (value: unknown): SweepData => value as unknown as SweepData;

type RowCProps = Parameters<typeof RowC>[0];

function renderRowC(data: unknown, props: Partial<Omit<RowCProps, 'data'>> = {}): HTMLElement {
  return render(<RowC data={asSweep(data)} {...props} />).container;
}

/** Scope a query to one of the three legacy panel ids. */
function panel(container: HTMLElement, id: string): HTMLElement {
  const el = container.querySelector(`#${id}`);
  if (!el) throw new Error(`missing panel #${id}`);
  return el as HTMLElement;
}

describe('RowC', () => {
  it('renders the three legacy panels with their ids', () => {
    const container = renderRowC(minimal);
    expect(container.querySelector('#pIdeas')).not.toBeNull();
    expect(container.querySelector('#pMaritime')).not.toBeNull();
    expect(container.querySelector('#pSpace')).not.toBeNull();
  });

  // --- Leverageable ideas ------------------------------------------------------------------------

  it('renders idea cards with their type, ticker, horizon, confidence, title and risk', () => {
    const withIdeas = {
      ...minimal,
      ideasSource: 'llm',
      ideas: [
        { type: 'long', ticker: 'GC=F', horizon: 'Weeks', confidence: 'HIGH', title: 'Gold breakout', text: 'Central banks keep buying.', risk: 'USD strength' },
      ],
    };
    const ideas = panel(renderRowC(withIdeas), 'pIdeas');
    expect(within(ideas).getByText('LONG')).toBeInTheDocument();
    expect(within(ideas).getByText('GC=F')).toBeInTheDocument();
    expect(within(ideas).getByText('Weeks')).toBeInTheDocument();
    expect(within(ideas).getByText('HIGH confidence')).toBeInTheDocument();
    expect(within(ideas).getByText('Gold breakout')).toBeInTheDocument();
    expect(within(ideas).getByText('Central banks keep buying.')).toBeInTheDocument();
    expect(within(ideas).getByText(/Risk · USD strength/)).toBeInTheDocument();
  });

  it('labels the ideas source badge for the llm/mine/rules/disabled cases', () => {
    const llm = panel(renderRowC({ ...minimal, ideasSource: 'llm' }), 'pIdeas');
    expect(within(llm).getByText('AI ENHANCED')).toBeInTheDocument();
    cleanup();

    const rules = panel(renderRowC({ ...minimal, ideasSource: 'rules' }), 'pIdeas');
    expect(within(rules).getByText('SIGNAL BASED')).toBeInTheDocument();
    cleanup();

    const mine = panel(renderRowC({ ...minimal, ideasSource: 'mine', ideasMeta: { provider: 'grok' } }), 'pIdeas');
    expect(within(mine).getByText('MY GROK')).toBeInTheDocument();
    cleanup();

    const disabled = panel(renderRowC(minimal), 'pIdeas');
    expect(within(disabled).getByText('PENDING')).toBeInTheDocument();
  });

  it('shows "LLM not configured" when there is no profile', () => {
    const ideas = panel(renderRowC(minimal), 'pIdeas');
    expect(within(ideas).getByText('LLM not configured')).toBeInTheDocument();
  });

  it('shows the BYOK unlock card when the profile has no LLM key', () => {
    const ideas = panel(renderRowC(minimal, { me: {} }), 'pIdeas');
    expect(within(ideas).getByText(/Unlock AI trade ideas/)).toBeInTheDocument();
    expect(within(ideas).getByText('Enter my API key')).toBeInTheDocument();
    expect(within(ideas).getByText(/Add AI key/)).toBeInTheDocument();
  });

  it('offers "No AI ideas yet" and wires "Generate ideas now" to onGenerateIdeas', () => {
    const onGenerateIdeas = vi.fn();
    const ideas = panel(renderRowC(minimal, { me: { llm: { provider: 'anthropic' } }, onGenerateIdeas }), 'pIdeas');
    expect(within(ideas).getByText('No AI ideas yet')).toBeInTheDocument();
    expect(within(ideas).getByText(/Your anthropic key is saved/)).toBeInTheDocument();
    fireEvent.click(within(ideas).getByText('Generate ideas now'));
    expect(onGenerateIdeas).toHaveBeenCalledTimes(1);
  });

  it('always renders the disclosure', () => {
    const ideas = panel(renderRowC(minimal), 'pIdeas');
    expect(within(ideas).getByText(/Not financial advice/)).toBeInTheDocument();
  });

  // --- Maritime watch ----------------------------------------------------------------------------

  it('renders the major chokepoint rows with percentage and sparkline', () => {
    const maritime = panel(renderRowC(minimal), 'pMaritime');
    expect(within(maritime).getByText('Hormuz')).toBeInTheDocument();
    expect(within(maritime).getByText('Malacca')).toBeInTheDocument();
    expect(within(maritime).getByText('+5%')).toBeInTheDocument();
    expect(within(maritime).getAllByText('/d').length).toBeGreaterThanOrEqual(1);
    expect(within(maritime).getByText(/42 ships live/)).toBeInTheDocument();
    expect(maritime.querySelectorAll('svg').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the empty/degraded chokepoint state when there are no rows', () => {
    const maritime = panel(renderRowC(partial), 'pMaritime');
    expect(within(maritime).getByText('No chokepoint data')).toBeInTheDocument();
  });

  it('still renders chokepoints for the stale fixture', () => {
    const maritime = panel(renderRowC(stale), 'pMaritime');
    expect(within(maritime).getByText('Hormuz')).toBeInTheDocument();
    expect(within(maritime).getByText('Malacca')).toBeInTheDocument();
  });

  // --- Space watch -------------------------------------------------------------------------------

  it('renders the orbital counters, ISS position and space weather', () => {
    const space = panel(renderRowC(minimal), 'pSpace');
    expect(within(space).getByText('New objects (30d)')).toBeInTheDocument();
    expect(within(space).getByText('42')).toBeInTheDocument();
    expect(within(space).getByText('Starlink')).toBeInTheDocument();
    expect(within(space).getByText('6000')).toBeInTheDocument();
    expect(within(space).getByText(/415 km/)).toBeInTheDocument();
    expect(within(space).getByText(/Kp 4.5/)).toBeInTheDocument();
    expect(within(space).getByText('G1')).toBeInTheDocument();
  });

  it('keeps the base orbital rows but hides space weather when SWPC errored', () => {
    const space = panel(renderRowC(partial), 'pSpace');
    expect(within(space).getByText('New objects (30d)')).toBeInTheDocument();
    expect(within(space).queryByText('Space weather')).toBeNull();
  });

  it('shows "No space data." when the space source is absent', () => {
    const space = panel(renderRowC({ ...partial, space: undefined }), 'pSpace');
    expect(within(space).getByText('No space data.')).toBeInTheDocument();
  });

  // --- Safety ------------------------------------------------------------------------------------

  it('never uses dangerouslySetInnerHTML', () => {
    const source = readFileSync('dashboard/react/features/dashboard/panels/RowC.tsx', 'utf8');
    expect(source).not.toContain('dangerouslySetInnerHTML');
  });

  it('renders hostile fixture text as text, never as elements', () => {
    const container = renderRowC(hostile);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('</script>');
    expect(container.textContent).toContain('{{APP_NAME}}');
  });
});
