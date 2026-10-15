import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../../dashboard/react/theme';
import type { SweepData } from '../../dashboard/react/api/types';
import { CLASSES } from '../../dashboard/react/features/dashboard/classes';
import { LeftRail } from '../../dashboard/react/features/dashboard/components/LeftRail';
import { NuclearWatch } from '../../dashboard/react/features/dashboard/components/NuclearWatch';
import { RiskGauges } from '../../dashboard/react/features/dashboard/components/RiskGauges';
import { SensorGrid } from '../../dashboard/react/features/dashboard/components/SensorGrid';
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

function rail(data: unknown): HTMLElement {
  return renderThemed(<LeftRail data={asSweep(data)} />).container;
}

describe('LeftRail', () => {
  it('renders the three legacy panels with their ids', () => {
    const container = rail(minimal);
    expect(container.querySelector('#pSensor')).not.toBeNull();
    expect(container.querySelector('#pNuclear')).not.toBeNull();
    expect(container.querySelector('#pRisk')).not.toBeNull();
  });

  it('renders the eleven sensor-grid layers, including the air count', () => {
    const container = rail(minimal);
    const sensor = container.querySelector('#pSensor') as HTMLElement;
    expect(sensor.querySelectorAll(`.${CLASSES.layerItem}`)).toHaveLength(11);
    expect(within(sensor).getByText('Air Activity')).toBeInTheDocument();
    // Legacy passes the raw air total (no locale separator); only thermal/conflict use toLocaleString.
    expect(within(sensor).getByText('1240')).toBeInTheDocument();
    expect(within(sensor).getByText('11 feeds')).toBeInTheDocument();
    expect(within(sensor).getByText('Satellites')).toBeInTheDocument();
  });

  it('keeps all eleven layers for the degraded payload too', () => {
    const container = rail(partial);
    const sensor = container.querySelector('#pSensor') as HTMLElement;
    expect(sensor.querySelectorAll(`.${CLASSES.layerItem}`)).toHaveLength(11);
    expect(within(sensor).getByText('GDELT · no events')).toBeInTheDocument();
  });

  it('renders the nuclear status banner and the live site readout', () => {
    const container = rail(minimal);
    const nuclear = container.querySelector('#pNuclear') as HTMLElement;
    expect(within(nuclear).getByText(/All sites normal/)).toBeInTheDocument();
    expect(within(nuclear).getByText('5 sensors')).toBeInTheDocument();
    expect(within(nuclear).getByText('25 CPM')).toBeInTheDocument();
  });

  it('shows the degraded nuclear status when there are no live sensors', () => {
    const container = rail(partial);
    const nuclear = container.querySelector('#pNuclear') as HTMLElement;
    expect(within(nuclear).getByText('No live sensors')).toBeInTheDocument();
  });

  it('renders risk gauges from FRED with the newest indicator date', () => {
    const container = rail(minimal);
    const risk = container.querySelector('#pRisk') as HTMLElement;
    expect(within(risk).getByText('VIX')).toBeInTheDocument();
    expect(within(risk).getByText('22.5')).toBeInTheDocument();
    expect(within(risk).getByText('3.60%')).toBeInTheDocument();
    expect(within(risk).getByText('FRED · 10/13')).toBeInTheDocument();
  });

  it('falls back to -- for every missing FRED indicator (partial fixture)', () => {
    const container = rail(partial);
    const risk = container.querySelector('#pRisk') as HTMLElement;
    expect(within(risk).getByText('VIX')).toBeInTheDocument();
    expect(within(risk).getByText('Stress')).toBeInTheDocument();
    // VIX, HY spread, USD index, jobless claims and M2 all lack an indicator.
    expect(within(risk).getAllByText('--').length).toBeGreaterThanOrEqual(4);
    expect(within(risk).getByText('--%')).toBeInTheDocument();
  });

  it('never uses dangerouslySetInnerHTML', () => {
    const source = readTreeSources('dashboard/react/features/dashboard/components');
    expect(source).not.toContain('dangerouslySetInnerHTML');
  });

  it('renders hostile fixture text as text, never as elements', () => {
    const container = rail(hostile);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('</script>');
    expect(container.textContent).toContain('{{APP_NAME}}');
  });
});

// The legacy layout spreads the rail across two rows, so each card must render on its own.
describe('LeftRail cards', () => {
  it('exports SensorGrid, NuclearWatch and RiskGauges standalone', () => {
    const container = renderThemed(
      <>
        <SensorGrid data={asSweep(minimal)} />
        <NuclearWatch data={asSweep(minimal)} />
        <RiskGauges data={asSweep(minimal)} />
      </>,
    ).container;
    expect(container.querySelector('#pSensor')).not.toBeNull();
    expect(container.querySelector('#pNuclear')).not.toBeNull();
    expect(container.querySelector('#pRisk')).not.toBeNull();
  });

  it('renders only its own card when mounted alone', () => {
    const sensor = renderThemed(<SensorGrid data={asSweep(minimal)} />).container;
    expect(sensor.querySelector('#pSensor')).not.toBeNull();
    expect(sensor.querySelector('#pNuclear')).toBeNull();
    expect(sensor.querySelector('#pRisk')).toBeNull();

    const nuclear = renderThemed(<NuclearWatch data={asSweep(minimal)} />).container;
    expect(nuclear.querySelector('#pNuclear')).not.toBeNull();
    expect(nuclear.querySelector('#pSensor')).toBeNull();

    const risk = renderThemed(<RiskGauges data={asSweep(partial)} />).container;
    expect(risk.querySelector('#pRisk')).not.toBeNull();
    expect(risk.querySelector('#pSensor')).toBeNull();
  });
});
