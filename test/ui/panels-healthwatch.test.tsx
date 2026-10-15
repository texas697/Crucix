import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import type { SweepData } from '../../dashboard/react/api/types';
import { HealthWatchPanel } from '../../dashboard/react/features/dashboard/panels/HealthWatch';
import minimal from '../fixtures/synthesized/minimal.json';
import partial from '../fixtures/synthesized/partial.json';
import hostile from '../fixtures/synthesized/hostile.json';

afterEach(cleanup);

// The synthesized fixtures are the authoritative payload shape; the component reads them loosely.
const asSweep = (value: unknown): SweepData => value as unknown as SweepData;

function renderPanel(data: unknown): HTMLElement {
  return render(<HealthWatchPanel data={asSweep(data)} />).container;
}

function panel(container: HTMLElement): HTMLElement {
  const el = container.querySelector('#pOsint');
  if (!el) throw new Error('missing panel #pOsint');
  return el as HTMLElement;
}

describe('HealthWatchPanel', () => {
  it('renders the legacy Health watch panel with id pOsint', () => {
    const p = panel(renderPanel(minimal));
    expect(p).toBeInTheDocument();
    expect(p.querySelector('.card-head h3')?.textContent).toBe('Health watch');
    expect(p.querySelector('.card-body')?.className).toContain('pad-sm');
    expect(p.querySelector('.hw-list')).not.toBeNull();
  });

  it('renders WHO outbreak rows, the risk tag and the source links', () => {
    const p = panel(renderPanel(minimal));

    // Outbreak title, places, update count and summary tooltip.
    const title = within(p).getByText('Cholera');
    expect(title).toBeInTheDocument();
    expect(within(p).getByText(/Haiti, Dominican Republic/)).toBeInTheDocument();
    expect(within(p).getByText(/3 notices/)).toBeInTheDocument();

    // The row links out to the WHO DON via safeExternalUrl.
    const link = title.closest('a');
    expect(link).toHaveAttribute('href', 'https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON599');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
    expect(link).toHaveAttribute('title', 'Cholera surge across the island');

    // WHO risk tag: the fixture carries a bare "High" string; the tag is coloured from HEALTH_RISK_COL.
    const risk = within(p).getByText('High');
    expect(risk).toHaveClass('hw-risk');
    expect(risk).toHaveAttribute('title', 'WHO assessment');
    expect(risk.getAttribute('style')).toMatch(/rgba\(245, ?154, ?94/);

    // Section headings.
    expect(within(p).getByText('WHO outbreaks')).toBeInTheDocument();
    expect(within(p).getByText('CDC travel notices')).toBeInTheDocument();
    expect(within(p).getByText('CDC investigations')).toBeInTheDocument();

    // CDC travel row, level label and link.
    const travelTitle = within(p).getByText('Cholera in Haiti');
    expect(within(p).getByText('L2')).toHaveClass('hw-lvl', 'l2');
    expect(travelTitle.closest('a')).toHaveAttribute(
      'href',
      'https://wwwnc.cdc.gov/travel/notices/level2/cholera-haiti',
    );

    // Optional CDC outbreak row.
    expect(within(p).getByText('Listeria outbreak linked to deli meat')).toBeInTheDocument();
    expect(within(p).getByText(/US multistate/)).toBeInTheDocument();

    // Badge mirrors the legacy head: outbreak count (+ freshness).
    expect(within(p).getByText(/1 outbreak/)).toBeInTheDocument();
  });

  it('drops CDC travel notices below level 2', () => {
    const base = minimal.healthWatch as Record<string, unknown>;
    const data = {
      ...minimal,
      healthWatch: {
        ...base,
        travel: [
          { level: 1, name: 'Level one notice', countries: ['Nowhere'], n: 1, date: '2026-10-05' },
          ...(base.travel as unknown[]),
        ],
      },
    };
    const p = panel(renderPanel(data));
    expect(within(p).queryByText('Level one notice')).toBeNull();
    expect(within(p).getByText('Cholera in Haiti')).toBeInTheDocument();
  });

  it('shows the empty state when there are no WHO or CDC notices', () => {
    const p = panel(renderPanel(partial));
    expect(within(p).getByText(/No WHO or CDC health notices in the last 90 days\./)).toBeInTheDocument();
    expect(within(p).queryByText('Cholera')).toBeNull();
    expect(within(p).queryByText('WHO outbreaks')).toBeNull();
    // Legacy badge still reports the (zero) outbreak count.
    expect(within(p).getByText(/0 outbreaks/)).toBeInTheDocument();
  });

  it('shows the error banner when the health source failed', () => {
    const base = minimal.healthWatch as Record<string, unknown>;
    const p = panel(renderPanel({ ...minimal, healthWatch: { ...base, error: 'WHO feed down' } }));
    const banner = within(p).getByText(/WHO feed down/);
    expect(banner).toHaveClass('nuke-ok', 'anom');
  });

  it('never uses dangerouslySetInnerHTML', () => {
    const source = readFileSync(
      'dashboard/react/features/dashboard/panels/HealthWatch.tsx',
      'utf8',
    );
    expect(source).not.toContain('dangerouslySetInnerHTML');
  });

  it('renders hostile fixture strings as text, never as elements', () => {
    const container = renderPanel(hostile);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('#pOsint')).not.toBeNull();
    expect(container.textContent).toContain('</script>');
    expect(container.textContent).toContain('{{APP_NAME}}');
    // The hostile `last` is shown via the legacy 10-char fallback (relTime rejects the bad date).
    expect(container.textContent).toContain('"><img src');
  });
});
